import { prisma } from "@/lib/prisma";

export async function listForUser(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function markRead(id: string, userId: string) {
  const notification = await prisma.notification.findFirst({
    where: { id, userId },
  });
  if (!notification) throw new Error("Notification not found");

  return prisma.notification.update({
    where: { id },
    data: { read: true },
  });
}

export async function markAllRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
  return { ok: true };
}

export async function unreadCount(userId: string) {
  return prisma.notification.count({
    where: { userId, read: false },
  });
}
