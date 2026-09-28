import { PaymentMethod } from "@prisma/client";
import { requireCapability } from "@/lib/session";
import { listProjects } from "@/lib/services/projects";
import { recordPaymentAction } from "@/app/actions/payments";
import { formatCurrency } from "@/lib/utils";
import { PageHeader, Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { ActionForm } from "@/components/forms/action-form";

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  await requireCapability("payments_write");
  const { projectId } = await searchParams;
  const projects = (await listProjects()).filter((p) => p.quotation);

  return (
    <div>
      <PageHeader title="Record payment" description="Log a payment against a quoted project" />
      <Card className="max-w-xl">
        <CardContent className="pt-6">
          <ActionForm
            action={recordPaymentAction}
            submitLabel="Record payment"
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="projectId">Project</Label>
              <Select
                id="projectId"
                name="projectId"
                required
                defaultValue={projectId ?? ""}
              >
                <option value="">Select project…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.customer.fullName}
                    {p.quotation
                      ? ` (${formatCurrency(p.quotation.totalAmount)})`
                      : ""}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" name="amount" type="number" min="0.01" step="0.01" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="method">Method</Label>
              <Select id="method" name="method" defaultValue="CASH">
                {Object.values(PaymentMethod).map((m) => (
                  <option key={m} value={m}>
                    {m.replaceAll("_", " ")}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference">Reference</Label>
              <Input id="reference" name="reference" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={3} />
            </div>
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}
