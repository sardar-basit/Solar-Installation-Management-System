import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { can } from "@/lib/rbac";
import { getDesign } from "@/lib/services/designs";
import { formatDate } from "@/lib/utils";
import { updateDesignAction } from "@/app/actions/designs";
import {
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { ActionForm } from "@/components/forms/action-form";
import { LinkButton } from "@/components/ui/link-button";

export default async function DesignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const design = await getDesign(id);
  if (!design) notFound();
  const canWrite = can(session.user.role, "designs_write");
  const boundUpdate = updateDesignAction.bind(null, id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Design — ${design.project.code}`}
        description={`${design.capacityKw} kW · Designer: ${design.designer.name}`}
        actions={
          !design.quotation && can(session.user.role, "quotations_write") ? (
            <LinkButton href={`/dashboard/quotations/new?projectId=${design.projectId}`}>
              Create quotation
            </LinkButton>
          ) : null
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{canWrite ? "Edit design" : "Design details"}</CardTitle>
          </CardHeader>
          <CardContent>
            {canWrite ? (
              <ActionForm action={boundUpdate} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="capacityKw">Capacity (kW)</Label>
                    <Input id="capacityKw" name="capacityKw" type="number" min="0.1" step="0.01" defaultValue={design.capacityKw} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="panelCount">Panel count</Label>
                    <Input id="panelCount" name="panelCount" type="number" min="1" defaultValue={design.panelCount} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inverterCount">Inverters</Label>
                    <Input id="inverterCount" name="inverterCount" type="number" min="0" defaultValue={design.inverterCount} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="batteryCount">Batteries</Label>
                    <Input id="batteryCount" name="batteryCount" type="number" min="0" defaultValue={design.batteryCount} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="yieldFactorKwhPerKwYear">Yield factor</Label>
                    <Input id="yieldFactorKwhPerKwYear" name="yieldFactorKwhPerKwYear" type="number" min="1" defaultValue={design.yieldFactorKwhPerKwYear} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="otherComponents">Other components</Label>
                  <Textarea id="otherComponents" name="otherComponents" defaultValue={design.otherComponents ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" name="notes" defaultValue={design.notes ?? ""} />
                </div>
              </ActionForm>
            ) : (
              <dl className="space-y-2 text-sm">
                <div><dt className="text-slate-500">Capacity</dt><dd>{design.capacityKw} kW</dd></div>
                <div><dt className="text-slate-500">Panels / inverters / batteries</dt><dd>{design.panelCount} / {design.inverterCount} / {design.batteryCount}</dd></div>
                <div><dt className="text-slate-500">Est. generation</dt><dd>{design.estimatedGenerationKwh} kWh/yr</dd></div>
              </dl>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <Link href={`/dashboard/projects/${design.projectId}`} className="text-sky-700 hover:underline">
                {design.project.code} — {design.project.title}
              </Link>
            </p>
            <p>Customer: {design.project.customer.fullName}</p>
            <p>Est. generation: {Math.round(design.estimatedGenerationKwh)} kWh/year</p>
            <p>Created: {formatDate(design.createdAt)}</p>
            {design.quotation ? (
              <p>
                Quotation:{" "}
                <Link href={`/dashboard/quotations/${design.quotation.id}`} className="text-sky-700 hover:underline">
                  View
                </Link>
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
