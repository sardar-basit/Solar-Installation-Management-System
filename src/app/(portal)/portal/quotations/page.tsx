import Link from "next/link";
import { Role } from "@prisma/client";
import { requireRoles } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { requirePortalCustomer } from "@/lib/portal";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PageHeader, EmptyState, Badge } from "@/components/ui/card";
import { statusBadgeClass } from "@/components/ui/link-button";

export default async function PortalQuotationsListPage() {
  const session = await requireRoles([Role.CUSTOMER, Role.ADMIN]);
  const customer = await requirePortalCustomer(session.user.id);
  const quotations = await prisma.quotation.findMany({
    where: { project: { customerId: customer.id } },
    include: {
      project: { select: { id: true, code: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader title="Quotations" description="Review and approve quotations" />
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
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {quotations.map((q) => (
                <tr key={q.id}>
                  <td>
                    <Link
                      href={`/portal/quotations/${q.id}`}
                      className="font-medium text-sky-700 hover:underline"
                    >
                      {q.project.code}
                    </Link>
                  </td>
                  <td>
                    <Badge className={statusBadgeClass(q.status)}>{q.status}</Badge>
                  </td>
                  <td>{formatCurrency(q.totalAmount)}</td>
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
