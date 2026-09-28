import { Role } from "@prisma/client";
import { requireCapability } from "@/lib/session";
import { ROLE_LABELS } from "@/lib/rbac";
import { createUserAction } from "@/app/actions/users";
import { PageHeader, Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { ActionForm } from "@/components/forms/action-form";

export default async function NewUserPage() {
  await requireCapability("manage_users");

  return (
    <div>
      <PageHeader title="New user" description="Create a staff or portal account" />
      <Card className="max-w-xl">
        <CardContent className="pt-6">
          <ActionForm
            action={createUserAction}
            submitLabel="Create user"
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" name="username" required minLength={3} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" required minLength={8} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="role">Role</Label>
                <Select id="role" name="role" required defaultValue="SALES">
                  {Object.values(Role).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}
