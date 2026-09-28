import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { requireRoles } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { requirePortalCustomer } from "@/lib/portal";
import { getPaymentReceiptData } from "@/lib/services/payments";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PrintButton } from "@/components/forms/print-button";
import { LinkButton } from "@/components/ui/link-button";

export default async function PortalPaymentPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRoles([Role.CUSTOMER, Role.ADMIN]);
  const customer = await requirePortalCustomer(session.user.id);
  const { id } = await params;

  const owned = await prisma.payment.findFirst({
    where: { id, customerId: customer.id },
    select: { id: true },
  });
  if (!owned) notFound();

  const receipt = await getPaymentReceiptData(id);

  return (
    <div className="mx-auto max-w-2xl bg-white p-8 print:p-0">
      <div className="mb-6 flex justify-between print:hidden">
        <LinkButton href="/portal/payments" variant="outline" size="sm">
          Back
        </LinkButton>
        <PrintButton />
      </div>
      <header className="mb-8 border-b border-slate-200 pb-6 text-center">
        <div className="text-2xl font-semibold text-sky-800">SIMS</div>
        <div className="text-sm text-slate-500">Payment Receipt</div>
        <h1 className="mt-4 text-xl font-semibold">{receipt.receiptNo}</h1>
        <p className="text-sm text-slate-600">{formatDate(receipt.paidAt)}</p>
      </header>
      <div className="mb-6 rounded-md border border-slate-200 p-4 text-center">
        <div className="text-sm text-slate-500">Amount received</div>
        <div className="text-3xl font-semibold">{formatCurrency(receipt.amount)}</div>
      </div>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Project</span>
          <span>
            {receipt.project.code} — {receipt.project.title}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Balance</span>
          <span>{formatCurrency(receipt.summary.balance)}</span>
        </div>
      </div>
    </div>
  );
}
