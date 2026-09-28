import { requireCapability } from "@/lib/session";
import { ROLE_LABELS } from "@/lib/rbac";
import { listUsers } from "@/lib/services/users";
import { formatDate } from "@/lib/utils";
import { updateUserAction } from "@/app/actions/users";
import { PageHeader, EmptyState, Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { Input, Label, Select } from "@/components/ui/input";
import { ActionForm } from "@/components/forms/action-form";
import { Role } from "@prisma/client";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; edit?: string }>;
}) {
  await requireCapability("manage_users");
  const { q, edit } = await searchParams;
  const users = await listUsers({ search: q });
  const editing = edit ? users.find((u) => u.id === edit) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Staff and portal accounts"
        actions={<LinkButton href="/dashboard/users/new">New user</LinkButton>}
      />

      <form className="flex max-w-md gap-2">
        <Input name="q" defaultValue={q ?? ""} placeholder="Search users…" />
        <button
          type="submit"
          className="h-10 rounded-md bg-slate-100 px-4 text-sm hover:bg-slate-200"
        >
          Search
        </button>
      </form>

      {editing ? (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Edit {editing.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm
              action={updateUserAction.bind(null, editing.id)}
              className="space-y-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" defaultValue={editing.name} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" name="username" defaultValue={editing.username} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" defaultValue={editing.email} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" defaultValue={editing.phone ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select id="role" name="role" defaultValue={editing.role}>
                    {Object.values(Role).map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">New password</Label>
                  <Input id="password" name="password" type="password" placeholder="Leave blank to keep" />
                </div>
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input
                    type="checkbox"
                    name="active"
                    defaultChecked={editing.active}
                    className="rounded border-slate-300"
                  />
                  Active
                </label>
              </div>
            </ActionForm>
          </CardContent>
        </Card>
      ) : null}

      {users.length === 0 ? (
        <EmptyState message="No users found." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="data">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium">{u.name}</td>
                  <td>{u.username}</td>
                  <td>{u.email}</td>
                  <td>{ROLE_LABELS[u.role]}</td>
                  <td>
                    <Badge className={u.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200"}>
                      {u.active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td>{formatDate(u.createdAt)}</td>
                  <td>
                    <LinkButton
                      href={`/dashboard/users?edit=${u.id}`}
                      size="sm"
                      variant="outline"
                    >
                      Edit
                    </LinkButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
