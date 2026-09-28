"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/session";
import { saveUpload } from "@/lib/uploads";
import {
  addSurveyAttachment,
  createSurvey,
  updateSurvey,
} from "@/lib/services/surveys";
import {
  actionError,
  formNumber,
  formOptionalString,
  formString,
  type ActionResult,
} from "@/lib/action-utils";

function optionalFloat(formData: FormData, key: string): number | null {
  const raw = formString(formData, key);
  if (!raw) return null;
  const n = formNumber(formData, key);
  return Number.isFinite(n) ? n : null;
}

export async function createSurveyAction(
  formData: FormData
): Promise<ActionResult> {
  const session = await requireCapability("surveys_write");
  try {
    const survey = await createSurvey(
      {
        projectId: formString(formData, "projectId"),
        surveyorId: session.user.id,
        roofType: formOptionalString(formData, "roofType"),
        roofAreaSqm: optionalFloat(formData, "roofAreaSqm"),
        roofOrientation: formOptionalString(formData, "roofOrientation"),
        shadingNotes: formOptionalString(formData, "shadingNotes"),
        siteAccessNotes: formOptionalString(formData, "siteAccessNotes"),
        monthlyConsumptionKwh: optionalFloat(formData, "monthlyConsumptionKwh"),
        requiredCapacityKw: optionalFloat(formData, "requiredCapacityKw"),
        notes: formOptionalString(formData, "notes"),
      },
      session.user.id
    );
    revalidatePath("/dashboard/surveys");
    revalidatePath(`/dashboard/projects/${formString(formData, "projectId")}`);
    redirect(`/dashboard/surveys/${survey.id}`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return actionError(error);
  }
}

export async function updateSurveyAction(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireCapability("surveys_write");
  try {
    await updateSurvey(
      id,
      {
        roofType: formOptionalString(formData, "roofType"),
        roofAreaSqm: optionalFloat(formData, "roofAreaSqm"),
        roofOrientation: formOptionalString(formData, "roofOrientation"),
        shadingNotes: formOptionalString(formData, "shadingNotes"),
        siteAccessNotes: formOptionalString(formData, "siteAccessNotes"),
        monthlyConsumptionKwh: optionalFloat(formData, "monthlyConsumptionKwh"),
        requiredCapacityKw: optionalFloat(formData, "requiredCapacityKw"),
        notes: formOptionalString(formData, "notes"),
      },
      session.user.id
    );
    revalidatePath("/dashboard/surveys");
    revalidatePath(`/dashboard/surveys/${id}`);
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function addSurveyAttachmentAction(
  surveyId: string,
  formData: FormData
): Promise<ActionResult> {
  await requireCapability("surveys_write");
  try {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "Please choose a file" };
    }
    const saved = await saveUpload(file, `surveys/${surveyId}`);
    await addSurveyAttachment(surveyId, saved);
    revalidatePath(`/dashboard/surveys/${surveyId}`);
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}
