import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getQuotation } from "@/lib/services/quotations";
import { formatCurrency, formatDate } from "@/lib/utils";

/**
 * Returns a printable HTML document (use browser Print → Save as PDF).
 * Redirects authenticated staff/customers to the dedicated print page when preferred.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const quotation = await getQuotation(id);
  if (!quotation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Prefer dedicated print UI when Accept prefers HTML navigation
  const accept = req.headers.get("accept") ?? "";
  if (accept.includes("text/html") && !accept.includes("application/pdf")) {
    const base =
      session.user.role === "CUSTOMER"
        ? `/portal/quotations/${id}/print`
        : `/dashboard/quotations/${id}/print`;
    return NextResponse.redirect(new URL(base, req.url));
  }

  const lines = quotation.lineItems
    .map(
      (l) =>
        `<tr><td>${escapeHtml(l.category)}</td><td>${escapeHtml(l.description)}</td><td>${l.quantity}</td><td>${formatCurrency(l.unitPrice)}</td><td>${formatCurrency(l.amount)}</td></tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Quotation ${escapeHtml(quotation.project.code)}</title>
<style>
body{font-family:system-ui,sans-serif;color:#0f172a;margin:40px}
table{width:100%;border-collapse:collapse;margin:24px 0}
th,td{border-bottom:1px solid #e2e8f0;padding:8px;text-align:left;font-size:14px}
h1{margin:0 0 8px} .muted{color:#64748b;font-size:14px}
.totals{margin-left:auto;width:240px}
.totals div{display:flex;justify-content:space-between;margin:4px 0}
</style></head><body>
<h1>SIMS Quotation</h1>
<p class="muted">${escapeHtml(quotation.project.code)} · ${formatDate(quotation.createdAt)} · ${quotation.status}</p>
<p><strong>Customer:</strong> ${escapeHtml(quotation.project.customer.fullName)}</p>
<table><thead><tr><th>Category</th><th>Description</th><th>Qty</th><th>Unit</th><th>Amount</th></tr></thead>
<tbody>${lines}</tbody></table>
<div class="totals">
<div><span>Subtotal</span><span>${formatCurrency(quotation.subtotal)}</span></div>
<div><span>Tax</span><span>${formatCurrency(quotation.taxAmount)}</span></div>
<div><span>Other</span><span>${formatCurrency(quotation.otherCharges)}</span></div>
<div><strong>Total</strong><strong>${formatCurrency(quotation.totalAmount)}</strong></div>
</div>
<script>window.print()</script>
</body></html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="quotation-${quotation.project.code}.html"`,
    },
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
