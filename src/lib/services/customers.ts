import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export const customerCreateSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(1, "Phone is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().optional().nullable(),
  siteAddress: z.string().min(1, "Site address is required"),
  siteCity: z.string().optional().nullable(),
  siteNotes: z.string().optional().nullable(),
  /** Optional portal User id to link (1:1). Verified via findUnique before create. */
  userId: z.string().optional().nullable(),
});

export const customerUpdateSchema = customerCreateSchema.partial().omit({
  userId: true,
}).extend({
  archived: z.boolean().optional(),
  userId: z.string().optional().nullable(),
});

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;

export async function listCustomers(search?: string) {
  const q = search?.trim();
  return prisma.customer.findMany({
    where: q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
            { city: { contains: q, mode: "insensitive" } },
            { siteAddress: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: {
      user: { select: { id: true, email: true, username: true, name: true } },
      _count: { select: { projects: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCustomer(id: string) {
  return prisma.customer.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, username: true, name: true, role: true } },
      projects: {
        orderBy: { createdAt: "desc" },
        include: {
          manager: { select: { id: true, name: true } },
        },
      },
      payments: { orderBy: { paidAt: "desc" }, take: 20 },
      maintenanceRequests: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
}

export async function createCustomer(data: CustomerCreateInput, actorUserId: string) {
  const parsed = customerCreateSchema.parse(data);

  let linkUserId: string | undefined;
  if (parsed.userId) {
    // Carefully resolve portal user — never upsert on nullable unique userId
    const portalUser = await prisma.user.findUnique({
      where: { id: parsed.userId },
      select: { id: true, role: true },
    });
    if (!portalUser) {
      throw new Error("Linked user not found");
    }
    const existingLink = await prisma.customer.findUnique({
      where: { userId: portalUser.id },
      select: { id: true },
    });
    if (existingLink) {
      throw new Error("This user is already linked to another customer");
    }
    linkUserId = portalUser.id;
  }

  const customer = await prisma.customer.create({
    data: {
      fullName: parsed.fullName,
      email: parsed.email,
      phone: parsed.phone,
      address: parsed.address,
      city: parsed.city ?? null,
      siteAddress: parsed.siteAddress,
      siteCity: parsed.siteCity ?? null,
      siteNotes: parsed.siteNotes ?? null,
      ...(linkUserId ? { userId: linkUserId } : {}),
    },
  });

  await audit("CREATE", "Customer", customer.id, actorUserId, `Created customer ${customer.fullName}`);
  return customer;
}

export async function updateCustomer(
  id: string,
  data: CustomerUpdateInput,
  actorUserId: string
) {
  const parsed = customerUpdateSchema.parse(data);
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) throw new Error("Customer not found");

  let linkUserId: string | null | undefined = undefined;
  if (parsed.userId !== undefined) {
    if (parsed.userId === null || parsed.userId === "") {
      linkUserId = null;
    } else {
      const portalUser = await prisma.user.findUnique({
        where: { id: parsed.userId },
        select: { id: true },
      });
      if (!portalUser) throw new Error("Linked user not found");
      const existingLink = await prisma.customer.findUnique({
        where: { userId: portalUser.id },
        select: { id: true },
      });
      if (existingLink && existingLink.id !== id) {
        throw new Error("This user is already linked to another customer");
      }
      linkUserId = portalUser.id;
    }
  }

  const { userId: _omit, ...rest } = parsed;
  const customer = await prisma.customer.update({
    where: { id },
    data: {
      ...rest,
      ...(linkUserId !== undefined ? { userId: linkUserId } : {}),
    },
  });

  await audit("UPDATE", "Customer", customer.id, actorUserId, `Updated customer ${customer.fullName}`);
  return customer;
}
