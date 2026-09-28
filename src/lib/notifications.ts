import { prisma } from "./prisma";

export async function notifyUser(
  userId: string,
  title: string,
  body: string,
  link?: string
) {
  return prisma.notification.create({
    data: { userId, title, body, link },
  });
}

export async function notifyUsers(
  userIds: string[],
  title: string,
  body: string,
  link?: string
) {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (!unique.length) return;
  await prisma.notification.createMany({
    data: unique.map((userId) => ({ userId, title, body, link })),
  });
}
