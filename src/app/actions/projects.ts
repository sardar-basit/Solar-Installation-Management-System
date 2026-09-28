"use server";

import { ProjectStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/session";
import {
  assignTechnician,
  createProject,
  updateProjectStatus,
} from "@/lib/services/projects";
import {
  actionError,
  formOptionalString,
  formString,
  type ActionResult,
} from "@/lib/action-utils";

export async function createProjectAction(
  formData: FormData
): Promise<ActionResult> {
  const session = await requireCapability("projects_write");
  try {
    const project = await createProject(
      {
        title: formString(formData, "title"),
        description: formOptionalString(formData, "description"),
        customerId: formString(formData, "customerId"),
        managerId: formOptionalString(formData, "managerId"),
      },
      session.user.id
    );
    revalidatePath("/dashboard/projects");
    redirect(`/dashboard/projects/${project.id}`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return actionError(error);
  }
}

export async function updateProjectStatusAction(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireCapability("projects_write");
  try {
    const status = formString(formData, "status") as ProjectStatus;
    await updateProjectStatus(id, status, session.user.id);
    revalidatePath("/dashboard/projects");
    revalidatePath(`/dashboard/projects/${id}`);
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function assignTechnicianAction(
  projectId: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireCapability("projects_assign");
  try {
    await assignTechnician(
      projectId,
      formString(formData, "technicianUserId"),
      session.user.id
    );
    revalidatePath(`/dashboard/projects/${projectId}`);
    revalidatePath("/dashboard/installations");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}
