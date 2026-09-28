"use server";

import { QuotationStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCapability, requireSession } from "@/lib/session";
import { can } from "@/lib/rbac";
import {
  createQuotationFromDesign,
  updateQuotationStatus,
  type QuotationLineInput,
} from "@/lib/services/quotations";
import {
  actionError,
  formNumber,
  formOptionalString,
  formString,
  type ActionResult,
} from "@/lib/action-utils";

function parseLines(formData: FormData): QuotationLineInput[] {
  const categories = formData.getAll("lineCategory");
  const descriptions = formData.getAll("lineDescription");
  const quantities = formData.getAll("lineQuantity");
  const unitPrices = formData.getAll("lineUnitPrice");

  const lines: QuotationLineInput[] = [];
  for (let i = 0; i < categories.length; i++) {
    const category = String(categories[i] ?? "").trim();
    const description = String(descriptions[i] ?? "").trim();
    const quantity = Number(quantities[i] ?? 1);
    const unitPrice = Number(unitPrices[i] ?? 0);
    if (!category && !description) continue;
    lines.push({
      category,
      description,
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
      unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
    });
  }
  return lines;
}

export async function createQuotationAction(
  formData: FormData
): Promise<ActionResult> {
  const session = await requireCapability("quotations_write");
  try {
    const projectId = formString(formData, "projectId");
    const quotation = await createQuotationFromDesign(
      projectId,
      parseLines(formData),
      formNumber(formData, "taxAmount") || 0,
      formNumber(formData, "otherCharges") || 0,
      formOptionalString(formData, "notes"),
      session.user.id
    );
    revalidatePath("/dashboard/quotations");
    revalidatePath(`/dashboard/projects/${projectId}`);
    redirect(`/dashboard/quotations/${quotation.id}`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return actionError(error);
  }
}

export async function updateQuotationStatusAction(
  id: string,
  status: QuotationStatus
): Promise<ActionResult> {
  const session = await requireSession();
  if (!can(session.user.role, "quotations_approve") && !can(session.user.role, "quotations_write")) {
    throw new Error("Unauthorized");
  }
  try {
    await updateQuotationStatus(id, status, session.user.id);
    revalidatePath("/dashboard/quotations");
    revalidatePath(`/dashboard/quotations/${id}`);
    revalidatePath("/portal/quotations");
    revalidatePath(`/portal/quotations/${id}`);
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}
