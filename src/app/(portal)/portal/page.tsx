import Link from "next/link";
import { requireRoles } from "@/lib/session";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PROJECT_STATUS_LABELS } from "@/lib/rbac";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  EmptyState,
} from "@/components/ui/card";
import { LinkButton, statusBadgeClass } from "@/components/ui/link-button";
import { listForUser, unreadCount } from "@/lib/services/notifications-service";

export default async function PortalHomePage() {
  const session = await requireRoles([Role.CUSTOMER, Role.ADMIN]);
  const customer = await prisma.customer.findUnique({
    where: { userId: session.user.id },
  });
  if (!customer) {
    return (
      <div>
        <PageHeader title="Customer portal" />
        <EmptyState message="No customer profile is linked to this account." />
      </div>
    );
  }

  const [projects, payments, openMaintenance, unread, notifications] =
    await Promise.all([
      prisma.project.findMany({
        where: { customerId: customer.id, archived: false },
        include: {
          quotation: { select: { id: true, status: true, totalAmount: true } },
          installation: { select: { progressPercent: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
      prisma.payment.findMany({
        where: { customerId: customer.id },
        orderBy: { paidAt: "desc" },
        take: 5,
      }),
      prisma.maintenanceRequest.count({
        where: {
          customerId: customer.id,
          status: { in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] },
        },
      }),
      unreadCount(session.user.id),
      listForUser(session.user.id),
    ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${customer.fullName}`}
        description="Track your solar projects, quotations, and support requests"
        actions={
          <LinkButton href="/portal/maintenance/new" size="sm">
            Request maintenance
          </LinkButton>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-slate-500">Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{projects.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-slate-500">Open maintenance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{openMaintenance}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-slate-500">Unread alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{unread}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your projects</CardTitle>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <p className="text-sm text-slate-500">No projects yet.</p>
          ) : (
            <table className="data">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Status</th>
                  <th>Quote</th>
                  <th>Install</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link
                        href={`/portal/projects/${p.id}`}
                        className="text-sky-700 hover:underline"
                      >
                        {p.code}
                      </Link>
                    </td>
                    <td>
                      <Badge className={statusBadgeClass(p.status)}>
                        {PROJECT_STATUS_LABELS[p.status]}
                      </Badge>
                    </td>
                    <td>
                      {p.quotation
                        ? formatCurrency(p.quotation.totalAmount)
                        : "—"}
                    </td>
                    <td>
                      {p.installation
                        ? `${p.installation.progressPercent}%`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent payments</CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <p className="text-sm text-slate-500">No payments yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {payments.map((p) => (
                  <li key={p.id} className="flex justify-between">
                    <span>{p.receiptNo}</span>
                    <span>
                      {formatCurrency(p.amount)} · {formatDate(p.paidAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Latest notifications</CardTitle>
          </CardHeader>
          <CardContent>
            {notifications.slice(0, 5).length === 0 ? (
              <p className="text-sm text-slate-500">No notifications.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {notifications.slice(0, 5).map((n) => (
                  <li key={n.id}>
                    <span className={n.read ? "text-slate-500" : "font-medium"}>
                      {n.title}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/portal/notifications"
              className="mt-3 inline-block text-sm text-sky-700 hover:underline"
            >
              View all
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
