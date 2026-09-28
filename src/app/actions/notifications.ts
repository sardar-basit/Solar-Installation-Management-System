"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import {
  markAllRead,
  markRead,
} from "@/lib/services/notifications-service";
import { actionError, type ActionResult } from "@/lib/action-utils";

export async function markNotificationReadAction(
  id: string
): Promise<ActionResult> {
  const session = await requireSession();
  try {
    await markRead(id, session.user.id);
    revalidatePath("/dashboard/notifications");
    revalidatePath("/portal/notifications");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  const session = await requireSession();
  try {
    await markAllRead(session.user.id);
    revalidatePath("/dashboard/notifications");
    revalidatePath("/portal/notifications");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}
