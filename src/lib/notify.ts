import { Role } from "@prisma/client";
import { prisma } from "./prisma";
import { notifyUsers as createNotifications } from "./notifications";
import { sendEmail } from "./email";

export async function notifyUser(
  userId: string,
  title: string,
  body: string,
  link?: string
) {
  await createNotifications([userId], title, body, link);
  await maybeEmail(userId, title, body);
}

export async function notifyUsers(
  userIds: string[],
  title: string,
  body: string,
  link?: string
) {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (!unique.length) return;
  await createNotifications(unique, title, body, link);
  await Promise.all(unique.map((id) => maybeEmail(id, title, body)));
}

export async function notifyByRole(
  role: Role,
  title: string,
  body: string,
  link?: string
) {
  const users = await prisma.user.findMany({
    where: { role, active: true },
    select: { id: true },
  });
  await notifyUsers(
    users.map((u) => u.id),
    title,
    body,
    link
  );
}

async function maybeEmail(userId: string, title: string, body: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, role: true },
    });
    if (!user) return;
    // Email customer-facing events; staff rely on in-app by default
    if (user.role === Role.CUSTOMER || process.env.EMAIL_ALL_ROLES === "true") {
      await sendEmail(user.email, `[SIMS] ${title}`, body);
    }
  } catch (e) {
    console.error("notify email failed", e);
  }
}
