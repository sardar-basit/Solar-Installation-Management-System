import { requireCapability } from "@/lib/session";
import { listProjects } from "@/lib/services/projects";
import { createSurveyAction } from "@/app/actions/surveys";
import { PageHeader, Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { ActionForm } from "@/components/forms/action-form";

export default async function NewSurveyPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  await requireCapability("surveys_write");
  const { projectId } = await searchParams;
  const projects = (await listProjects()).filter((p) => !p.survey);

  return (
    <div>
      <PageHeader title="New site survey" description="Record a site assessment" />
      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <ActionForm
            action={createSurveyAction}
            submitLabel="Create survey"
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
                    {p.code} — {p.title}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="roofType">Roof type</Label>
                <Input id="roofType" name="roofType" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="roofAreaSqm">Roof area (sqm)</Label>
                <Input id="roofAreaSqm" name="roofAreaSqm" type="number" min="0" step="0.01" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="roofOrientation">Orientation</Label>
                <Input id="roofOrientation" name="roofOrientation" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthlyConsumptionKwh">Monthly consumption (kWh)</Label>
                <Input id="monthlyConsumptionKwh" name="monthlyConsumptionKwh" type="number" min="0" step="0.01" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="requiredCapacityKw">Required capacity (kW)</Label>
                <Input id="requiredCapacityKw" name="requiredCapacityKw" type="number" min="0" step="0.01" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="shadingNotes">Shading notes</Label>
              <Textarea id="shadingNotes" name="shadingNotes" rows={2} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="siteAccessNotes">Site access notes</Label>
              <Textarea id="siteAccessNotes" name="siteAccessNotes" rows={2} />
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
