import { prisma } from "./prisma";

export async function audit(
  action: string,
  entityType: string,
  entityId?: string | null,
  userId?: string | null,
  details?: string | null
) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entityType,
        entityId: entityId ?? undefined,
        userId: userId ?? undefined,
        details: details ?? undefined,
      },
    });
  } catch (e) {
    console.error("Audit log failed", e);
  }
}
