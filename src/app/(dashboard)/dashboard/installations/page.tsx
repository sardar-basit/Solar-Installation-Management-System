import Link from "next/link";
import { Role } from "@prisma/client";
import { requireSession } from "@/lib/session";
import {
  getMyInstallations,
  listInstallations,
} from "@/lib/services/installations";
import { formatDate } from "@/lib/utils";
import { PageHeader, EmptyState, Badge } from "@/components/ui/card";
import { statusBadgeClass } from "@/components/ui/link-button";
import { PROJECT_STATUS_LABELS } from "@/lib/rbac";

export default async function InstallationsPage() {
  const session = await requireSession();
  const isTech = session.user.role === Role.INSTALLATION_TECH;
  const installations = isTech
    ? await getMyInstallations(session.user.id)
    : await listInstallations();

  return (
    <div>
      <PageHeader
        title="Installations"
        description="Field progress and verification"
      />
      {installations.length === 0 ? (
        <EmptyState message="No installations yet. Assign a technician on a project to create one." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="data">
            <thead>
              <tr>
                <th>Project</th>
                <th>Customer</th>
                {!isTech ? <th>Technician</th> : null}
                <th>Progress</th>
                <th>Status</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {installations.map((i) => (
                <tr key={i.id}>
                  <td>
                    <Link
                      href={`/dashboard/installations/${i.id}`}
                      className="font-medium text-sky-700 hover:underline"
                    >
                      {i.project.code}
                    </Link>
                    <div className="text-slate-500">{i.project.title}</div>
                  </td>
                  <td>{i.project.customer.fullName}</td>
                  {!isTech && "technician" in i ? (
                    <td>
                      {(i as { technician?: { name: string } | null }).technician
                        ?.name ?? "—"}
                    </td>
                  ) : null}
                  <td>{i.progressPercent}%</td>
                  <td>
                    <Badge className={statusBadgeClass(i.project.status)}>
                      {PROJECT_STATUS_LABELS[i.project.status]}
                    </Badge>
                  </td>
                  <td>{formatDate(i.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
