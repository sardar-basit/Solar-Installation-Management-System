"use server";

import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/session";
import { createUser, updateUser } from "@/lib/services/users";
import {
  actionError,
  formBool,
  formOptionalString,
  formString,
  type ActionResult,
} from "@/lib/action-utils";

export async function createUserAction(
  formData: FormData
): Promise<ActionResult> {
  const session = await requireCapability("manage_users");
  try {
    await createUser(
      {
        email: formString(formData, "email"),
        username: formString(formData, "username"),
        name: formString(formData, "name"),
        password: formString(formData, "password"),
        role: formString(formData, "role") as Role,
        phone: formOptionalString(formData, "phone"),
        active: true,
      },
      session.user.id
    );
    revalidatePath("/dashboard/users");
    redirect("/dashboard/users");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return actionError(error);
  }
}

export async function updateUserAction(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireCapability("manage_users");
  try {
    const password = formString(formData, "password");
    await updateUser(
      id,
      {
        email: formString(formData, "email"),
        username: formString(formData, "username"),
        name: formString(formData, "name"),
        role: formString(formData, "role") as Role,
        phone: formOptionalString(formData, "phone"),
        active: formBool(formData, "active"),
        ...(password ? { password } : {}),
      },
      session.user.id
    );
    revalidatePath("/dashboard/users");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}
