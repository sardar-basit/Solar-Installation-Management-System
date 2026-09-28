import { ProjectStatus, QuotationStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { notifyUsers } from "@/lib/notify";
import { canTransition } from "@/lib/rbac";

export const quotationLineSchema = z.object({
  category: z.string().min(1),
  description: z.string().min(1),
  quantity: z.number().positive().default(1),
  unitPrice: z.number().nonnegative(),
});

export type QuotationLineInput = z.infer<typeof quotationLineSchema>;

export async function listQuotations(filters: {
  projectId?: string;
  status?: QuotationStatus;
} = {}) {
  return prisma.quotation.findMany({
    where: {
      ...(filters.projectId ? { projectId: filters.projectId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    },
    include: {
      project: { select: { id: true, code: true, title: true, status: true } },
      design: { select: { id: true, capacityKw: true } },
      createdBy: { select: { id: true, name: true } },
      lineItems: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getQuotation(id: string) {
  return prisma.quotation.findUnique({
    where: { id },
    include: {
      project: {
        include: {
          customer: true,
        },
      },
      design: true,
      createdBy: { select: { id: true, name: true, email: true } },
      lineItems: { orderBy: { category: "asc" } },
      payments: { orderBy: { paidAt: "desc" } },
    },
  });
}

export async function createQuotationFromDesign(
  projectId: string,
  lines: QuotationLineInput[],
  taxAmount: number,
  otherCharges: number,
  notes: string | null | undefined,
  userId: string
) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      design: true,
      quotation: true,
      customer: { select: { userId: true, fullName: true } },
    },
  });
  if (!project) throw new Error("Project not found");
  if (!project.design) {
    throw new Error("System design is required before creating a quotation");
  }
  if (project.quotation) {
    throw new Error("Quotation already exists for this project");
  }

  const parsedLines = z.array(quotationLineSchema).min(1).parse(lines);
  const tax = Number(taxAmount) || 0;
  const other = Number(otherCharges) || 0;

  const lineRows = parsedLines.map((line) => {
    const quantity = line.quantity ?? 1;
    const amount = quantity * line.unitPrice;
    return {
      category: line.category,
      description: line.description,
      quantity,
      unitPrice: line.unitPrice,
      amount,
    };
  });

  const subtotal = lineRows.reduce((sum, l) => sum + l.amount, 0);
  const totalAmount = subtotal + tax + other;

  const quotation = await prisma.quotation.create({
    data: {
      projectId,
      designId: project.design.id,
      createdById: userId,
      status: QuotationStatus.DRAFT,
      subtotal,
      taxAmount: tax,
      otherCharges: other,
      totalAmount,
      notes: notes ?? null,
      lineItems: {
        create: lineRows,
      },
    },
    include: { lineItems: true },
  });

  await audit(
    "CREATE",
    "Quotation",
    quotation.id,
    userId,
    `Quotation for ${project.code}: ${totalAmount}`
  );

  const recipients: string[] = [];
  if (project.managerId) recipients.push(project.managerId);
  if (project.customer.userId) recipients.push(project.customer.userId);
  await notifyUsers(
    recipients,
    "Quotation created",
    `Quotation drafted for ${project.code}`,
    `/projects/${projectId}`
  );

  return quotation;
}

export async function updateQuotationStatus(
  id: string,
  status: QuotationStatus,
  userId: string
) {
  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      project: {
        include: {
          customer: { select: { userId: true } },
        },
      },
    },
  });
  if (!quotation) throw new Error("Quotation not found");

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.quotation.update({
      where: { id },
      data: {
        status,
        ...(status === QuotationStatus.APPROVED
          ? { approvedAt: new Date() }
          : {}),
      },
    });

    if (
      status === QuotationStatus.APPROVED &&
      canTransition(quotation.project.status, ProjectStatus.APPROVED)
    ) {
      await tx.project.update({
        where: { id: quotation.project.id },
        data: { status: ProjectStatus.APPROVED },
      });
    }

    return updated;
  });

  await audit(
    "STATUS_CHANGE",
    "Quotation",
    id,
    userId,
    `${quotation.status} → ${status}`
  );

  const recipients = new Set<string>();
  if (quotation.project.managerId) recipients.add(quotation.project.managerId);
  if (quotation.project.customer.userId) {
    recipients.add(quotation.project.customer.userId);
  }
  if (quotation.createdById) recipients.add(quotation.createdById);
  recipients.delete(userId);

  await notifyUsers(
    [...recipients],
    "Quotation status updated",
    `Quotation is now ${status}`,
    `/projects/${quotation.projectId}`
  );

  return result;
}
