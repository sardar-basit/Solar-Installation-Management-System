import { ProjectStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { notifyUsers } from "@/lib/notify";
import { canTransition } from "@/lib/rbac";

export const progressUpdateSchema = z.object({
  progressPercent: z.number().int().min(0).max(100),
  equipmentNotes: z.string().optional().nullable(),
  statusNotes: z.string().optional().nullable(),
});

export type ProgressUpdateInput = z.infer<typeof progressUpdateSchema>;

export async function listInstallations(filters: { projectId?: string } = {}) {
  return prisma.installation.findMany({
    where: filters.projectId ? { projectId: filters.projectId } : undefined,
    include: {
      project: {
        select: {
          id: true,
          code: true,
          title: true,
          status: true,
          customer: { select: { id: true, fullName: true } },
        },
      },
      technician: { select: { id: true, name: true } },
      verifiedBy: { select: { id: true, name: true } },
      photos: { orderBy: { createdAt: "desc" }, take: 5 },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getMyInstallations(techId: string) {
  return prisma.installation.findMany({
    where: { technicianId: techId },
    include: {
      project: {
        select: {
          id: true,
          code: true,
          title: true,
          status: true,
          customer: { select: { id: true, fullName: true, siteAddress: true } },
        },
      },
      photos: { orderBy: { createdAt: "desc" }, take: 3 },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getInstallation(id: string) {
  return prisma.installation.findUnique({
    where: { id },
    include: {
      project: {
        include: {
          customer: true,
          manager: { select: { id: true, name: true } },
          design: true,
        },
      },
      technician: { select: { id: true, name: true, email: true, phone: true } },
      verifiedBy: { select: { id: true, name: true } },
      photos: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function ensureInstallation(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error("Project not found");

  const existing = await prisma.installation.findUnique({ where: { projectId } });
  if (existing) return existing;

  return prisma.installation.create({
    data: { projectId },
  });
}

export async function updateProgress(
  id: string,
  data: ProgressUpdateInput,
  userId: string
) {
  const parsed = progressUpdateSchema.parse(data);
  const installation = await prisma.installation.findUnique({
    where: { id },
    include: {
      project: {
        include: {
          customer: { select: { userId: true } },
        },
      },
    },
  });
  if (!installation) throw new Error("Installation not found");

  const wasZero = installation.progressPercent <= 0;
  const starting = wasZero && parsed.progressPercent > 0;
  const completing = parsed.progressPercent === 100;

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.installation.update({
      where: { id },
      data: {
        progressPercent: parsed.progressPercent,
        ...(parsed.equipmentNotes !== undefined
          ? { equipmentNotes: parsed.equipmentNotes }
          : {}),
        ...(parsed.statusNotes !== undefined
          ? { statusNotes: parsed.statusNotes }
          : {}),
        ...(starting && !installation.startedAt
          ? { startedAt: new Date() }
          : {}),
        ...(completing ? { completedAt: new Date() } : {}),
      },
    });

    if (
      starting &&
      canTransition(installation.project.status, ProjectStatus.INSTALLATION_IN_PROGRESS)
    ) {
      await tx.project.update({
        where: { id: installation.projectId },
        data: { status: ProjectStatus.INSTALLATION_IN_PROGRESS },
      });
    }

    return result;
  });

  await audit(
    "UPDATE",
    "Installation",
    id,
    userId,
    `Progress ${parsed.progressPercent}%`
  );

  const recipients = new Set<string>();
  if (installation.project.managerId) recipients.add(installation.project.managerId);
  if (installation.project.customer.userId) {
    recipients.add(installation.project.customer.userId);
  }
  recipients.delete(userId);

  await notifyUsers(
    [...recipients],
    "Installation progress updated",
    `${installation.project.code ?? "Project"} is at ${parsed.progressPercent}%`,
    `/projects/${installation.projectId}`
  );

  return updated;
}

export async function verifyInstallation(id: string, verifierId: string) {
  const installation = await prisma.installation.findUnique({
    where: { id },
    include: {
      project: {
        include: {
          customer: { select: { userId: true } },
        },
      },
    },
  });
  if (!installation) throw new Error("Installation not found");
  if (installation.progressPercent < 100) {
    throw new Error("Installation must be 100% complete before verification");
  }
  if (installation.verifiedAt) {
    throw new Error("Installation already verified");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.installation.update({
      where: { id },
      data: {
        verifiedAt: new Date(),
        verifiedById: verifierId,
        completedAt: installation.completedAt ?? new Date(),
      },
    });

    if (canTransition(installation.project.status, ProjectStatus.COMPLETED)) {
      await tx.project.update({
        where: { id: installation.projectId },
        data: {
          status: ProjectStatus.COMPLETED,
          completedAt: new Date(),
        },
      });
    }

    return result;
  });

  await audit("VERIFY", "Installation", id, verifierId, "Installation verified");

  const recipients = new Set<string>();
  if (installation.technicianId) recipients.add(installation.technicianId);
  if (installation.project.managerId) recipients.add(installation.project.managerId);
  if (installation.project.customer.userId) {
    recipients.add(installation.project.customer.userId);
  }
  recipients.delete(verifierId);

  await notifyUsers(
    [...recipients],
    "Installation verified",
    `Installation for project has been verified and marked completed`,
    `/projects/${installation.projectId}`
  );

  return updated;
}

export async function addPhoto(
  installationId: string,
  file: { fileName: string; filePath: string; caption?: string | null }
) {
  const installation = await prisma.installation.findUnique({
    where: { id: installationId },
  });
  if (!installation) throw new Error("Installation not found");

  return prisma.installationPhoto.create({
    data: {
      installationId,
      fileName: file.fileName,
      filePath: file.filePath,
      caption: file.caption ?? null,
    },
  });
}
