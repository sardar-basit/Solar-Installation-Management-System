import Link from "next/link";
import { MaintenanceStatus } from "@prisma/client";
import { requireSession } from "@/lib/session";
import { can } from "@/lib/rbac";
import { listRequests } from "@/lib/services/maintenance";
import { formatDate } from "@/lib/utils";
import { PageHeader, EmptyState, Badge } from "@/components/ui/card";
import { LinkButton, statusBadgeClass } from "@/components/ui/link-button";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requireSession();
  const { status } = await searchParams;
  const requests = await listRequests({
    status:
      status && Object.values(MaintenanceStatus).includes(status as MaintenanceStatus)
        ? (status as MaintenanceStatus)
        : undefined,
  });
  const canCreate = can(session.user.role, "maintenance_request");

  return (
    <div>
      <PageHeader
        title="Maintenance"
        description="Service and support requests"
        actions={
          canCreate ? (
            <LinkButton href="/dashboard/maintenance/new">New request</LinkButton>
          ) : null
        }
      />

      <form className="mb-4 flex gap-2">
        <Select name="status" defaultValue={status ?? ""} className="max-w-[200px]">
          <option value="">All statuses</option>
          {Object.values(MaintenanceStatus).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>

      {requests.length === 0 ? (
        <EmptyState message="No maintenance requests." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="data">
            <thead>
              <tr>
                <th>Title</th>
                <th>Project</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Assignee</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link
                      href={`/dashboard/maintenance/${r.id}`}
                      className="font-medium text-sky-700 hover:underline"
                    >
                      {r.title}
                    </Link>
                  </td>
                  <td>{r.project.code}</td>
                  <td>{r.customer.fullName}</td>
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
