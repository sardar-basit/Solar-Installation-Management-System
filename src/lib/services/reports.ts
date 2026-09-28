import { prisma } from "@/lib/prisma";

export type ReportDateRange = {
  dateFrom?: Date | string | null;
  dateTo?: Date | string | null;
};

function toDate(value?: Date | string | null): Date | undefined {
  if (!value) return undefined;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function dateFilter(
  field: string,
  range: ReportDateRange
): Record<string, { gte?: Date; lte?: Date }> | undefined {
  const from = toDate(range.dateFrom);
  const to = toDate(range.dateTo);
  if (!from && !to) return undefined;
  return {
    [field]: {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    },
  };
}

export async function getCustomerReport(range: ReportDateRange = {}) {
  const customers = await prisma.customer.findMany({
    where: dateFilter("createdAt", range),
    include: {
      user: { select: { username: true } },
      _count: { select: { projects: true, payments: true, maintenanceRequests: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return customers.map((c) => ({
    id: c.id,
    fullName: c.fullName,
    email: c.email,
    phone: c.phone,
    city: c.city,
    siteAddress: c.siteAddress,
    siteCity: c.siteCity,
    archived: c.archived,
    portalUsername: c.user?.username ?? null,
    projectCount: c._count.projects,
    paymentCount: c._count.payments,
    maintenanceCount: c._count.maintenanceRequests,
    createdAt: c.createdAt,
  }));
}

export async function getProjectReport(range: ReportDateRange = {}) {
  const projects = await prisma.project.findMany({
    where: dateFilter("createdAt", range),
    include: {
      customer: { select: { fullName: true, email: true } },
      manager: { select: { name: true } },
      design: { select: { capacityKw: true } },
      quotation: { select: { totalAmount: true, status: true } },
      installation: { select: { progressPercent: true, verifiedAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return projects.map((p) => ({
    id: p.id,
    code: p.code,
    title: p.title,
    status: p.status,
    customerName: p.customer.fullName,
    customerEmail: p.customer.email,
    managerName: p.manager?.name ?? null,
    capacityKw: p.design?.capacityKw ?? null,
    quotationTotal: p.quotation?.totalAmount ?? null,
    quotationStatus: p.quotation?.status ?? null,
    installProgress: p.installation?.progressPercent ?? null,
    verified: Boolean(p.installation?.verifiedAt),
    scheduledDate: p.scheduledDate,
    completedAt: p.completedAt,
    archived: p.archived,
    createdAt: p.createdAt,
  }));
}

export async function getInstallationReport(range: ReportDateRange = {}) {
  const installations = await prisma.installation.findMany({
    where: dateFilter("createdAt", range),
    include: {
      project: {
        select: {
          code: true,
          title: true,
          status: true,
          customer: { select: { fullName: true } },
        },
      },
      technician: { select: { name: true } },
      verifiedBy: { select: { name: true } },
      _count: { select: { photos: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return installations.map((i) => ({
    id: i.id,
    projectCode: i.project.code,
    projectTitle: i.project.title,
    projectStatus: i.project.status,
    customerName: i.project.customer.fullName,
    technicianName: i.technician?.name ?? null,
    progressPercent: i.progressPercent,
    startedAt: i.startedAt,
    completedAt: i.completedAt,
    verifiedAt: i.verifiedAt,
    verifiedBy: i.verifiedBy?.name ?? null,
    photoCount: i._count.photos,
    createdAt: i.createdAt,
  }));
}

export async function getQuotationReport(range: ReportDateRange = {}) {
  const quotations = await prisma.quotation.findMany({
    where: dateFilter("createdAt", range),
    include: {
      project: {
        select: {
          code: true,
          title: true,
          customer: { select: { fullName: true } },
        },
      },
      design: { select: { capacityKw: true } },
      createdBy: { select: { name: true } },
      _count: { select: { lineItems: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return quotations.map((q) => ({
    id: q.id,
    projectCode: q.project.code,
    projectTitle: q.project.title,
    customerName: q.project.customer.fullName,
    status: q.status,
    capacityKw: q.design.capacityKw,
    subtotal: q.subtotal,
    taxAmount: q.taxAmount,
    otherCharges: q.otherCharges,
    totalAmount: q.totalAmount,
    lineItemCount: q._count.lineItems,
    createdBy: q.createdBy.name,
    approvedAt: q.approvedAt,
    validUntil: q.validUntil,
    createdAt: q.createdAt,
  }));
}

export async function getPaymentReport(range: ReportDateRange = {}) {
  const payments = await prisma.payment.findMany({
    where: dateFilter("paidAt", range),
    include: {
      project: { select: { code: true, title: true } },
      customer: { select: { fullName: true, email: true } },
      recordedBy: { select: { name: true } },
    },
    orderBy: { paidAt: "desc" },
  });

  return payments.map((p) => ({
    id: p.id,
    receiptNo: p.receiptNo,
    amount: p.amount,
    method: p.method,
    reference: p.reference,
    projectCode: p.project.code,
    projectTitle: p.project.title,
    customerName: p.customer.fullName,
    customerEmail: p.customer.email,
    recordedBy: p.recordedBy.name,
    paidAt: p.paidAt,
    notes: p.notes,
  }));
}

export async function getInventoryReport(range: ReportDateRange = {}) {
  const items = await prisma.inventoryItem.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  const movements = await prisma.stockMovement.findMany({
    where: dateFilter("createdAt", range),
    include: {
      item: { select: { sku: true, name: true } },
      user: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const issues = await prisma.inventoryIssue.findMany({
    where: dateFilter("issuedAt", range),
    include: {
      item: { select: { sku: true, name: true } },
      project: { select: { code: true } },
    },
    orderBy: { issuedAt: "desc" },
  });

  return {
    items: items.map((i) => ({
      id: i.id,
      sku: i.sku,
      name: i.name,
      category: i.category,
      quantity: i.quantity,
      minLevel: i.minLevel,
      belowMin: i.quantity <= i.minLevel,
      unitCost: i.unitCost,
      unit: i.unit,
      stockValue: i.quantity * i.unitCost,
      active: i.active,
    })),
    movements: movements.map((m) => ({
      id: m.id,
      sku: m.item.sku,
      itemName: m.item.name,
      type: m.type,
      quantity: m.quantity,
      note: m.note,
      userName: m.user?.name ?? null,
      createdAt: m.createdAt,
    })),
    issues: issues.map((iss) => ({
      id: iss.id,
      sku: iss.item.sku,
      itemName: iss.item.name,
      projectCode: iss.project.code,
      quantity: iss.quantity,
      note: iss.note,
      issuedAt: iss.issuedAt,
    })),
  };
}

export async function getMaintenanceReport(range: ReportDateRange = {}) {
  const requests = await prisma.maintenanceRequest.findMany({
    where: dateFilter("createdAt", range),
    include: {
      project: { select: { code: true, title: true } },
      customer: { select: { fullName: true } },
      assignee: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return requests.map((r) => ({
    id: r.id,
    title: r.title,
    status: r.status,
    priority: r.priority,
    projectCode: r.project.code,
    projectTitle: r.project.title,
    customerName: r.customer.fullName,
    assigneeName: r.assignee?.name ?? null,
    createdBy: r.createdBy.name,
    resolution: r.resolution,
    createdAt: r.createdAt,
    resolvedAt: r.resolvedAt,
  }));
}
