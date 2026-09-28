import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { requireRoles } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { requirePortalCustomer } from "@/lib/portal";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PrintButton } from "@/components/forms/print-button";
import { LinkButton } from "@/components/ui/link-button";

export default async function PortalQuotationPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRoles([Role.CUSTOMER, Role.ADMIN]);
  const customer = await requirePortalCustomer(session.user.id);
  const { id } = await params;

  const quotation = await prisma.quotation.findFirst({
    where: { id, project: { customerId: customer.id } },
    include: {
      project: { include: { customer: true } },
      design: true,
      lineItems: true,
    },
  });
  if (!quotation) notFound();

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 print:p-0">
      <div className="mb-6 flex justify-between print:hidden">
        <LinkButton href={`/portal/quotations/${id}`} variant="outline" size="sm">
          Back
        </LinkButton>
        <PrintButton />
      </div>
      <header className="mb-8 border-b border-slate-200 pb-6">
        <div className="text-2xl font-semibold text-sky-800">SIMS</div>
        <h1 className="mt-4 text-xl font-semibold">Quotation</h1>
        <p className="text-sm text-slate-600">
          {quotation.project.code} · {formatDate(quotation.createdAt)}
        </p>
      </header>
      <p className="mb-4 text-sm">
        Prepared for {quotation.project.customer.fullName}
      </p>
      <table className="data mb-6">
        <thead>
          <tr>
            <th>Description</th>
            <th>Qty</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {quotation.lineItems.map((line) => (
            <tr key={line.id}>
              <td>
                {line.category}: {line.description}
              </td>
              <td>{line.quantity}</td>
              <td>{formatCurrency(line.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-right text-lg font-semibold">
        Total: {formatCurrency(quotation.totalAmount)}
      </div>
    </div>
  );
}
