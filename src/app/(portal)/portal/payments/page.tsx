import Link from "next/link";
import { Role } from "@prisma/client";
import { requireRoles } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { requirePortalCustomer } from "@/lib/portal";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PageHeader, EmptyState } from "@/components/ui/card";

export default async function PortalPaymentsPage() {
  const session = await requireRoles([Role.CUSTOMER, Role.ADMIN]);
  const customer = await requirePortalCustomer(session.user.id);
  const payments = await prisma.payment.findMany({
    where: { customerId: customer.id },
    include: { project: { select: { code: true, title: true } } },
    orderBy: { paidAt: "desc" },
  });

  return (
    <div>
      <PageHeader title="Payments" description="Your payment history and receipts" />
      {payments.length === 0 ? (
        <EmptyState message="No payments recorded yet." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="data">
            <thead>
              <tr>
                <th>Receipt</th>
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
                      href={`/portal/payments/${p.id}/print`}
                      className="font-medium text-sky-700 hover:underline"
                    >
                      {p.receiptNo}
                    </Link>
                  </td>
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
