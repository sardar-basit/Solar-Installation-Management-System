import Link from "next/link";
import { requireCapability } from "@/lib/session";
import { listCustomers } from "@/lib/services/customers";
import { formatDate } from "@/lib/utils";
import { PageHeader, EmptyState, Badge } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { can } from "@/lib/rbac";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireCapability("customers_read");
  const { q } = await searchParams;
  const customers = await listCustomers(q);
  const canWrite = can(session.user.role, "customers_write");

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Customer and site profiles"
        actions={
          canWrite ? (
            <LinkButton href="/dashboard/customers/new">New customer</LinkButton>
          ) : null
        }
      />

      <form className="mb-4 flex max-w-md gap-2">
        <Input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search name, email, phone…"
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {customers.length === 0 ? (
        <EmptyState message="No customers found." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="data">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Site</th>
                <th>Projects</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link
                      href={`/dashboard/customers/${c.id}`}
                      className="font-medium text-sky-700 hover:underline"
                    >
                      {c.fullName}
                    </Link>
                    {c.archived ? (
                      <Badge className="ml-2 bg-slate-200">Archived</Badge>
                    ) : null}
                  </td>
                  <td>
                    <div>{c.email}</div>
                    <div className="text-slate-500">{c.phone}</div>
                  </td>
                  <td>
                    {c.siteAddress}
                    {c.siteCity ? `, ${c.siteCity}` : ""}
                  </td>
                  <td>{c._count.projects}</td>
                  <td>{formatDate(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
