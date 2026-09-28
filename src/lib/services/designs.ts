import { ProjectStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { notifyUser, notifyUsers } from "@/lib/notify";
import { canTransition } from "@/lib/rbac";

export const designCreateSchema = z.object({
  projectId: z.string().min(1),
  capacityKw: z.number().positive("Capacity must be positive"),
  panelCount: z.number().int().positive("Panel count must be positive"),
  inverterCount: z.number().int().nonnegative().default(1),
  batteryCount: z.number().int().nonnegative().default(0),
  otherComponents: z.string().optional().nullable(),
  yieldFactorKwhPerKwYear: z.number().positive().default(1400),
  notes: z.string().optional().nullable(),
});

export const designUpdateSchema = designCreateSchema.omit({ projectId: true }).partial();

export type DesignCreateInput = z.infer<typeof designCreateSchema> & {
  designerId: string;
};
export type DesignUpdateInput = z.infer<typeof designUpdateSchema>;

export async function listDesigns(projectId?: string) {
  return prisma.systemDesign.findMany({
    where: projectId ? { projectId } : undefined,
    include: {
      project: { select: { id: true, code: true, title: true, status: true } },
      designer: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getDesign(id: string) {
  return prisma.systemDesign.findUnique({
    where: { id },
    include: {
      project: {
        include: {
          customer: { select: { id: true, fullName: true } },
          survey: true,
        },
      },
      designer: { select: { id: true, name: true, email: true } },
      quotation: true,
    },
  });
}

export async function createDesign(data: DesignCreateInput, actorUserId: string) {
  const parsed = designCreateSchema.parse(data);
  const project = await prisma.project.findUnique({
    where: { id: parsed.projectId },
    include: {
      design: true,
      customer: { select: { userId: true } },
      assignments: { select: { userId: true } },
    },
  });
  if (!project) throw new Error("Project not found");
  if (project.design) throw new Error("Design already exists for this project");

  const yieldFactor = parsed.yieldFactorKwhPerKwYear ?? 1400;
  const estimatedGenerationKwh = parsed.capacityKw * yieldFactor;

  const design = await prisma.$transaction(async (tx) => {
    const created = await tx.systemDesign.create({
      data: {
        projectId: parsed.projectId,
        designerId: data.designerId || actorUserId,
        capacityKw: parsed.capacityKw,
        panelCount: parsed.panelCount,
        inverterCount: parsed.inverterCount ?? 1,
        batteryCount: parsed.batteryCount ?? 0,
        otherComponents: parsed.otherComponents ?? null,
        yieldFactorKwhPerKwYear: yieldFactor,
        estimatedGenerationKwh,
        notes: parsed.notes ?? null,
      },
    });

    if (canTransition(project.status, ProjectStatus.DESIGN_COMPLETED)) {
      await tx.project.update({
        where: { id: project.id },
        data: { status: ProjectStatus.DESIGN_COMPLETED },
      });
    }

    return created;
  });

  await audit(
    "CREATE",
    "SystemDesign",
    design.id,
    actorUserId,
    `Design ${parsed.capacityKw}kW for ${project.code}`
  );

  const recipients = new Set<string>();
  if (project.managerId) recipients.add(project.managerId);
  if (project.customer.userId) recipients.add(project.customer.userId);
  for (const a of project.assignments) recipients.add(a.userId);

  await notifyUsers(
    [...recipients],
    "System design completed",
    `Design for ${project.code}: ${parsed.capacityKw} kW`,
    `/projects/${project.id}`
  );

  return design;
}

export async function updateDesign(
  id: string,
  data: DesignUpdateInput,
  actorUserId: string
) {
  const parsed = designUpdateSchema.parse(data);
  const existing = await prisma.systemDesign.findUnique({ where: { id } });
  if (!existing) throw new Error("Design not found");

  const capacityKw = parsed.capacityKw ?? existing.capacityKw;
  const yieldFactor =
    parsed.yieldFactorKwhPerKwYear ?? existing.yieldFactorKwhPerKwYear;
  const estimatedGenerationKwh = capacityKw * yieldFactor;

  const design = await prisma.systemDesign.update({
    where: { id },
    data: {
      ...(parsed.capacityKw !== undefined ? { capacityKw: parsed.capacityKw } : {}),
      ...(parsed.panelCount !== undefined ? { panelCount: parsed.panelCount } : {}),
      ...(parsed.inverterCount !== undefined
        ? { inverterCount: parsed.inverterCount }
        : {}),
      ...(parsed.batteryCount !== undefined
        ? { batteryCount: parsed.batteryCount }
        : {}),
      ...(parsed.otherComponents !== undefined
        ? { otherComponents: parsed.otherComponents }
        : {}),
      ...(parsed.yieldFactorKwhPerKwYear !== undefined
        ? { yieldFactorKwhPerKwYear: parsed.yieldFactorKwhPerKwYear }
        : {}),
      ...(parsed.notes !== undefined ? { notes: parsed.notes } : {}),
      estimatedGenerationKwh,
    },
  });

  await audit("UPDATE", "SystemDesign", id, actorUserId, "Updated system design");

  if (existing.designerId && existing.designerId !== actorUserId) {
    await notifyUser(
      existing.designerId,
      "Design updated",
      "A system design you created was updated",
      `/projects/${existing.projectId}`
    );
  }

  return design;
}
