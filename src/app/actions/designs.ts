"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/session";
import { createDesign, updateDesign } from "@/lib/services/designs";
import {
  actionError,
  formInt,
  formNumber,
  formOptionalString,
  formString,
  type ActionResult,
} from "@/lib/action-utils";

export async function createDesignAction(
  formData: FormData
): Promise<ActionResult> {
  const session = await requireCapability("designs_write");
  try {
    const design = await createDesign(
      {
        projectId: formString(formData, "projectId"),
        designerId: session.user.id,
        capacityKw: formNumber(formData, "capacityKw"),
        panelCount: formInt(formData, "panelCount"),
        inverterCount: formInt(formData, "inverterCount") || 1,
        batteryCount: formInt(formData, "batteryCount") || 0,
        otherComponents: formOptionalString(formData, "otherComponents"),
        yieldFactorKwhPerKwYear:
          formNumber(formData, "yieldFactorKwhPerKwYear") || 1400,
        notes: formOptionalString(formData, "notes"),
      },
      session.user.id
    );
    revalidatePath("/dashboard/designs");
    revalidatePath(`/dashboard/projects/${formString(formData, "projectId")}`);
    redirect(`/dashboard/designs/${design.id}`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return actionError(error);
  }
}

export async function updateDesignAction(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireCapability("designs_write");
  try {
    await updateDesign(
      id,
      {
        capacityKw: formNumber(formData, "capacityKw"),
        panelCount: formInt(formData, "panelCount"),
        inverterCount: formInt(formData, "inverterCount"),
        batteryCount: formInt(formData, "batteryCount"),
        otherComponents: formOptionalString(formData, "otherComponents"),
        yieldFactorKwhPerKwYear: formNumber(formData, "yieldFactorKwhPerKwYear"),
        notes: formOptionalString(formData, "notes"),
      },
      session.user.id
    );
    revalidatePath("/dashboard/designs");
    revalidatePath(`/dashboard/designs/${id}`);
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}
