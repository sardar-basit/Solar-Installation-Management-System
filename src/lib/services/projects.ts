import { ProjectStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { notifyUser, notifyUsers } from "@/lib/notify";
import { canTransition } from "@/lib/rbac";

export type ListProjectsFilters = {
  status?: ProjectStatus;
  customerId?: string;
  managerId?: string;
  search?: string;
  archived?: boolean;
};

async function generateProjectCode(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PRJ-${year}-`;
  const latest = await prisma.project.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: "desc" },
    select: { code: true },
  });
  let next = 1;
  if (latest?.code) {
    const part = latest.code.slice(prefix.length);
    const n = parseInt(part, 10);
    if (!Number.isNaN(n)) next = n + 1;
  }
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export async function listProjects(filters: ListProjectsFilters = {}) {
  const { status, customerId, managerId, search, archived } = filters;
  const q = search?.trim();
  return prisma.project.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(customerId ? { customerId } : {}),
      ...(managerId ? { managerId } : {}),
      ...(archived === undefined ? { archived: false } : { archived }),
      ...(q
        ? {
            OR: [
              { code: { contains: q, mode: "insensitive" } },
              { title: { contains: q, mode: "insensitive" } },
              { customer: { fullName: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      customer: { select: { id: true, fullName: true, email: true, phone: true } },
      manager: { select: { id: true, name: true, email: true } },
      assignments: {
        include: { user: { select: { id: true, name: true, role: true } } },
      },
      survey: { select: { id: true } },
      design: { select: { id: true, capacityKw: true } },
      quotation: { select: { id: true, status: true, totalAmount: true } },
      installation: { select: { id: true, progressPercent: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProject(id: string) {
  return prisma.project.findUnique({
    where: { id },
    include: {
      customer: {
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
      },
      manager: { select: { id: true, name: true, email: true, phone: true, role: true } },
      assignments: {
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { assignedAt: "desc" },
      },
      survey: {
        include: {
          surveyor: { select: { id: true, name: true } },
          attachments: true,
        },
      },
      design: {
        include: { designer: { select: { id: true, name: true } } },
      },
      quotation: {
        include: {
          lineItems: true,
          createdBy: { select: { id: true, name: true } },
        },
      },
      installation: {
        include: {
          technician: { select: { id: true, name: true } },
          verifiedBy: { select: { id: true, name: true } },
          photos: { orderBy: { createdAt: "desc" } },
        },
      },
      payments: {
        orderBy: { paidAt: "desc" },
        include: { recordedBy: { select: { id: true, name: true } } },
      },
      inventoryIssues: {
        include: { item: true },
        orderBy: { issuedAt: "desc" },
      },
      maintenanceRequests: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
}

export async function createProject(
  data: {
    title: string;
    description?: string | null;
    customerId: string;
    managerId?: string | null;
  },
  userId: string
) {
  const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
  if (!customer) throw new Error("Customer not found");

  if (data.managerId) {
    const manager = await prisma.user.findUnique({ where: { id: data.managerId } });
    if (!manager) throw new Error("Manager not found");
  }

  const code = await generateProjectCode();
  const project = await prisma.project.create({
    data: {
      code,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      customerId: data.customerId,
      managerId: data.managerId || null,
      status: ProjectStatus.PENDING,
    },
  });

  await audit("CREATE", "Project", project.id, userId, `Created project ${project.code}`);

  const notifyIds: string[] = [];
  if (project.managerId) notifyIds.push(project.managerId);
  if (customer.userId) notifyIds.push(customer.userId);
  await notifyUsers(
    notifyIds,
    "New project created",
    `Project ${project.code}: ${project.title}`,
    `/projects/${project.id}`
  );

  return project;
}

export async function updateProjectStatus(
  id: string,
  status: ProjectStatus,
  userId: string
) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      customer: { select: { userId: true, fullName: true } },
      assignments: { select: { userId: true } },
    },
  });
  if (!project) throw new Error("Project not found");

  if (!canTransition(project.status, status)) {
    throw new Error(`Cannot transition from ${project.status} to ${status}`);
  }

  const updated = await prisma.project.update({
    where: { id },
    data: {
      status,
      ...(status === ProjectStatus.COMPLETED ? { completedAt: new Date() } : {}),
    },
  });

  await audit(
    "STATUS_CHANGE",
    "Project",
    id,
    userId,
    `${project.status} → ${status}`
  );

  const recipients = new Set<string>();
  if (project.managerId) recipients.add(project.managerId);
  if (project.customer.userId) recipients.add(project.customer.userId);
  for (const a of project.assignments) recipients.add(a.userId);
  recipients.delete(userId);

  await notifyUsers(
    [...recipients],
    "Project status updated",
    `${project.code} is now ${status}`,
    `/projects/${id}`
  );

  return updated;
}

export async function assignTechnician(
  projectId: string,
  technicianUserId: string,
  assignedBy: string
) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { customer: { select: { userId: true } } },
  });
  if (!project) throw new Error("Project not found");

  const tech = await prisma.user.findUnique({ where: { id: technicianUserId } });
  if (!tech) throw new Error("Technician not found");

  const assignment = await prisma.projectAssignment.upsert({
    where: {
      projectId_userId: { projectId, userId: technicianUserId },
    },
    update: { roleNote: "Technician" },
    create: {
      projectId,
      userId: technicianUserId,
      roleNote: "Technician",
    },
  });

  // Ensure installation record exists and link technician
  await prisma.installation.upsert({
    where: { projectId },
    update: { technicianId: technicianUserId },
    create: {
      projectId,
      technicianId: technicianUserId,
    },
  });

  await audit(
    "ASSIGN",
    "Project",
    projectId,
    assignedBy,
    `Assigned technician ${tech.name} (${tech.id})`
  );

  await notifyUser(
    technicianUserId,
    "Assigned to project",
    `You have been assigned to ${project.code}: ${project.title}`,
    `/projects/${projectId}`
  );

  if (project.managerId && project.managerId !== assignedBy) {
    await notifyUser(
      project.managerId,
      "Technician assigned",
      `${tech.name} assigned to ${project.code}`,
      `/projects/${projectId}`
    );
  }

  return assignment;
}
