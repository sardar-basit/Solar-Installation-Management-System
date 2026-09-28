import Link from "next/link";
import { notFound } from "next/navigation";
import { MaintenanceStatus, Role } from "@prisma/client";
import { requireSession } from "@/lib/session";
import { can } from "@/lib/rbac";
import { getRequest } from "@/lib/services/maintenance";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import {
  assignMaintenanceAction,
  updateMaintenanceStatusAction,
} from "@/app/actions/maintenance";
import {
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { ActionForm } from "@/components/forms/action-form";
import { statusBadgeClass } from "@/components/ui/link-button";

export default async function MaintenanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const request = await getRequest(id);
  if (!request) notFound();

  const canManage = can(session.user.role, "maintenance_manage");
  const techs = canManage
    ? await prisma.user.findMany({
        where: {
          active: true,
          role: {
            in: [Role.INSTALLATION_TECH, Role.SITE_SURVEYOR, Role.PROJECT_MANAGER],
          },
        },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : [];

  const boundAssign = assignMaintenanceAction.bind(null, id);
  const boundStatus = updateMaintenanceStatusAction.bind(null, id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={request.title}
        description={`${request.project.code} · ${request.customer.fullName}`}
        actions={
          <Badge className={statusBadgeClass(request.status)}>
            {request.status}
          </Badge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Request details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-slate-500">Priority:</span> {request.priority}
            </p>
            <p>
              <span className="text-slate-500">Project:</span>{" "}
              <Link
                href={`/dashboard/projects/${request.projectId}`}
                className="text-sky-700 hover:underline"
              >
                {request.project.code}
              </Link>
            </p>
            <p>
              <span className="text-slate-500">Customer:</span>{" "}
              {request.customer.fullName} · {request.customer.phone}
            </p>
            <p>
              <span className="text-slate-500">Created by:</span>{" "}
              {request.createdBy.name} · {formatDateTime(request.createdAt)}
            </p>
            <p>
              <span className="text-slate-500">Assignee:</span>{" "}
              {request.assignee?.name ?? "Unassigned"}
            </p>
            <div className="rounded-md bg-slate-50 p-3 whitespace-pre-wrap">
              {request.description}
            </div>
            {request.resolution ? (
              <div>
                <span className="text-slate-500">Resolution:</span>
                <p className="mt-1">{request.resolution}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {canManage ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Assign</CardTitle>
                </CardHeader>
                <CardContent>
                  <ActionForm action={boundAssign} submitLabel="Assign" className="space-y-3">
                    <Select name="assigneeId" required defaultValue={request.assigneeId ?? ""}>
                      <option value="">Select assignee…</option>
                      {techs.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </Select>
                  </ActionForm>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Update status</CardTitle>
                </CardHeader>
                <CardContent>
                  <ActionForm action={boundStatus} submitLabel="Update" className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select id="status" name="status" defaultValue={request.status}>
                        {Object.values(MaintenanceStatus).map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="note">Note</Label>
                      <Input id="note" name="note" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="resolution">Resolution</Label>
                      <Textarea
                        id="resolution"
                        name="resolution"
                        defaultValue={request.resolution ?? ""}
                      />
                    </div>
                  </ActionForm>
                </CardContent>
              </Card>
            </>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                {request.history.map((h) => (
                  <li key={h.id} className="border-l-2 border-sky-200 pl-3">
                    <div className="font-medium">{h.status}</div>
                    <div className="text-slate-600">{h.note}</div>
                    <div className="text-xs text-slate-400">
                      {formatDateTime(h.createdAt)}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
