import Link from "next/link";
import { Role } from "@prisma/client";
import { requireRoles } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { requirePortalCustomer } from "@/lib/portal";
import { PROJECT_STATUS_LABELS } from "@/lib/rbac";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PageHeader, EmptyState, Badge } from "@/components/ui/card";
import { statusBadgeClass } from "@/components/ui/link-button";

export default async function PortalProjectsPage() {
  const session = await requireRoles([Role.CUSTOMER, Role.ADMIN]);
  const customer = await requirePortalCustomer(session.user.id);
  const projects = await prisma.project.findMany({
    where: { customerId: customer.id },
    include: {
      quotation: { select: { totalAmount: true, status: true } },
      installation: { select: { progressPercent: true } },
      design: { select: { capacityKw: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader title="My projects" description="Your solar installation projects" />
      {projects.length === 0 ? (
        <EmptyState message="You have no projects yet." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="data">
            <thead>
              <tr>
                <th>Code</th>
                <th>Title</th>
                <th>Status</th>
                <th>Capacity</th>
                <th>Quotation</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link
                      href={`/portal/projects/${p.id}`}
                      className="font-medium text-sky-700 hover:underline"
                    >
                      {p.code}
                    </Link>
                  </td>
                  <td>{p.title}</td>
                  <td>
                    <Badge className={statusBadgeClass(p.status)}>
                      {PROJECT_STATUS_LABELS[p.status]}
                    </Badge>
                  </td>
                  <td>{p.design ? `${p.design.capacityKw} kW` : "—"}</td>
                  <td>
                    {p.quotation
                      ? formatCurrency(p.quotation.totalAmount)
                      : "—"}
                  </td>
                  <td>{formatDate(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
