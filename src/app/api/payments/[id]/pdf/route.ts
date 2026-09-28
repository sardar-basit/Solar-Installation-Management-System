import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getPaymentReceiptData } from "@/lib/services/payments";
import { formatCurrency, formatDate } from "@/lib/utils";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  let receipt;
  try {
    receipt = await getPaymentReceiptData(id);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const accept = req.headers.get("accept") ?? "";
  if (accept.includes("text/html") && !accept.includes("application/pdf")) {
    const base =
      session.user.role === "CUSTOMER"
        ? `/portal/payments/${id}/print`
        : `/dashboard/payments/${id}/print`;
    return NextResponse.redirect(new URL(base, req.url));
  }

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Receipt ${escapeHtml(receipt.receiptNo)}</title>
<style>
body{font-family:system-ui,sans-serif;color:#0f172a;margin:40px;max-width:640px}
.amount{font-size:28px;font-weight:600;margin:24px 0;text-align:center}
.muted{color:#64748b;font-size:14px}
.row{display:flex;justify-content:space-between;margin:6px 0;font-size:14px}
</style></head><body>
<h1>SIMS Payment Receipt</h1>
<p class="muted">${escapeHtml(receipt.receiptNo)} · ${formatDate(receipt.paidAt)}</p>
<p>Received from <strong>${escapeHtml(receipt.customer.fullName)}</strong></p>
<div class="amount">${formatCurrency(receipt.amount)}</div>
<div class="row"><span>Project</span><span>${escapeHtml(receipt.project.code)}</span></div>
<div class="row"><span>Method</span><span>${receipt.method}</span></div>
<div class="row"><span>Balance</span><span>${formatCurrency(receipt.summary.balance)}</span></div>
<script>window.print()</script>
</body></html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="${receipt.receiptNo}.html"`,
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
