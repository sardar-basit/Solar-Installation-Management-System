import Link from "next/link";
import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { requireRoles } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { requirePortalCustomer } from "@/lib/portal";
import { PROJECT_STATUS_LABELS } from "@/lib/rbac";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from "@/components/ui/card";
import { LinkButton, statusBadgeClass } from "@/components/ui/link-button";

export default async function PortalProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRoles([Role.CUSTOMER, Role.ADMIN]);
  const customer = await requirePortalCustomer(session.user.id);
  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: { id, customerId: customer.id },
    include: {
      manager: { select: { name: true, phone: true } },
      design: true,
      quotation: true,
      installation: {
        include: {
          technician: { select: { name: true } },
        },
      },
      payments: { orderBy: { paidAt: "desc" } },
      survey: { select: { surveyedAt: true, requiredCapacityKw: true } },
    },
  });
  if (!project) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${project.code} — ${project.title}`}
        description="Project status and related documents"
        actions={
          <Badge className={statusBadgeClass(project.status)}>
            {PROJECT_STATUS_LABELS[project.status]}
          </Badge>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-slate-500">Design</CardTitle>
          </CardHeader>
          <CardContent>
            {project.design
              ? `${project.design.capacityKw} kW · ${project.design.panelCount} panels`
              : "Pending"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-slate-500">Quotation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {project.quotation ? (
              <>
                <div>{formatCurrency(project.quotation.totalAmount)}</div>
                <LinkButton
                  href={`/portal/quotations/${project.quotation.id}`}
                  size="sm"
                  variant="outline"
                >
                  View quotation
                </LinkButton>
              </>
            ) : (
              "Pending"
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-slate-500">Installation</CardTitle>
          </CardHeader>
          <CardContent>
            {project.installation
              ? `${project.installation.progressPercent}% complete`
              : "Not started"}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-slate-500">Manager:</span>{" "}
            {project.manager?.name ?? "—"}
            {project.manager?.phone ? ` · ${project.manager.phone}` : ""}
          </p>
          <p>
            <span className="text-slate-500">Created:</span>{" "}
            {formatDate(project.createdAt)}
          </p>
          {project.survey ? (
            <p>
              <span className="text-slate-500">Surveyed:</span>{" "}
              {formatDate(project.survey.surveyedAt)}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {project.payments.length === 0 ? (
            <p className="text-sm text-slate-500">No payments yet.</p>
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
                      <Link
                        href={`/portal/payments/${p.id}/print`}
                        className="text-sky-700 hover:underline"
                      >
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
    </div>
  );
}
