import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { Role } from "@prisma/client";
import { can, type Capability } from "./rbac";

export { can } from "./rbac";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireSession() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }
  return session;
}

export async function requireCapability(capability: Capability) {
  const session = await requireSession();
  if (!can(session.user.role, capability)) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function requireRoles(roles: Role[]) {
  const session = await requireSession();
  if (!roles.includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  return session;
}
