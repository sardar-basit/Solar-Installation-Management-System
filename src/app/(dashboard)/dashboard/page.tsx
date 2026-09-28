import Link from "next/link";
import { ProjectStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { PROJECT_STATUS_LABELS } from "@/lib/rbac";
import {
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";

export default async function DashboardPage() {
  await requireSession();

  const [
    customerCount,
    projectsByStatus,
    inventoryItems,
    openMaintenance,
    recentProjects,
  ] = await Promise.all([
    prisma.customer.count({ where: { archived: false } }),
    prisma.project.groupBy({
      by: ["status"],
      where: { archived: false },
      _count: { _all: true },
    }),
    prisma.inventoryItem.findMany({
      where: { active: true },
      select: { quantity: true, minLevel: true },
    }),
    prisma.maintenanceRequest.count({
      where: { status: { in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] } },
    }),
    prisma.project.findMany({
      where: { archived: false },
      take: 8,
      orderBy: { updatedAt: "desc" },
      include: {
        customer: { select: { fullName: true } },
      },
    }),
  ]);

  const lowStock = inventoryItems.filter((i) => i.quantity <= i.minLevel).length;

  const statusCounts = Object.values(ProjectStatus).map((status) => ({
    status,
    count: projectsByStatus.find((s) => s.status === status)?._count._all ?? 0,
  }));

  const totalProjects = statusCounts.reduce((s, x) => s + x.count, 0);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of solar installation operations"
        actions={
          <LinkButton href="/dashboard/projects/new">New project</LinkButton>
        }
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">
              Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-slate-900">
              {customerCount}
            </div>
            <Link
              href="/dashboard/customers"
              className="mt-2 inline-block text-sm text-sky-700 hover:underline"
            >
              View customers
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">
              Active projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-slate-900">
              {totalProjects}
            </div>
            <Link
              href="/dashboard/projects"
              className="mt-2 inline-block text-sm text-sky-700 hover:underline"
            >
              View projects
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">
              Low stock items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-slate-900">{lowStock}</div>
            <Link
              href="/dashboard/inventory"
              className="mt-2 inline-block text-sm text-sky-700 hover:underline"
            >
              Inventory
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">
              Open maintenance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-slate-900">
              {openMaintenance}
            </div>
            <Link
              href="/dashboard/maintenance"
              className="mt-2 inline-block text-sm text-sky-700 hover:underline"
            >
              Maintenance
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Projects by status</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {statusCounts.map(({ status, count }) => (
                <li
                  key={status}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-slate-700">
                    {PROJECT_STATUS_LABELS[status]}
                  </span>
                  <Badge>{count}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent projects</CardTitle>
          </CardHeader>
          <CardContent>
            {recentProjects.length === 0 ? (
              <p className="text-sm text-slate-500">No projects yet.</p>
            ) : (
              <table className="data">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Customer</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentProjects.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <Link
                          href={`/dashboard/projects/${p.id}`}
                          className="text-sky-700 hover:underline"
                        >
                          {p.code}
                        </Link>
                      </td>
                      <td>{p.customer.fullName}</td>
                      <td>
                        <Badge>{PROJECT_STATUS_LABELS[p.status]}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
