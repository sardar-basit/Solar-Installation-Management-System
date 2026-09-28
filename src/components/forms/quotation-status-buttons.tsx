"use client";

import { Button } from "@/components/ui/button";
import { updateQuotationStatusAction } from "@/app/actions/quotations";
import type { QuotationStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const STATUS_ACTIONS: { status: QuotationStatus; label: string; variant?: "default" | "secondary" | "danger" | "outline" }[] = [
  { status: "SENT", label: "Mark sent", variant: "outline" },
  { status: "APPROVED", label: "Approve", variant: "default" },
  { status: "REJECTED", label: "Reject", variant: "danger" },
  { status: "DRAFT", label: "Back to draft", variant: "secondary" },
];

export function QuotationStatusButtons({
  quotationId,
  currentStatus,
}: {
  quotationId: string;
  currentStatus: QuotationStatus;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  async function onClick(status: QuotationStatus) {
    setLoading(status);
    setError("");
    const result = await updateQuotationStatusAction(quotationId, status);
    setLoading(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {STATUS_ACTIONS.filter((a) => a.status !== currentStatus).map((action) => (
          <Button
            key={action.status}
            type="button"
            size="sm"
            variant={action.variant}
            disabled={loading !== null}
            onClick={() => onClick(action.status)}
          >
            {loading === action.status ? "…" : action.label}
          </Button>
        ))}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
