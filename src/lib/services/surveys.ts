import { ProjectStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";
import { canTransition } from "@/lib/rbac";

export const surveyFieldsSchema = z.object({
  projectId: z.string().min(1),
  roofType: z.string().optional().nullable(),
  roofAreaSqm: z.number().nonnegative().optional().nullable(),
  roofOrientation: z.string().optional().nullable(),
  shadingNotes: z.string().optional().nullable(),
  siteAccessNotes: z.string().optional().nullable(),
  monthlyConsumptionKwh: z.number().nonnegative().optional().nullable(),
  requiredCapacityKw: z.number().nonnegative().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const surveyUpdateSchema = surveyFieldsSchema.omit({ projectId: true }).partial();

export type SurveyCreateInput = z.infer<typeof surveyFieldsSchema> & {
  surveyorId: string;
};
export type SurveyUpdateInput = z.infer<typeof surveyUpdateSchema>;

export async function listSurveys(projectId?: string) {
  return prisma.siteSurvey.findMany({
    where: projectId ? { projectId } : undefined,
    include: {
      project: { select: { id: true, code: true, title: true, status: true } },
      surveyor: { select: { id: true, name: true } },
      attachments: true,
    },
    orderBy: { surveyedAt: "desc" },
  });
}

export async function getSurvey(id: string) {
  return prisma.siteSurvey.findUnique({
    where: { id },
    include: {
      project: {
        include: {
          customer: { select: { id: true, fullName: true } },
        },
      },
      surveyor: { select: { id: true, name: true, email: true } },
      attachments: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function createSurvey(data: SurveyCreateInput, actorUserId: string) {
  const parsed = surveyFieldsSchema.parse(data);
  const project = await prisma.project.findUnique({
    where: { id: parsed.projectId },
    include: { survey: true, manager: { select: { id: true } } },
  });
  if (!project) throw new Error("Project not found");
  if (project.survey) throw new Error("Survey already exists for this project");

  const survey = await prisma.$transaction(async (tx) => {
    const created = await tx.siteSurvey.create({
      data: {
        projectId: parsed.projectId,
        surveyorId: data.surveyorId || actorUserId,
        roofType: parsed.roofType ?? null,
        roofAreaSqm: parsed.roofAreaSqm ?? null,
        roofOrientation: parsed.roofOrientation ?? null,
        shadingNotes: parsed.shadingNotes ?? null,
        siteAccessNotes: parsed.siteAccessNotes ?? null,
        monthlyConsumptionKwh: parsed.monthlyConsumptionKwh ?? null,
        requiredCapacityKw: parsed.requiredCapacityKw ?? null,
        notes: parsed.notes ?? null,
      },
    });

    if (
      project.status === ProjectStatus.PENDING &&
      canTransition(project.status, ProjectStatus.SURVEY_SCHEDULED)
    ) {
      await tx.project.update({
        where: { id: project.id },
        data: { status: ProjectStatus.SURVEY_SCHEDULED },
      });
    }

    return created;
  });

  await audit("CREATE", "SiteSurvey", survey.id, actorUserId, `Survey for ${project.code}`);

  if (project.managerId) {
    await notifyUser(
      project.managerId,
      "Site survey created",
      `Survey recorded for ${project.code}`,
      `/projects/${project.id}`
    );
  }

  return survey;
}

export async function updateSurvey(
  id: string,
  data: SurveyUpdateInput,
  actorUserId: string
) {
  const parsed = surveyUpdateSchema.parse(data);
  const existing = await prisma.siteSurvey.findUnique({ where: { id } });
  if (!existing) throw new Error("Survey not found");

  const survey = await prisma.siteSurvey.update({
    where: { id },
    data: {
      ...(parsed.roofType !== undefined ? { roofType: parsed.roofType } : {}),
      ...(parsed.roofAreaSqm !== undefined ? { roofAreaSqm: parsed.roofAreaSqm } : {}),
      ...(parsed.roofOrientation !== undefined
        ? { roofOrientation: parsed.roofOrientation }
        : {}),
      ...(parsed.shadingNotes !== undefined ? { shadingNotes: parsed.shadingNotes } : {}),
      ...(parsed.siteAccessNotes !== undefined
        ? { siteAccessNotes: parsed.siteAccessNotes }
        : {}),
      ...(parsed.monthlyConsumptionKwh !== undefined
        ? { monthlyConsumptionKwh: parsed.monthlyConsumptionKwh }
        : {}),
      ...(parsed.requiredCapacityKw !== undefined
        ? { requiredCapacityKw: parsed.requiredCapacityKw }
        : {}),
      ...(parsed.notes !== undefined ? { notes: parsed.notes } : {}),
    },
  });

  await audit("UPDATE", "SiteSurvey", id, actorUserId, "Updated site survey");
  return survey;
}

export async function addSurveyAttachment(
  surveyId: string,
  file: { fileName: string; filePath: string; mimeType?: string | null }
) {
  const survey = await prisma.siteSurvey.findUnique({ where: { id: surveyId } });
  if (!survey) throw new Error("Survey not found");

  return prisma.surveyAttachment.create({
    data: {
      surveyId,
      fileName: file.fileName,
      filePath: file.filePath,
      mimeType: file.mimeType ?? null,
    },
  });
}
