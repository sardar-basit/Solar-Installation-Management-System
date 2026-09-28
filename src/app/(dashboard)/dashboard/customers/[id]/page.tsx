import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCapability } from "@/lib/session";
import { can, PROJECT_STATUS_LABELS } from "@/lib/rbac";
import { getCustomer } from "@/lib/services/customers";
import { prisma } from "@/lib/prisma";
import { formatDate, formatCurrency } from "@/lib/utils";
import { updateCustomerAction } from "@/app/actions/customers";
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
import { Role } from "@prisma/client";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireCapability("customers_read");
  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer) notFound();

  const canWrite = can(session.user.role, "customers_write");
  const portalUsers = canWrite
    ? await prisma.user.findMany({
        where: {
          role: Role.CUSTOMER,
          active: true,
          OR: [{ customerProfile: null }, { id: customer.userId ?? undefined }],
        },
        select: { id: true, name: true, username: true },
        orderBy: { name: "asc" },
      })
    : [];

  const boundUpdate = updateCustomerAction.bind(null, id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={customer.fullName}
        description={`${customer.email} · ${customer.phone}`}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {canWrite ? (
          <Card>
            <CardHeader>
              <CardTitle>Edit customer</CardTitle>
            </CardHeader>
            <CardContent>
              <ActionForm action={boundUpdate} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="fullName">Full name</Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      defaultValue={customer.fullName}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      defaultValue={customer.email}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      defaultValue={customer.phone}
                      required
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="address">Billing address</Label>
                    <Input
                      id="address"
                      name="address"
                      defaultValue={customer.address}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      name="city"
                      defaultValue={customer.city ?? ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="userId">Portal user</Label>
                    <Select
                      id="userId"
                      name="userId"
                      defaultValue={customer.userId ?? ""}
                    >
                      <option value="">None</option>
                      {portalUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.username})
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="siteAddress">Site address</Label>
                    <Input
                      id="siteAddress"
                      name="siteAddress"
                      defaultValue={customer.siteAddress}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="siteCity">Site city</Label>
                    <Input
                      id="siteCity"
                      name="siteCity"
                      defaultValue={customer.siteCity ?? ""}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="siteNotes">Site notes</Label>
                    <Textarea
                      id="siteNotes"
                      name="siteNotes"
                      rows={3}
                      defaultValue={customer.siteNotes ?? ""}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm sm:col-span-2">
                    <input
                      type="checkbox"
                      name="archived"
                      defaultChecked={customer.archived}
                      className="rounded border-slate-300"
                    />
                    Archived
                  </label>
                </div>
              </ActionForm>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-slate-500">Address:</span>{" "}
                {customer.address}
                {customer.city ? `, ${customer.city}` : ""}
              </p>
              <p>
                <span className="text-slate-500">Site:</span>{" "}
                {customer.siteAddress}
                {customer.siteCity ? `, ${customer.siteCity}` : ""}
              </p>
              {customer.siteNotes ? (
                <p>
                  <span className="text-slate-500">Notes:</span>{" "}
                  {customer.siteNotes}
                </p>
              ) : null}
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Projects</CardTitle>
            </CardHeader>
            <CardContent>
              {customer.projects.length === 0 ? (
                <p className="text-sm text-slate-500">No projects.</p>
              ) : (
                <table className="data">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Status</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customer.projects.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <Link
                            href={`/dashboard/projects/${p.id}`}
                            className="text-sky-700 hover:underline"
                          >
                            {p.code}
                          </Link>
                        </td>
                        <td>
                          <Badge>{PROJECT_STATUS_LABELS[p.status]}</Badge>
                        </td>
                        <td>{formatDate(p.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent payments</CardTitle>
            </CardHeader>
            <CardContent>
              {customer.payments.length === 0 ? (
                <p className="text-sm text-slate-500">No payments.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {customer.payments.map((p) => (
                    <li key={p.id} className="flex justify-between">
                      <Link
                        href={`/dashboard/payments/${p.id}`}
                        className="text-sky-700 hover:underline"
                      >
                        {p.receiptNo}
                      </Link>
                      <span>
                        {formatCurrency(p.amount)} · {formatDate(p.paidAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
