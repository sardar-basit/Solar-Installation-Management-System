"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/session";
import {
  createCustomer,
  updateCustomer,
} from "@/lib/services/customers";
import {
  actionError,
  formBool,
  formOptionalString,
  formString,
  type ActionResult,
} from "@/lib/action-utils";

export async function createCustomerAction(
  formData: FormData
): Promise<ActionResult> {
  const session = await requireCapability("customers_write");
  try {
    const customer = await createCustomer(
      {
        fullName: formString(formData, "fullName"),
        email: formString(formData, "email"),
        phone: formString(formData, "phone"),
        address: formString(formData, "address"),
        city: formOptionalString(formData, "city"),
        siteAddress: formString(formData, "siteAddress"),
        siteCity: formOptionalString(formData, "siteCity"),
        siteNotes: formOptionalString(formData, "siteNotes"),
        userId: formOptionalString(formData, "userId"),
      },
      session.user.id
    );
    revalidatePath("/dashboard/customers");
    redirect(`/dashboard/customers/${customer.id}`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return actionError(error);
  }
}

export async function updateCustomerAction(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireCapability("customers_write");
  try {
    await updateCustomer(
      id,
      {
        fullName: formString(formData, "fullName"),
        email: formString(formData, "email"),
        phone: formString(formData, "phone"),
        address: formString(formData, "address"),
        city: formOptionalString(formData, "city"),
        siteAddress: formString(formData, "siteAddress"),
        siteCity: formOptionalString(formData, "siteCity"),
        siteNotes: formOptionalString(formData, "siteNotes"),
        userId: formOptionalString(formData, "userId"),
        archived: formBool(formData, "archived"),
      },
      session.user.id
    );
    revalidatePath("/dashboard/customers");
    revalidatePath(`/dashboard/customers/${id}`);
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}
