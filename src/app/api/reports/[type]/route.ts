import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
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

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const keys = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return [
    keys.join(","),
    ...rows.map((row) => keys.map((k) => escape(row[k])).join(",")),
  ].join("\n");
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ type: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type } = await context.params;
  const { searchParams } = req.nextUrl;
  const range = {
    dateFrom: searchParams.get("from"),
    dateTo: searchParams.get("to"),
  };

  let rows: Record<string, unknown>[] = [];

  switch (type) {
    case "customers":
      if (!can(session.user.role, "reports_view")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      rows = await getCustomerReport(range);
      break;
    case "projects":
      if (!can(session.user.role, "reports_view")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      rows = await getProjectReport(range);
      break;
    case "installations":
      if (!can(session.user.role, "reports_view")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      rows = await getInstallationReport(range);
      break;
    case "quotations":
      if (
        !can(session.user.role, "reports_view") &&
        !can(session.user.role, "reports_financial")
      ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      rows = await getQuotationReport(range);
      break;
    case "payments":
      if (!can(session.user.role, "reports_financial")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      rows = await getPaymentReport(range);
      break;
    case "maintenance":
      if (!can(session.user.role, "reports_view")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      rows = await getMaintenanceReport(range);
      break;
    case "inventory": {
      if (!can(session.user.role, "reports_inventory")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const data = await getInventoryReport(range);
      rows = data.items;
      break;
    }
    default:
      return NextResponse.json({ error: "Unknown report" }, { status: 404 });
  }

  const csv = toCsv(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type}-report.csv"`,
    },
  });
}
