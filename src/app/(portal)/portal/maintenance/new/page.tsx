import { Role } from "@prisma/client";
import { requireRoles } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { requirePortalCustomer } from "@/lib/portal";
import { createMaintenanceAction } from "@/app/actions/maintenance";
import { PageHeader, Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { ActionForm } from "@/components/forms/action-form";

export default async function PortalNewMaintenancePage() {
  const session = await requireRoles([Role.CUSTOMER, Role.ADMIN]);
  const customer = await requirePortalCustomer(session.user.id);
  const projects = await prisma.project.findMany({
    where: { customerId: customer.id },
    select: { id: true, code: true, title: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="New maintenance request"
        description="Describe the issue and we will assign a technician"
      />
      <Card className="max-w-xl">
        <CardContent className="pt-6">
          <ActionForm
            action={createMaintenanceAction}
            submitLabel="Submit request"
            className="space-y-4"
          >
            <input type="hidden" name="customerId" value={customer.id} />
            <div className="space-y-2">
              <Label htmlFor="projectId">Project</Label>
              <Select id="projectId" name="projectId" required defaultValue="">
                <option value="">Select project…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.title}
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
