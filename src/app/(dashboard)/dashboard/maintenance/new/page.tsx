import { requireCapability } from "@/lib/session";
import { listProjects } from "@/lib/services/projects";
import { listCustomers } from "@/lib/services/customers";
import { createMaintenanceAction } from "@/app/actions/maintenance";
import { PageHeader, Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { ActionForm } from "@/components/forms/action-form";

export default async function NewMaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string; customerId?: string }>;
}) {
  await requireCapability("maintenance_request");
  const { projectId, customerId } = await searchParams;
  const [projects, customers] = await Promise.all([
    listProjects(),
    listCustomers(),
  ]);

  return (
    <div>
      <PageHeader title="New maintenance request" />
      <Card className="max-w-xl">
        <CardContent className="pt-6">
          <ActionForm
            action={createMaintenanceAction}
            submitLabel="Submit request"
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
                <option value="">Select…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.title}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerId">Customer</Label>
              <Select
                id="customerId"
                name="customerId"
                required
                defaultValue={customerId ?? ""}
              >
                <option value="">Select…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select id="priority" name="priority" defaultValue="NORMAL">
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={4} required />
            </div>
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}
