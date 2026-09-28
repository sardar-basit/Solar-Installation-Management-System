import { requireCapability } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { createCustomerAction } from "@/app/actions/customers";
import { PageHeader, Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { ActionForm } from "@/components/forms/action-form";
import { Role } from "@prisma/client";

export default async function NewCustomerPage() {
  await requireCapability("customers_write");
  const portalUsers = await prisma.user.findMany({
    where: {
      role: Role.CUSTOMER,
      active: true,
      customerProfile: null,
    },
    select: { id: true, name: true, email: true, username: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="New customer"
        description="Create a customer and site profile"
      />
      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <ActionForm
            action={createCustomerAction}
            submitLabel="Create customer"
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" name="fullName" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" required />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Billing address</Label>
                <Input id="address" name="address" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="userId">Portal user (optional)</Label>
                <Select id="userId" name="userId" defaultValue="">
                  <option value="">None</option>
                  {portalUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.username})
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="siteAddress">Site address</Label>
                <Input id="siteAddress" name="siteAddress" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="siteCity">Site city</Label>
                <Input id="siteCity" name="siteCity" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="siteNotes">Site notes</Label>
                <Textarea id="siteNotes" name="siteNotes" rows={3} />
              </div>
            </div>
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}
