import { requireCapability } from "@/lib/session";
import { listProjects } from "@/lib/services/projects";
import { createDesignAction } from "@/app/actions/designs";
import { PageHeader, Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { ActionForm } from "@/components/forms/action-form";

export default async function NewDesignPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  await requireCapability("designs_write");
  const { projectId } = await searchParams;
  const projects = (await listProjects()).filter((p) => !p.design);

  return (
    <div>
      <PageHeader title="New system design" description="Define system capacity and components" />
      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <ActionForm
            action={createDesignAction}
            submitLabel="Create design"
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="projectId">Project</Label>
              <Select id="projectId" name="projectId" required defaultValue={projectId ?? ""}>
                <option value="">Select project…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.title}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="capacityKw">Capacity (kW)</Label>
                <Input id="capacityKw" name="capacityKw" type="number" min="0.1" step="0.01" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="panelCount">Panel count</Label>
                <Input id="panelCount" name="panelCount" type="number" min="1" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inverterCount">Inverter count</Label>
                <Input id="inverterCount" name="inverterCount" type="number" min="0" defaultValue="1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="batteryCount">Battery count</Label>
                <Input id="batteryCount" name="batteryCount" type="number" min="0" defaultValue="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="yieldFactorKwhPerKwYear">Yield factor (kWh/kW/yr)</Label>
                <Input id="yieldFactorKwhPerKwYear" name="yieldFactorKwhPerKwYear" type="number" min="1" defaultValue="1400" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="otherComponents">Other components</Label>
              <Textarea id="otherComponents" name="otherComponents" rows={2} />
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
