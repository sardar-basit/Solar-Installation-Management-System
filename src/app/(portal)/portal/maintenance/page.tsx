import { Role } from "@prisma/client";
import { requireRoles } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { requirePortalCustomer } from "@/lib/portal";
import { formatDate } from "@/lib/utils";
import { PageHeader, EmptyState, Badge } from "@/components/ui/card";
import { LinkButton, statusBadgeClass } from "@/components/ui/link-button";

export default async function PortalMaintenancePage() {
  const session = await requireRoles([Role.CUSTOMER, Role.ADMIN]);
  const customer = await requirePortalCustomer(session.user.id);
  const requests = await prisma.maintenanceRequest.findMany({
    where: { customerId: customer.id },
    include: {
      project: { select: { code: true } },
      assignee: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Maintenance"
        description="Your service requests"
        actions={
          <LinkButton href="/portal/maintenance/new">New request</LinkButton>
        }
      />
      {requests.length === 0 ? (
        <EmptyState message="No maintenance requests yet." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="data">
            <thead>
              <tr>
                <th>Title</th>
                <th>Project</th>
                <th>Status</th>
                <th>Assignee</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td className="font-medium">{r.title}</td>
                  <td>{r.project.code}</td>
                  <td>
                    <Badge className={statusBadgeClass(r.status)}>{r.status}</Badge>
                  </td>
                  <td>{r.assignee?.name ?? "—"}</td>
                  <td>{formatDate(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
