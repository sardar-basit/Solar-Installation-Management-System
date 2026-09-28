import Link from "next/link";
import { requireSession } from "@/lib/session";
import { can } from "@/lib/rbac";
import { listDesigns } from "@/lib/services/designs";
import { formatDate } from "@/lib/utils";
import { PageHeader, EmptyState } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";

export default async function DesignsPage() {
  const session = await requireSession();
  const designs = await listDesigns();
  const canWrite = can(session.user.role, "designs_write");

  return (
    <div>
      <PageHeader
        title="System designs"
        description="Capacity and component designs"
        actions={
          canWrite ? (
            <LinkButton href="/dashboard/designs/new">New design</LinkButton>
          ) : null
        }
      />
      {designs.length === 0 ? (
        <EmptyState message="No designs yet." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="data">
            <thead>
              <tr>
                <th>Project</th>
                <th>Capacity</th>
                <th>Panels</th>
                <th>Designer</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {designs.map((d) => (
                <tr key={d.id}>
                  <td>
                    <Link
                      href={`/dashboard/designs/${d.id}`}
                      className="font-medium text-sky-700 hover:underline"
                    >
                      {d.project.code}
                    </Link>
                  </td>
                  <td>{d.capacityKw} kW</td>
                  <td>{d.panelCount}</td>
                  <td>{d.designer.name}</td>
                  <td>{formatDate(d.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
