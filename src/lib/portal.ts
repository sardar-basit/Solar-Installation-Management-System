import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export async function getPortalCustomer(userId: string) {
  const customer = await prisma.customer.findUnique({
    where: { userId },
  });
  if (!customer) {
    throw new Error("Customer profile not linked to this account");
  }
  return customer;
}

export async function requirePortalCustomer(userId: string) {
  const customer = await prisma.customer.findUnique({
    where: { userId },
  });
  if (!customer) notFound();
  return customer;
}
