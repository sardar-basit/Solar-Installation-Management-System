import { PaymentMethod } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { notifyUsers } from "@/lib/notify";

export const recordPaymentSchema = z.object({
  projectId: z.string().min(1),
  amount: z.number().positive("Amount must be positive"),
  method: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
  reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

async function generateReceiptNo(): Promise<string> {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const prefix = `RCP-${y}${m}${d}-`;

  const latest = await prisma.payment.findFirst({
    where: { receiptNo: { startsWith: prefix } },
    orderBy: { receiptNo: "desc" },
    select: { receiptNo: true },
  });

  let next = 1;
  if (latest?.receiptNo) {
    const part = latest.receiptNo.slice(prefix.length);
    const n = parseInt(part, 10);
    if (!Number.isNaN(n)) next = n + 1;
  }
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export async function listPayments(filters: {
  projectId?: string;
  customerId?: string;
  dateFrom?: Date;
  dateTo?: Date;
} = {}) {
  return prisma.payment.findMany({
    where: {
      ...(filters.projectId ? { projectId: filters.projectId } : {}),
      ...(filters.customerId ? { customerId: filters.customerId } : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            paidAt: {
              ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
              ...(filters.dateTo ? { lte: filters.dateTo } : {}),
            },
          }
        : {}),
    },
    include: {
      project: { select: { id: true, code: true, title: true } },
      customer: { select: { id: true, fullName: true, email: true } },
      recordedBy: { select: { id: true, name: true } },
      quotation: { select: { id: true, totalAmount: true } },
    },
    orderBy: { paidAt: "desc" },
  });
}

export async function getPayment(id: string) {
  return prisma.payment.findUnique({
    where: { id },
    include: {
      project: {
        include: {
          quotation: true,
          customer: true,
        },
      },
      customer: true,
      quotation: { include: { lineItems: true } },
      recordedBy: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function recordPayment(data: RecordPaymentInput, userId: string) {
  const parsed = recordPaymentSchema.parse(data);

  const project = await prisma.project.findUnique({
    where: { id: parsed.projectId },
    include: {
      quotation: true,
      customer: { select: { id: true, userId: true, fullName: true } },
      payments: { select: { amount: true } },
    },
  });
  if (!project) throw new Error("Project not found");
  if (!project.quotation) {
    throw new Error("Project has no quotation — cannot record payment");
  }

  const quotationTotal = project.quotation.totalAmount;
  const paidSoFar = project.payments.reduce((s, p) => s + p.amount, 0);
  const remaining = quotationTotal - paidSoFar;

  if (parsed.amount > remaining + 1e-9) {
    throw new Error(
      `Payment exceeds remaining balance. Remaining: ${remaining.toFixed(2)}`
    );
  }

  const receiptNo = await generateReceiptNo();

  const payment = await prisma.payment.create({
    data: {
      projectId: project.id,
      customerId: project.customerId,
      quotationId: project.quotation.id,
      amount: parsed.amount,
      method: parsed.method ?? PaymentMethod.CASH,
      reference: parsed.reference ?? null,
      notes: parsed.notes ?? null,
      receiptNo,
      recordedById: userId,
    },
  });

  await audit(
    "CREATE",
    "Payment",
    payment.id,
    userId,
    `Payment ${receiptNo}: ${parsed.amount}`
  );

  const recipients: string[] = [];
  if (project.managerId) recipients.push(project.managerId);
  if (project.customer.userId) recipients.push(project.customer.userId);
  await notifyUsers(
    recipients,
    "Payment recorded",
    `Payment of ${parsed.amount} received for ${project.code} (${receiptNo})`,
    `/projects/${project.id}`
  );

  return payment;
}

export async function getPaymentReceiptData(id: string) {
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      customer: true,
      project: {
        include: {
          quotation: { include: { lineItems: true } },
          design: true,
        },
      },
      quotation: { include: { lineItems: true } },
      recordedBy: { select: { id: true, name: true } },
    },
  });
  if (!payment) throw new Error("Payment not found");

  const quotation = payment.quotation ?? payment.project.quotation;
  const allPayments = await prisma.payment.findMany({
    where: { projectId: payment.projectId },
    select: { amount: true },
  });
  const totalPaid = allPayments.reduce((s, p) => s + p.amount, 0);
  const quotationTotal = quotation?.totalAmount ?? 0;

  return {
    receiptNo: payment.receiptNo,
    paidAt: payment.paidAt,
    amount: payment.amount,
    method: payment.method,
    reference: payment.reference,
    notes: payment.notes,
    customer: {
      fullName: payment.customer.fullName,
      email: payment.customer.email,
      phone: payment.customer.phone,
      address: payment.customer.address,
      city: payment.customer.city,
    },
    project: {
      code: payment.project.code,
      title: payment.project.title,
    },
    quotation: quotation
      ? {
          id: quotation.id,
          subtotal: quotation.subtotal,
          taxAmount: quotation.taxAmount,
          otherCharges: quotation.otherCharges,
          totalAmount: quotation.totalAmount,
          lineItems: quotation.lineItems,
        }
      : null,
    design: payment.project.design
      ? {
          capacityKw: payment.project.design.capacityKw,
          panelCount: payment.project.design.panelCount,
        }
      : null,
    recordedBy: payment.recordedBy.name,
    summary: {
      quotationTotal,
      totalPaid,
      balance: quotationTotal - totalPaid,
    },
  };
}
