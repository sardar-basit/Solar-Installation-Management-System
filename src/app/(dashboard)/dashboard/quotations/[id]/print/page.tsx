import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { getQuotation } from "@/lib/services/quotations";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PrintButton } from "@/components/forms/print-button";
import { LinkButton } from "@/components/ui/link-button";

export default async function QuotationPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const quotation = await getQuotation(id);
  if (!quotation) notFound();

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 print:p-0">
      <div className="mb-6 flex items-start justify-between print:hidden">
        <LinkButton href={`/dashboard/quotations/${id}`} variant="outline" size="sm">
          Back
        </LinkButton>
        <PrintButton />
      </div>

      <header className="mb-8 border-b border-slate-200 pb-6">
        <div className="text-2xl font-semibold text-sky-800">SIMS</div>
        <div className="text-sm text-slate-500">Solar Installation Management System</div>
        <h1 className="mt-4 text-xl font-semibold">Quotation</h1>
        <p className="text-sm text-slate-600">
          {quotation.project.code} · {formatDate(quotation.createdAt)} · Status:{" "}
          {quotation.status}
        </p>
      </header>

      <section className="mb-6 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <h2 className="font-semibold text-slate-900">Customer</h2>
          <p>{quotation.project.customer.fullName}</p>
          <p>{quotation.project.customer.email}</p>
          <p>{quotation.project.customer.phone}</p>
          <p>
            {quotation.project.customer.address}
            {quotation.project.customer.city
              ? `, ${quotation.project.customer.city}`
              : ""}
          </p>
        </div>
        <div>
          <h2 className="font-semibold text-slate-900">Project / design</h2>
          <p>{quotation.project.title}</p>
          {quotation.design ? (
            <p>
              {quotation.design.capacityKw} kW · {quotation.design.panelCount} panels
            </p>
          ) : null}
          <p>Site: {quotation.project.customer.siteAddress}</p>
        </div>
      </section>

      <table className="data mb-6">
        <thead>
          <tr>
            <th>Category</th>
            <th>Description</th>
            <th>Qty</th>
            <th>Unit price</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {quotation.lineItems.map((line) => (
            <tr key={line.id}>
              <td>{line.category}</td>
              <td>{line.description}</td>
              <td>{line.quantity}</td>
              <td>{formatCurrency(line.unitPrice)}</td>
              <td>{formatCurrency(line.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ml-auto max-w-xs space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatCurrency(quotation.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>Tax</span>
          <span>{formatCurrency(quotation.taxAmount)}</span>
        </div>
        <div className="flex justify-between">
          <span>Other charges</span>
          <span>{formatCurrency(quotation.otherCharges)}</span>
        </div>
        <div className="flex justify-between border-t border-slate-300 pt-2 text-base font-semibold">
          <span>Total</span>
          <span>{formatCurrency(quotation.totalAmount)}</span>
        </div>
      </div>

      {quotation.notes ? (
        <p className="mt-8 text-sm text-slate-600">Notes: {quotation.notes}</p>
      ) : null}
    </div>
  );
}
