import { InventoryCategory } from "@prisma/client";
import { requireCapability } from "@/lib/session";
import { listItems } from "@/lib/services/inventory";
import { listProjects } from "@/lib/services/projects";
import { formatCurrency } from "@/lib/utils";
import {
  adjustStockAction,
  createInventoryItemAction,
  issueToProjectAction,
} from "@/app/actions/inventory";
import {
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Badge,
} from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { ActionForm } from "@/components/forms/action-form";
import { LinkButton } from "@/components/ui/link-button";
import { Button } from "@/components/ui/button";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; view?: string }>;
}) {
  await requireCapability("inventory_manage");
  const { q, view } = await searchParams;
  const [items, projects] = await Promise.all([
    listItems({ search: q, active: true }),
    listProjects(),
  ]);

  const showNew = view === "new";
  const showAdjust = view === "adjust";
  const showIssue = view === "issue";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Stock levels, adjustments, and project issues"
        actions={
          <div className="flex flex-wrap gap-2">
            <LinkButton href="/dashboard/inventory?view=new" size="sm">
              New item
            </LinkButton>
            <LinkButton href="/dashboard/inventory?view=adjust" size="sm" variant="outline">
              Adjust stock
            </LinkButton>
            <LinkButton href="/dashboard/inventory?view=issue" size="sm" variant="outline">
              Issue to project
            </LinkButton>
          </div>
        }
      />

      <form className="flex max-w-md gap-2">
        <Input name="q" defaultValue={q ?? ""} placeholder="Search SKU or name…" />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {showNew ? (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>New inventory item</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm
              action={createInventoryItemAction}
              submitLabel="Create item"
              className="space-y-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input id="sku" name="sku" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select id="category" name="category" required defaultValue="PANEL">
                    {Object.values(InventoryCategory).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Initial qty</Label>
                  <Input id="quantity" name="quantity" type="number" min="0" defaultValue="0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minLevel">Min level</Label>
                  <Input id="minLevel" name="minLevel" type="number" min="0" defaultValue="5" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unitCost">Unit cost</Label>
                  <Input id="unitCost" name="unitCost" type="number" min="0" step="0.01" defaultValue="0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Input id="unit" name="unit" defaultValue="pcs" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" />
              </div>
            </ActionForm>
          </CardContent>
        </Card>
      ) : null}

      {showAdjust ? (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Adjust stock</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm action={adjustStockAction} submitLabel="Apply" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="itemId">Item</Label>
                <Select id="itemId" name="itemId" required defaultValue="">
                  <option value="">Select…</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.sku} — {i.name} (qty {i.quantity})
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select id="type" name="type" defaultValue="IN">
                  <option value="IN">IN (add)</option>
                  <option value="OUT">OUT (remove)</option>
                  <option value="ADJUST">ADJUST (set absolute)</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input id="quantity" name="quantity" type="number" min="1" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="note">Note</Label>
                <Input id="note" name="note" />
              </div>
            </ActionForm>
          </CardContent>
        </Card>
      ) : null}

      {showIssue ? (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Issue to project</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm action={issueToProjectAction} submitLabel="Issue stock" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="projectId">Project</Label>
                <Select id="projectId" name="projectId" required defaultValue="">
                  <option value="">Select…</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {p.title}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="itemId">Item</Label>
                <Select id="itemId" name="itemId" required defaultValue="">
                  <option value="">Select…</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.sku} — {i.name} (qty {i.quantity})
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input id="quantity" name="quantity" type="number" min="1" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="note">Note</Label>
                <Input id="note" name="note" />
              </div>
            </ActionForm>
          </CardContent>
        </Card>
      ) : null}

      {items.length === 0 ? (
        <EmptyState message="No inventory items." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="data">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Name</th>
                <th>Category</th>
                <th>Qty</th>
                <th>Min</th>
                <th>Unit cost</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td className="font-medium">{i.sku}</td>
                  <td>{i.name}</td>
                  <td>{i.category}</td>
                  <td>
                    {i.quantity}
                    {i.quantity <= i.minLevel ? (
                      <Badge className="ml-2 bg-amber-100 text-amber-800">Low</Badge>
                    ) : null}
                  </td>
                  <td>{i.minLevel}</td>
                  <td>{formatCurrency(i.unitCost)}</td>
                  <td>{formatCurrency(i.quantity * i.unitCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
