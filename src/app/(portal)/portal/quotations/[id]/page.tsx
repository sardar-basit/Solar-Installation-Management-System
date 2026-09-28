import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { requireRoles } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { requirePortalCustomer } from "@/lib/portal";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from "@/components/ui/card";
import { LinkButton, statusBadgeClass } from "@/components/ui/link-button";
import { QuotationStatusButtons } from "@/components/forms/quotation-status-buttons";

export default async function PortalQuotationDetailPage({
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
      lineItems: { orderBy: { category: "asc" } },
    },
  });
  if (!quotation) notFound();

  const canApprove =
    quotation.status === "SENT" || quotation.status === "DRAFT";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Quotation — ${quotation.project.code}`}
        description={formatCurrency(quotation.totalAmount)}
        actions={
          <div className="flex gap-2">
            <Badge className={statusBadgeClass(quotation.status)}>
              {quotation.status}
            </Badge>
            <LinkButton
              href={`/portal/quotations/${id}/print`}
              size="sm"
              variant="outline"
            >
              Print
            </LinkButton>
          </div>
        }
      />

      {canApprove ? (
        <Card>
          <CardHeader>
            <CardTitle>Approve or reject</CardTitle>
          </CardHeader>
          <CardContent>
            <QuotationStatusButtons
              quotationId={id}
              currentStatus={quotation.status}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Line items</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="data">
            <thead>
              <tr>
                <th>Category</th>
                <th>Description</th>
                <th>Qty</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {quotation.lineItems.map((line) => (
                <tr key={line.id}>
                  <td>{line.category}</td>
                  <td>{line.description}</td>
                  <td>{line.quantity}</td>
                  <td>{formatCurrency(line.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex justify-end text-sm font-semibold">
            Total: {formatCurrency(quotation.totalAmount)}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Issued {formatDate(quotation.createdAt)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
