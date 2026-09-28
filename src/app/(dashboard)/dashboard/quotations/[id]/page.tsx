import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { can } from "@/lib/rbac";
import { getQuotation } from "@/lib/services/quotations";
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

export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const quotation = await getQuotation(id);
  if (!quotation) notFound();

  const canApprove =
    can(session.user.role, "quotations_approve") ||
    can(session.user.role, "quotations_write");

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Quotation — ${quotation.project.code}`}
        description={`${quotation.project.customer.fullName} · ${formatCurrency(quotation.totalAmount)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Badge className={statusBadgeClass(quotation.status)}>
              {quotation.status}
            </Badge>
            <LinkButton
              href={`/dashboard/quotations/${id}/print`}
              variant="outline"
              size="sm"
            >
              Print / PDF
            </LinkButton>
          </div>
        }
      />

      {canApprove ? (
        <Card>
          <CardHeader>
            <CardTitle>Status actions</CardTitle>
          </CardHeader>
          <CardContent>
            <QuotationStatusButtons
              quotationId={id}
              currentStatus={quotation.status}
            />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
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
                  <th>Unit</th>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Totals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span>{formatCurrency(quotation.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tax</span>
              <span>{formatCurrency(quotation.taxAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Other</span>
              <span>{formatCurrency(quotation.otherCharges)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2 font-semibold">
              <span>Total</span>
              <span>{formatCurrency(quotation.totalAmount)}</span>
            </div>
            <p className="pt-2 text-slate-500">
              Created {formatDate(quotation.createdAt)} by {quotation.createdBy.name}
            </p>
            <p>
              <Link
                href={`/dashboard/projects/${quotation.projectId}`}
                className="text-sky-700 hover:underline"
              >
                View project
              </Link>
            </p>
            {quotation.notes ? (
              <p className="pt-2 text-slate-600">{quotation.notes}</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
