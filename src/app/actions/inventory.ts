"use server";

import { InventoryCategory } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/session";
import {
  adjustStock,
  createItem,
  issueToProject,
  updateItem,
} from "@/lib/services/inventory";
import {
  actionError,
  formBool,
  formInt,
  formNumber,
  formOptionalString,
  formString,
  type ActionResult,
} from "@/lib/action-utils";

export async function createInventoryItemAction(
  formData: FormData
): Promise<ActionResult> {
  const session = await requireCapability("inventory_manage");
  try {
    await createItem(
      {
        sku: formString(formData, "sku"),
        name: formString(formData, "name"),
        category: formString(formData, "category") as InventoryCategory,
        quantity: formInt(formData, "quantity") || 0,
        minLevel: formInt(formData, "minLevel") || 5,
        unitCost: formNumber(formData, "unitCost") || 0,
        unit: formString(formData, "unit") || "pcs",
        description: formOptionalString(formData, "description"),
        active: true,
      },
      session.user.id
    );
    revalidatePath("/dashboard/inventory");
    redirect("/dashboard/inventory");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return actionError(error);
  }
}

export async function updateInventoryItemAction(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireCapability("inventory_manage");
  try {
    await updateItem(
      id,
      {
        sku: formString(formData, "sku"),
        name: formString(formData, "name"),
        category: formString(formData, "category") as InventoryCategory,
        minLevel: formInt(formData, "minLevel"),
        unitCost: formNumber(formData, "unitCost"),
        unit: formString(formData, "unit"),
        description: formOptionalString(formData, "description"),
        active: formBool(formData, "active"),
      },
      session.user.id
    );
    revalidatePath("/dashboard/inventory");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function adjustStockAction(
  formData: FormData
): Promise<ActionResult> {
  const session = await requireCapability("inventory_manage");
  try {
    const type = formString(formData, "type") as "IN" | "OUT" | "ADJUST";
    await adjustStock(
      formString(formData, "itemId"),
      type,
      formInt(formData, "quantity"),
      formOptionalString(formData, "note"),
      session.user.id
    );
    revalidatePath("/dashboard/inventory");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function issueToProjectAction(
  formData: FormData
): Promise<ActionResult> {
  const session = await requireCapability("inventory_manage");
  try {
    const projectId = formString(formData, "projectId");
    await issueToProject(
      projectId,
      formString(formData, "itemId"),
      formInt(formData, "quantity"),
      session.user.id,
      formOptionalString(formData, "note")
    );
    revalidatePath("/dashboard/inventory");
    revalidatePath(`/dashboard/projects/${projectId}`);
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}
