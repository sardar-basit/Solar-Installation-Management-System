"use server";

import { PaymentMethod } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/session";
import { recordPayment } from "@/lib/services/payments";
import {
  actionError,
  formNumber,
  formOptionalString,
  formString,
  type ActionResult,
} from "@/lib/action-utils";

export async function recordPaymentAction(
  formData: FormData
): Promise<ActionResult> {
  const session = await requireCapability("payments_write");
  try {
    const payment = await recordPayment(
      {
        projectId: formString(formData, "projectId"),
        amount: formNumber(formData, "amount"),
        method: (formString(formData, "method") || "CASH") as PaymentMethod,
        reference: formOptionalString(formData, "reference"),
        notes: formOptionalString(formData, "notes"),
      },
      session.user.id
    );
    revalidatePath("/dashboard/payments");
    revalidatePath(`/dashboard/projects/${formString(formData, "projectId")}`);
    redirect(`/dashboard/payments/${payment.id}`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return actionError(error);
  }
}
