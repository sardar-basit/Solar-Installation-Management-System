import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectStatus, Role } from "@prisma/client";
import { requireSession } from "@/lib/session";
import { can, PROJECT_STATUS_LABELS, canTransition } from "@/lib/rbac";
import { getProject } from "@/lib/services/projects";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import {
  assignTechnicianAction,
  updateProjectStatusAction,
} from "@/app/actions/projects";
import {
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { ActionForm } from "@/components/forms/action-form";
import { LinkButton, statusBadgeClass } from "@/components/ui/link-button";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const canWrite = can(session.user.role, "projects_write");
  const canAssign = can(session.user.role, "projects_assign");

  const technicians = canAssign
    ? await prisma.user.findMany({
        where: { active: true, role: Role.INSTALLATION_TECH },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : [];

  const nextStatuses = Object.values(ProjectStatus).filter((s) =>
    canTransition(project.status, s)
  );

  const boundStatus = updateProjectStatusAction.bind(null, id);
  const boundAssign = assignTechnicianAction.bind(null, id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${project.code} — ${project.title}`}
        description={`Customer: ${project.customer.fullName}`}
        actions={
          <Badge className={statusBadgeClass(project.status)}>
            {PROJECT_STATUS_LABELS[project.status]}
          </Badge>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-slate-500">Survey</CardTitle>
          </CardHeader>
          <CardContent>
            {project.survey ? (
              <LinkButton href={`/dashboard/surveys/${project.survey.id}`} size="sm" variant="outline">
                View survey
              </LinkButton>
            ) : can(session.user.role, "surveys_write") ? (
              <LinkButton href={`/dashboard/surveys/new?projectId=${id}`} size="sm">
                Create survey
              </LinkButton>
            ) : (
              <span className="text-sm text-slate-500">Not started</span>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-slate-500">Design</CardTitle>
          </CardHeader>
          <CardContent>
            {project.design ? (
              <div className="space-y-2">
                <div className="text-sm">{project.design.capacityKw} kW</div>
                <LinkButton href={`/dashboard/designs/${project.design.id}`} size="sm" variant="outline">
                  View design
                </LinkButton>
              </div>
            ) : can(session.user.role, "designs_write") ? (
              <LinkButton href={`/dashboard/designs/new?projectId=${id}`} size="sm">
                Create design
              </LinkButton>
            ) : (
              <span className="text-sm text-slate-500">Not started</span>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-slate-500">Quotation</CardTitle>
          </CardHeader>
          <CardContent>
            {project.quotation ? (
              <div className="space-y-2">
                <div className="text-sm">
                  {formatCurrency(project.quotation.totalAmount)} · {project.quotation.status}
                </div>
                <LinkButton href={`/dashboard/quotations/${project.quotation.id}`} size="sm" variant="outline">
                  View quotation
                </LinkButton>
              </div>
            ) : project.design && can(session.user.role, "quotations_write") ? (
              <LinkButton href={`/dashboard/quotations/new?projectId=${id}`} size="sm">
                Create quotation
              </LinkButton>
            ) : (
              <span className="text-sm text-slate-500">Not started</span>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-slate-500">Installation</CardTitle>
          </CardHeader>
          <CardContent>
            {project.installation ? (
              <div className="space-y-2">
                <div className="text-sm">{project.installation.progressPercent}%</div>
                <LinkButton href={`/dashboard/installations/${project.installation.id}`} size="sm" variant="outline">
                  View installation
                </LinkButton>
              </div>
            ) : (
              <span className="text-sm text-slate-500">Assign a technician to begin</span>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Project details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-slate-500">Customer:</span>{" "}
              <Link href={`/dashboard/customers/${project.customerId}`} className="text-sky-700 hover:underline">
                {project.customer.fullName}
              </Link>
            </p>
            <p>
              <span className="text-slate-500">Site:</span> {project.customer.siteAddress}
            </p>
            <p>
              <span className="text-slate-500">Manager:</span>{" "}
              {project.manager?.name ?? "Unassigned"}
            </p>
            <p>
              <span className="text-slate-500">Created:</span> {formatDate(project.createdAt)}
            </p>
            {project.description ? (
              <p>
                <span className="text-slate-500">Description:</span> {project.description}
              </p>
            ) : null}
            {project.assignments.length > 0 ? (
              <div>
                <span className="text-slate-500">Assigned:</span>{" "}
                {project.assignments.map((a) => a.user.name).join(", ")}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {canWrite && nextStatuses.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Update status</CardTitle>
              </CardHeader>
              <CardContent>
                <ActionForm action={boundStatus} submitLabel="Update status" className="space-y-3">
                  <Select name="status" required defaultValue={nextStatuses[0]}>
                    {nextStatuses.map((s) => (
                      <option key={s} value={s}>
                        {PROJECT_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </Select>
                </ActionForm>
              </CardContent>
            </Card>
          ) : null}

          {canAssign ? (
            <Card>
              <CardHeader>
                <CardTitle>Assign technician</CardTitle>
              </CardHeader>
              <CardContent>
                <ActionForm action={boundAssign} submitLabel="Assign" className="space-y-3">
                  <Select name="technicianUserId" required defaultValue="">
                    <option value="">Select technician…</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </Select>
                </ActionForm>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {project.payments.length === 0 ? (
              <p className="text-sm text-slate-500">No payments recorded.</p>
            ) : (
              <table className="data">
                <thead>
                  <tr>
                    <th>Receipt</th>
                    <th>Amount</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {project.payments.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <Link href={`/dashboard/payments/${p.id}`} className="text-sky-700 hover:underline">
                          {p.receiptNo}
                        </Link>
                      </td>
                      <td>{formatCurrency(p.amount)}</td>
                      <td>{formatDate(p.paidAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory issued</CardTitle>
          </CardHeader>
          <CardContent>
            {project.inventoryIssues.length === 0 ? (
              <p className="text-sm text-slate-500">No stock issued.</p>
            ) : (
              <table className="data">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {project.inventoryIssues.map((iss) => (
                    <tr key={iss.id}>
                      <td>
                        {iss.item.sku} — {iss.item.name}
                      </td>
                      <td>{iss.quantity}</td>
                      <td>{formatDateTime(iss.issuedAt)}</td>
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
