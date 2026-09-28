"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { createQuotationAction } from "@/app/actions/quotations";
import type { ActionResult } from "@/lib/action-utils";

type Line = {
  category: string;
  description: string;
  quantity: string;
  unitPrice: string;
};

const emptyLine = (): Line => ({
  category: "PANEL",
  description: "",
  quantity: "1",
  unitPrice: "0",
});

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creating…" : "Create quotation"}
    </Button>
  );
}

export function QuotationForm({
  projects,
  defaultProjectId,
}: {
  projects: { id: string; code: string; title: string; capacityKw?: number | null }[];
  defaultProjectId?: string;
}) {
  const [lines, setLines] = useState<Line[]>([emptyLine(), emptyLine()]);
  const [state, formAction] = useActionState(
    async (_prev: ActionResult | null, formData: FormData) =>
      createQuotationAction(formData),
    null as ActionResult | null
  );

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="projectId">Project</Label>
        <Select
          id="projectId"
          name="projectId"
          required
          defaultValue={defaultProjectId ?? ""}
        >
          <option value="">Select project with design…</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code} — {p.title}
              {p.capacityKw != null ? ` (${p.capacityKw} kW)` : ""}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Line items</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLines((prev) => [...prev, emptyLine()])}
          >
            Add line
          </Button>
        </div>
        {lines.map((line, index) => (
          <div
            key={index}
            className="grid gap-2 rounded-md border border-slate-200 p-3 md:grid-cols-12"
          >
            <div className="md:col-span-2">
              <Label>Category</Label>
              <Input
                name="lineCategory"
                value={line.category}
                onChange={(e) => {
                  const v = e.target.value;
                  setLines((prev) =>
                    prev.map((l, i) => (i === index ? { ...l, category: v } : l))
                  );
                }}
                required
              />
            </div>
            <div className="md:col-span-5">
              <Label>Description</Label>
              <Input
                name="lineDescription"
                value={line.description}
                onChange={(e) => {
                  const v = e.target.value;
                  setLines((prev) =>
                    prev.map((l, i) =>
                      i === index ? { ...l, description: v } : l
                    )
                  );
                }}
                required
              />
            </div>
            <div className="md:col-span-2">
              <Label>Qty</Label>
              <Input
                name="lineQuantity"
                type="number"
                min="0.01"
                step="0.01"
                value={line.quantity}
                onChange={(e) => {
                  const v = e.target.value;
                  setLines((prev) =>
                    prev.map((l, i) =>
                      i === index ? { ...l, quantity: v } : l
                    )
                  );
                }}
                required
              />
            </div>
            <div className="md:col-span-2">
              <Label>Unit price</Label>
              <Input
                name="lineUnitPrice"
                type="number"
                min="0"
                step="0.01"
                value={line.unitPrice}
                onChange={(e) => {
                  const v = e.target.value;
                  setLines((prev) =>
                    prev.map((l, i) =>
                      i === index ? { ...l, unitPrice: v } : l
                    )
                  );
                }}
                required
              />
            </div>
            <div className="flex items-end md:col-span-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={lines.length <= 1}
                onClick={() =>
                  setLines((prev) => prev.filter((_, i) => i !== index))
                }
              >
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="taxAmount">Tax amount</Label>
          <Input id="taxAmount" name="taxAmount" type="number" min="0" step="0.01" defaultValue="0" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="otherCharges">Other charges</Label>
          <Input id="otherCharges" name="otherCharges" type="number" min="0" step="0.01" defaultValue="0" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={3} />
      </div>

      {state && !state.ok ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
