import { requireSession } from "@/lib/session";
import { can } from "@/lib/rbac";
import {
  getCustomerReport,
  getProjectReport,
  getInstallationReport,
  getQuotationReport,
  getPaymentReport,
  getInventoryReport,
  getMaintenanceReport,
} from "@/lib/services/reports";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; section?: string }>;
}) {
  const session = await requireSession();
  const { from, to, section } = await searchParams;
  const range = { dateFrom: from || null, dateTo: to || null };

  const showView = can(session.user.role, "reports_view");
  const showFinancial = can(session.user.role, "reports_financial");
  const showInventory = can(session.user.role, "reports_inventory");

  if (!showView && !showFinancial && !showInventory) {
    throw new Error("Unauthorized");
  }

  const [
    customers,
    projects,
    installations,
    quotations,
    payments,
    inventory,
    maintenance,
  ] = await Promise.all([
    showView ? getCustomerReport(range) : Promise.resolve([]),
    showView ? getProjectReport(range) : Promise.resolve([]),
    showView ? getInstallationReport(range) : Promise.resolve([]),
    showView || showFinancial ? getQuotationReport(range) : Promise.resolve([]),
    showFinancial ? getPaymentReport(range) : Promise.resolve([]),
    showInventory ? getInventoryReport(range) : Promise.resolve(null),
    showView ? getMaintenanceReport(range) : Promise.resolve([]),
  ]);

  const qs = new URLSearchParams();
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);
  const query = qs.toString() ? `?${qs.toString()}` : "";

  const active = section ?? "projects";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Operational and financial summaries"
      />

      <Card>
        <CardContent className="pt-6">
          <form className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="from">From</Label>
              <Input id="from" name="from" type="date" defaultValue={from ?? ""} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="to">To</Label>
              <Input id="to" name="to" type="date" defaultValue={to ?? ""} />
            </div>
            {section ? <input type="hidden" name="section" value={section} /> : null}
            <Button type="submit" variant="secondary">
              Apply range
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {showView ? (
          <>
            <LinkButton href={`/dashboard/reports?section=projects&${qs}`} size="sm" variant={active === "projects" ? "default" : "outline"}>Projects</LinkButton>
            <LinkButton href={`/dashboard/reports?section=customers&${qs}`} size="sm" variant={active === "customers" ? "default" : "outline"}>Customers</LinkButton>
            <LinkButton href={`/dashboard/reports?section=installations&${qs}`} size="sm" variant={active === "installations" ? "default" : "outline"}>Installations</LinkButton>
            <LinkButton href={`/dashboard/reports?section=maintenance&${qs}`} size="sm" variant={active === "maintenance" ? "default" : "outline"}>Maintenance</LinkButton>
          </>
        ) : null}
        {showView || showFinancial ? (
          <LinkButton href={`/dashboard/reports?section=quotations&${qs}`} size="sm" variant={active === "quotations" ? "default" : "outline"}>Quotations</LinkButton>
        ) : null}
        {showFinancial ? (
          <LinkButton href={`/dashboard/reports?section=payments&${qs}`} size="sm" variant={active === "payments" ? "default" : "outline"}>Payments</LinkButton>
        ) : null}
        {showInventory ? (
          <LinkButton href={`/dashboard/reports?section=inventory&${qs}`} size="sm" variant={active === "inventory" ? "default" : "outline"}>Inventory</LinkButton>
        ) : null}
      </div>

      {active === "projects" && showView ? (
        <ReportTable
          title="Projects"
          csvHref={`/api/reports/projects${query}`}
          headers={["Code", "Title", "Customer", "Status", "Capacity", "Quote", "Created"]}
          rows={projects.map((p) => [
            p.code,
            p.title,
            p.customerName,
            p.status,
            p.capacityKw != null ? `${p.capacityKw} kW` : "—",
            p.quotationTotal != null ? formatCurrency(p.quotationTotal) : "—",
            formatDate(p.createdAt),
          ])}
        />
      ) : null}

      {active === "customers" && showView ? (
        <ReportTable
          title="Customers"
          csvHref={`/api/reports/customers${query}`}
          headers={["Name", "Email", "Phone", "City", "Projects", "Created"]}
          rows={customers.map((c) => [
            c.fullName,
            c.email,
            c.phone,
            c.city ?? "—",
            String(c.projectCount),
            formatDate(c.createdAt),
          ])}
        />
      ) : null}

      {active === "installations" && showView ? (
        <ReportTable
          title="Installations"
          csvHref={`/api/reports/installations${query}`}
          headers={["Project", "Customer", "Tech", "Progress", "Verified", "Updated"]}
          rows={installations.map((i) => [
            i.projectCode,
            i.customerName,
            i.technicianName ?? "—",
            `${i.progressPercent}%`,
            i.verifiedAt ? formatDate(i.verifiedAt) : "—",
            formatDate(i.createdAt),
          ])}
        />
      ) : null}

      {active === "quotations" && (showView || showFinancial) ? (
        <ReportTable
          title="Quotations"
          csvHref={`/api/reports/quotations${query}`}
          headers={["Project", "Customer", "Status", "Total", "Created"]}
          rows={quotations.map((q) => [
            q.projectCode,
            q.customerName,
            q.status,
            formatCurrency(q.totalAmount),
            formatDate(q.createdAt),
          ])}
        />
      ) : null}

      {active === "payments" && showFinancial ? (
        <ReportTable
          title="Payments"
          csvHref={`/api/reports/payments${query}`}
          headers={["Receipt", "Customer", "Project", "Amount", "Method", "Date"]}
          rows={payments.map((p) => [
            p.receiptNo,
            p.customerName,
            p.projectCode,
            formatCurrency(p.amount),
            p.method,
            formatDate(p.paidAt),
          ])}
        />
      ) : null}

      {active === "maintenance" && showView ? (
        <ReportTable
          title="Maintenance"
          csvHref={`/api/reports/maintenance${query}`}
          headers={["Title", "Project", "Customer", "Status", "Assignee", "Created"]}
          rows={maintenance.map((r) => [
            r.title,
            r.projectCode,
            r.customerName,
            r.status,
            r.assigneeName ?? "—",
            formatDate(r.createdAt),
          ])}
        />
      ) : null}

      {active === "inventory" && showInventory && inventory ? (
        <div className="space-y-6">
          <ReportTable
            title="Stock levels"
            csvHref={`/api/reports/inventory${query}`}
            headers={["SKU", "Name", "Category", "Qty", "Min", "Value", "Status"]}
            rows={inventory.items.map((i) => [
              i.sku,
              i.name,
              i.category,
              String(i.quantity),
              String(i.minLevel),
              formatCurrency(i.stockValue),
              i.belowMin ? "LOW" : "OK",
            ])}
          />
        </div>
      ) : null}
    </div>
  );
}

function ReportTable({
  title,
  csvHref,
  headers,
  rows,
}: {
  title: string;
  csvHref: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>
          {title} <Badge className="ml-2">{rows.length}</Badge>
        </CardTitle>
        <a
          href={csvHref}
          className="text-sm text-sky-700 hover:underline"
        >
          Download CSV
        </a>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">No rows for this range.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data">
              <thead>
                <tr>
                  {headers.map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
