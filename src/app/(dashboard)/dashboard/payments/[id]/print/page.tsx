import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { getPaymentReceiptData } from "@/lib/services/payments";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PrintButton } from "@/components/forms/print-button";
import { LinkButton } from "@/components/ui/link-button";

export default async function PaymentPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  let receipt;
  try {
    receipt = await getPaymentReceiptData(id);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl bg-white p-8 print:p-0">
      <div className="mb-6 flex items-start justify-between print:hidden">
        <LinkButton href={`/dashboard/payments/${id}`} variant="outline" size="sm">
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

      <section className="mb-6 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <h2 className="font-semibold">Received from</h2>
          <p>{receipt.customer.fullName}</p>
          <p>{receipt.customer.email}</p>
          <p>{receipt.customer.phone}</p>
        </div>
        <div>
          <h2 className="font-semibold">For project</h2>
          <p>
            {receipt.project.code} — {receipt.project.title}
          </p>
          {receipt.design ? (
            <p>
              {receipt.design.capacityKw} kW · {receipt.design.panelCount} panels
            </p>
          ) : null}
        </div>
      </section>

      <div className="mb-6 rounded-md border border-slate-200 p-4 text-center">
        <div className="text-sm text-slate-500">Amount received</div>
        <div className="text-3xl font-semibold text-slate-900">
          {formatCurrency(receipt.amount)}
        </div>
        <div className="mt-1 text-sm text-slate-600">
          via {receipt.method.replaceAll("_", " ")}
          {receipt.reference ? ` · Ref ${receipt.reference}` : ""}
        </div>
      </div>

      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Quotation total</span>
          <span>{formatCurrency(receipt.summary.quotationTotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>Total paid</span>
          <span>{formatCurrency(receipt.summary.totalPaid)}</span>
        </div>
        <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold">
          <span>Balance</span>
          <span>{formatCurrency(receipt.summary.balance)}</span>
        </div>
      </div>

      <p className="mt-8 text-xs text-slate-500">
        Recorded by {receipt.recordedBy}
      </p>
    </div>
  );
}
