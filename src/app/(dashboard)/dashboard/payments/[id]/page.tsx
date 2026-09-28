import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { getPayment, getPaymentReceiptData } from "@/lib/services/payments";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";

export default async function PaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const payment = await getPayment(id);
  if (!payment) notFound();
  const receipt = await getPaymentReceiptData(id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={payment.receiptNo}
        description={`${formatCurrency(payment.amount)} · ${formatDate(payment.paidAt)}`}
        actions={
          <LinkButton href={`/dashboard/payments/${id}/print`} variant="outline">
            Print receipt
          </LinkButton>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Payment details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-slate-500">Customer:</span>{" "}
              <Link
                href={`/dashboard/customers/${payment.customerId}`}
                className="text-sky-700 hover:underline"
              >
                {payment.customer.fullName}
              </Link>
            </p>
            <p>
              <span className="text-slate-500">Project:</span>{" "}
              <Link
                href={`/dashboard/projects/${payment.projectId}`}
                className="text-sky-700 hover:underline"
              >
                {payment.project.code}
              </Link>
            </p>
            <p>
              <span className="text-slate-500">Method:</span> {payment.method}
            </p>
            {payment.reference ? (
              <p>
                <span className="text-slate-500">Reference:</span>{" "}
                {payment.reference}
              </p>
            ) : null}
            <p>
              <span className="text-slate-500">Recorded by:</span>{" "}
              {payment.recordedBy.name}
            </p>
            {payment.notes ? (
              <p>
                <span className="text-slate-500">Notes:</span> {payment.notes}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Balance summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Quotation total</span>
              <span>{formatCurrency(receipt.summary.quotationTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total paid</span>
              <span>{formatCurrency(receipt.summary.totalPaid)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2 font-semibold">
              <span>Balance</span>
              <span>{formatCurrency(receipt.summary.balance)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
