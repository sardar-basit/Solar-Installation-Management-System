"use server";

import { MaintenanceStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCapability, requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  assignRequest,
  createRequest,
  updateStatus,
} from "@/lib/services/maintenance";
import {
  actionError,
  formOptionalString,
  formString,
  type ActionResult,
} from "@/lib/action-utils";

export async function createMaintenanceAction(
  formData: FormData
): Promise<ActionResult> {
  const session = await requireCapability("maintenance_request");
  try {
    let customerId = formString(formData, "customerId");
    const projectId = formString(formData, "projectId");

    if (session.user.role === "CUSTOMER") {
      const customer = await prisma.customer.findUnique({
        where: { userId: session.user.id },
      });
      if (!customer) return { ok: false, error: "Customer profile not found" };
      customerId = customer.id;
      const project = await prisma.project.findFirst({
        where: { id: projectId, customerId: customer.id },
      });
      if (!project) return { ok: false, error: "Project not found" };
    }

    const request = await createRequest(
      {
        projectId,
        customerId,
        title: formString(formData, "title"),
        description: formString(formData, "description"),
        priority: formString(formData, "priority") || "NORMAL",
      },
      session.user.id
    );

    revalidatePath("/dashboard/maintenance");
    revalidatePath("/portal/maintenance");

    if (session.user.role === "CUSTOMER") {
      redirect("/portal/maintenance");
    }
    redirect(`/dashboard/maintenance/${request.id}`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return actionError(error);
  }
}

export async function assignMaintenanceAction(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireCapability("maintenance_manage");
  try {
    await assignRequest(id, formString(formData, "assigneeId"), session.user.id);
    revalidatePath("/dashboard/maintenance");
    revalidatePath(`/dashboard/maintenance/${id}`);
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateMaintenanceStatusAction(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireCapability("maintenance_manage");
  try {
    await updateStatus(
      id,
      formString(formData, "status") as MaintenanceStatus,
      session.user.id,
      formOptionalString(formData, "note"),
      formOptionalString(formData, "resolution")
    );
    revalidatePath("/dashboard/maintenance");
    revalidatePath(`/dashboard/maintenance/${id}`);
    revalidatePath("/portal/maintenance");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}
