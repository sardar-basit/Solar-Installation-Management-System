import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export const userCreateSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50),
  name: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.nativeEnum(Role),
  phone: z.string().optional().nullable(),
  active: z.boolean().optional().default(true),
});

export const userUpdateSchema = z.object({
  email: z.string().email().optional(),
  username: z.string().min(3).max(50).optional(),
  name: z.string().min(1).optional(),
  password: z.string().min(8).optional(),
  role: z.nativeEnum(Role).optional(),
  phone: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

const publicUserSelect = {
  id: true,
  email: true,
  username: true,
  name: true,
  role: true,
  phone: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function listUsers(filters: {
  role?: Role;
  search?: string;
  active?: boolean;
} = {}) {
  const q = filters.search?.trim();
  return prisma.user.findMany({
    where: {
      ...(filters.role ? { role: filters.role } : {}),
      ...(filters.active === undefined ? {} : { active: filters.active }),
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { username: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: publicUserSelect,
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
}

export async function createUser(data: UserCreateInput, actorUserId: string) {
  const parsed = userCreateSchema.parse(data);

  const email = parsed.email.trim().toLowerCase();
  const username = parsed.username.trim().toLowerCase();

  const conflict = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username }],
    },
    select: { id: true, email: true, username: true },
  });
  if (conflict) {
    if (conflict.email === email) throw new Error("Email already in use");
    throw new Error("Username already in use");
  }

  const passwordHash = await bcrypt.hash(parsed.password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      username,
      name: parsed.name.trim(),
      passwordHash,
      role: parsed.role,
      phone: parsed.phone ?? null,
      active: parsed.active ?? true,
    },
    select: publicUserSelect,
  });

  await audit(
    "CREATE",
    "User",
    user.id,
    actorUserId,
    `Created user ${user.username} (${user.role})`
  );

  return user;
}

export async function updateUser(
  id: string,
  data: UserUpdateInput,
  actorUserId: string
) {
  const parsed = userUpdateSchema.parse(data);
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw new Error("User not found");

  if (parsed.email || parsed.username) {
    const email = parsed.email?.trim().toLowerCase();
    const username = parsed.username?.trim().toLowerCase();
    const conflict = await prisma.user.findFirst({
      where: {
        id: { not: id },
        OR: [
          ...(email ? [{ email }] : []),
          ...(username ? [{ username }] : []),
        ],
      },
      select: { email: true, username: true },
    });
    if (conflict) {
      if (email && conflict.email === email) throw new Error("Email already in use");
      if (username && conflict.username === username) {
        throw new Error("Username already in use");
      }
    }
  }

  const passwordHash = parsed.password
    ? await bcrypt.hash(parsed.password, 10)
    : undefined;

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(parsed.email !== undefined
        ? { email: parsed.email.trim().toLowerCase() }
        : {}),
      ...(parsed.username !== undefined
        ? { username: parsed.username.trim().toLowerCase() }
        : {}),
      ...(parsed.name !== undefined ? { name: parsed.name.trim() } : {}),
      ...(parsed.role !== undefined ? { role: parsed.role } : {}),
      ...(parsed.phone !== undefined ? { phone: parsed.phone } : {}),
      ...(parsed.active !== undefined ? { active: parsed.active } : {}),
      ...(passwordHash ? { passwordHash } : {}),
    },
    select: publicUserSelect,
  });

  await audit(
    "UPDATE",
    "User",
    id,
    actorUserId,
    `Updated user ${user.username}`
  );

  return user;
}
