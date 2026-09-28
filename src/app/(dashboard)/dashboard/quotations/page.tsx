import Link from "next/link";
import { requireSession } from "@/lib/session";
import { can } from "@/lib/rbac";
import { listQuotations } from "@/lib/services/quotations";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PageHeader, EmptyState, Badge } from "@/components/ui/card";
import { LinkButton, statusBadgeClass } from "@/components/ui/link-button";

export default async function QuotationsPage() {
  const session = await requireSession();
  const quotations = await listQuotations();
  const canWrite = can(session.user.role, "quotations_write");

  return (
    <div>
      <PageHeader
        title="Quotations"
        description="Customer quotations and approvals"
        actions={
          canWrite ? (
            <LinkButton href="/dashboard/quotations/new">New quotation</LinkButton>
          ) : null
        }
      />
      {quotations.length === 0 ? (
        <EmptyState message="No quotations yet." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="data">
            <thead>
              <tr>
                <th>Project</th>
                <th>Status</th>
                <th>Total</th>
                <th>Created by</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {quotations.map((q) => (
                <tr key={q.id}>
                  <td>
                    <Link
                      href={`/dashboard/quotations/${q.id}`}
                      className="font-medium text-sky-700 hover:underline"
                    >
                      {q.project.code}
                    </Link>
                  </td>
                  <td>
                    <Badge className={statusBadgeClass(q.status)}>{q.status}</Badge>
                  </td>
                  <td>{formatCurrency(q.totalAmount)}</td>
                  <td>{q.createdBy.name}</td>
                  <td>{formatDate(q.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
