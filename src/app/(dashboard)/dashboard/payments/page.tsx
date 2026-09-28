import Link from "next/link";
import { requireSession } from "@/lib/session";
import { can } from "@/lib/rbac";
import { listPayments } from "@/lib/services/payments";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PageHeader, EmptyState } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";

export default async function PaymentsPage() {
  const session = await requireSession();
  const payments = await listPayments();
  const canWrite = can(session.user.role, "payments_write");

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Recorded customer payments and receipts"
        actions={
          canWrite ? (
            <LinkButton href="/dashboard/payments/new">Record payment</LinkButton>
          ) : null
        }
      />
      {payments.length === 0 ? (
        <EmptyState message="No payments recorded." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="data">
            <thead>
              <tr>
                <th>Receipt</th>
                <th>Customer</th>
                <th>Project</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link
                      href={`/dashboard/payments/${p.id}`}
                      className="font-medium text-sky-700 hover:underline"
                    >
                      {p.receiptNo}
                    </Link>
                  </td>
                  <td>{p.customer.fullName}</td>
                  <td>{p.project.code}</td>
                  <td>{formatCurrency(p.amount)}</td>
                  <td>{p.method}</td>
                  <td>{formatDate(p.paidAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
