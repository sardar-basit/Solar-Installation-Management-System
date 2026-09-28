import { Role } from "@prisma/client";
import { requireCapability } from "@/lib/session";
import { listCustomers } from "@/lib/services/customers";
import { prisma } from "@/lib/prisma";
import { createProjectAction } from "@/app/actions/projects";
import { PageHeader, Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { ActionForm } from "@/components/forms/action-form";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  await requireCapability("projects_write");
  const { customerId } = await searchParams;
  const [customers, managers] = await Promise.all([
    listCustomers(),
    prisma.user.findMany({
      where: {
        active: true,
        role: { in: [Role.PROJECT_MANAGER, Role.ADMIN] },
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader title="New project" description="Start a new installation project" />
      <Card className="max-w-xl">
        <CardContent className="pt-6">
          <ActionForm
            action={createProjectAction}
            submitLabel="Create project"
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="customerId">Customer</Label>
              <Select
                id="customerId"
                name="customerId"
                required
                defaultValue={customerId ?? ""}
              >
                <option value="">Select customer…</option>
                {customers
                  .filter((c) => !c.archived)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} — {c.email}
                    </option>
                  ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required placeholder="5kW rooftop system" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="managerId">Project manager</Label>
              <Select id="managerId" name="managerId" defaultValue="">
                <option value="">Unassigned</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={3} />
            </div>
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}
