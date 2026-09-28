import { MaintenanceStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";

export const maintenanceCreateSchema = z.object({
  projectId: z.string().min(1),
  customerId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  priority: z.string().default("NORMAL"),
});

export type MaintenanceCreateInput = z.infer<typeof maintenanceCreateSchema>;

export async function listRequests(filters: {
  projectId?: string;
  customerId?: string;
  assigneeId?: string;
  status?: MaintenanceStatus;
} = {}) {
  return prisma.maintenanceRequest.findMany({
    where: {
      ...(filters.projectId ? { projectId: filters.projectId } : {}),
      ...(filters.customerId ? { customerId: filters.customerId } : {}),
      ...(filters.assigneeId ? { assigneeId: filters.assigneeId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    },
    include: {
      project: { select: { id: true, code: true, title: true } },
      customer: { select: { id: true, fullName: true, email: true, phone: true } },
      assignee: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getRequest(id: string) {
  return prisma.maintenanceRequest.findUnique({
    where: { id },
    include: {
      project: {
        include: {
          customer: true,
          installation: true,
        },
      },
      customer: {
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
      },
      assignee: { select: { id: true, name: true, email: true, phone: true } },
      createdBy: { select: { id: true, name: true } },
      history: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function createRequest(
  data: MaintenanceCreateInput,
  createdById: string
) {
  const parsed = maintenanceCreateSchema.parse(data);

  const project = await prisma.project.findUnique({
    where: { id: parsed.projectId },
  });
  if (!project) throw new Error("Project not found");

  const customer = await prisma.customer.findUnique({
    where: { id: parsed.customerId },
    include: { user: { select: { id: true } } },
  });
  if (!customer) throw new Error("Customer not found");

  const request = await prisma.maintenanceRequest.create({
    data: {
      projectId: parsed.projectId,
      customerId: parsed.customerId,
      createdById,
      title: parsed.title.trim(),
      description: parsed.description.trim(),
      priority: parsed.priority ?? "NORMAL",
      status: MaintenanceStatus.OPEN,
      history: {
        create: {
          status: MaintenanceStatus.OPEN,
          note: "Request created",
        },
      },
    },
  });

  await audit("CREATE", "MaintenanceRequest", request.id, createdById, request.title);

  if (project.managerId) {
    await notifyUser(
      project.managerId,
      "New maintenance request",
      `${request.title} for ${project.code}`,
      `/maintenance/${request.id}`
    );
  }
  if (customer.userId) {
    await notifyUser(
      customer.userId,
      "Maintenance request submitted",
      `Your request "${request.title}" has been logged`,
      `/maintenance/${request.id}`
    );
  }

  return request;
}

export async function assignRequest(
  id: string,
  assigneeId: string,
  actorUserId: string
) {
  const request = await prisma.maintenanceRequest.findUnique({
    where: { id },
    include: {
      customer: { select: { userId: true } },
      project: { select: { code: true } },
    },
  });
  if (!request) throw new Error("Maintenance request not found");

  const assignee = await prisma.user.findUnique({ where: { id: assigneeId } });
  if (!assignee) throw new Error("Assignee not found");

  const updated = await prisma.maintenanceRequest.update({
    where: { id },
    data: {
      assigneeId,
      status: MaintenanceStatus.ASSIGNED,
      history: {
        create: {
          status: MaintenanceStatus.ASSIGNED,
          note: `Assigned to ${assignee.name}`,
        },
      },
    },
  });

  await audit(
    "ASSIGN",
    "MaintenanceRequest",
    id,
    actorUserId,
    `Assigned to ${assignee.name}`
  );

  await notifyUser(
    assigneeId,
    "Maintenance assigned",
    `You were assigned: ${request.title} (${request.project.code})`,
    `/maintenance/${id}`
  );

  if (request.customer.userId) {
    await notifyUser(
      request.customer.userId,
      "Technician assigned",
      `${assignee.name} has been assigned to your request "${request.title}"`,
      `/maintenance/${id}`
    );
  }

  return updated;
}

export async function updateStatus(
  id: string,
  status: MaintenanceStatus,
  actorUserId: string,
  note?: string | null,
  resolution?: string | null
) {
  const request = await prisma.maintenanceRequest.findUnique({
    where: { id },
    include: {
      customer: { select: { userId: true } },
      assignee: { select: { id: true } },
      project: { select: { code: true } },
    },
  });
  if (!request) throw new Error("Maintenance request not found");

  const isResolved =
    status === MaintenanceStatus.RESOLVED || status === MaintenanceStatus.CLOSED;

  const updated = await prisma.maintenanceRequest.update({
    where: { id },
    data: {
      status,
      ...(resolution !== undefined ? { resolution } : {}),
      ...(isResolved ? { resolvedAt: new Date() } : {}),
      history: {
        create: {
          status,
          note: note ?? `Status changed to ${status}`,
        },
      },
    },
  });

  await audit(
    "STATUS_CHANGE",
    "MaintenanceRequest",
    id,
    actorUserId,
    `${request.status} → ${status}`
  );

  if (request.assigneeId && request.assigneeId !== actorUserId) {
    await notifyUser(
      request.assigneeId,
      "Maintenance status updated",
      `"${request.title}" is now ${status}`,
      `/maintenance/${id}`
    );
  }

  if (request.customer.userId && request.customer.userId !== actorUserId) {
    await notifyUser(
      request.customer.userId,
      "Maintenance status updated",
      `Your request "${request.title}" is now ${status}`,
      `/maintenance/${id}`
    );
  }

  return updated;
}
