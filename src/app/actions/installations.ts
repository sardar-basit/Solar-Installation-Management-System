"use server";

import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/session";
import { saveUpload } from "@/lib/uploads";
import {
  addPhoto,
  updateProgress,
  verifyInstallation,
} from "@/lib/services/installations";
import {
  actionError,
  formInt,
  formOptionalString,
  formString,
  type ActionResult,
} from "@/lib/action-utils";

export async function updateProgressAction(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireCapability("installations_update");
  try {
    await updateProgress(
      id,
      {
        progressPercent: formInt(formData, "progressPercent"),
        equipmentNotes: formOptionalString(formData, "equipmentNotes"),
        statusNotes: formOptionalString(formData, "statusNotes"),
      },
      session.user.id
    );
    revalidatePath("/dashboard/installations");
    revalidatePath(`/dashboard/installations/${id}`);
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function verifyInstallationAction(
  id: string
): Promise<ActionResult> {
  const session = await requireCapability("installations_verify");
  try {
    await verifyInstallation(id, session.user.id);
    revalidatePath("/dashboard/installations");
    revalidatePath(`/dashboard/installations/${id}`);
    revalidatePath("/dashboard/projects");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function addInstallationPhotoAction(
  installationId: string,
  formData: FormData
): Promise<ActionResult> {
  await requireCapability("installations_update");
  try {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "Please choose a photo" };
    }
    const saved = await saveUpload(file, `installations/${installationId}`);
    await addPhoto(installationId, {
      fileName: saved.fileName,
      filePath: saved.filePath,
      caption: formOptionalString(formData, "caption"),
    });
    revalidatePath(`/dashboard/installations/${installationId}`);
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}
