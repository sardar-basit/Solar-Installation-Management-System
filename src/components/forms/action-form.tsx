"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-utils";

const initial: ActionResult | null = null;

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

export function ActionForm({
  action,
  children,
  submitLabel = "Save",
  className,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  children?: React.ReactNode;
  submitLabel?: string;
  className?: string;
}) {
  const [state, formAction] = useActionState(
    async (_prev: ActionResult | null, formData: FormData) => action(formData),
    initial
  );

  return (
    <form action={formAction} className={className}>
      {children}
      {state && !state.ok ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="text-sm text-emerald-700">Saved successfully.</p>
      ) : null}
      <div className="pt-2">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
