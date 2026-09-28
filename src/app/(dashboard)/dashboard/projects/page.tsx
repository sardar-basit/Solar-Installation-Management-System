import Link from "next/link";
import { ProjectStatus } from "@prisma/client";
import { requireSession } from "@/lib/session";
import { can, PROJECT_STATUS_LABELS } from "@/lib/rbac";
import { listProjects } from "@/lib/services/projects";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PageHeader, EmptyState, Badge } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LinkButton, statusBadgeClass } from "@/components/ui/link-button";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await requireSession();
  const { q, status } = await searchParams;
  const projects = await listProjects({
    search: q,
    status: status && status in ProjectStatus ? (status as ProjectStatus) : undefined,
  });
  const canWrite = can(session.user.role, "projects_write");

  return (
    <div>
      <PageHeader
        title="Projects"
        description="End-to-end solar installation projects"
        actions={
          canWrite ? (
            <LinkButton href="/dashboard/projects/new">New project</LinkButton>
          ) : null
        }
      />

      <form className="mb-4 flex flex-wrap gap-2">
        <Input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search code, title, customer…"
          className="max-w-xs"
        />
        <Select name="status" defaultValue={status ?? ""} className="max-w-[200px]">
          <option value="">All statuses</option>
          {Object.values(ProjectStatus).map((s) => (
            <option key={s} value={s}>
              {PROJECT_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>

      {projects.length === 0 ? (
        <EmptyState message="No projects found." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="data">
            <thead>
              <tr>
                <th>Code</th>
                <th>Title</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Quotation</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link
                      href={`/dashboard/projects/${p.id}`}
                      className="font-medium text-sky-700 hover:underline"
                    >
                      {p.code}
                    </Link>
                  </td>
                  <td>{p.title}</td>
                  <td>{p.customer.fullName}</td>
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
