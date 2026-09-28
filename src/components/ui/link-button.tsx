import Link from "next/link";
import { cn } from "@/lib/utils";

export function LinkButton({
  href,
  children,
  variant = "default",
  size = "default",
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "default" | "secondary" | "outline";
  size?: "default" | "sm";
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors",
        size === "default" && "h-10 px-4 py-2",
        size === "sm" && "h-8 px-3 text-xs",
        variant === "default" && "bg-sky-700 text-white hover:bg-sky-800",
        variant === "secondary" && "bg-slate-100 text-slate-900 hover:bg-slate-200",
        variant === "outline" && "border border-slate-300 bg-white hover:bg-slate-50",
        className
      )}
    >
      {children}
    </Link>
  );
}

export function statusBadgeClass(status: string) {
  switch (status) {
    case "COMPLETED":
    case "APPROVED":
    case "RESOLVED":
    case "CLOSED":
      return "bg-emerald-100 text-emerald-800";
    case "CANCELLED":
    case "REJECTED":
    case "EXPIRED":
      return "bg-red-100 text-red-800";
    case "INSTALLATION_IN_PROGRESS":
    case "IN_PROGRESS":
    case "SENT":
    case "ASSIGNED":
      return "bg-sky-100 text-sky-800";
    case "PENDING":
    case "DRAFT":
    case "OPEN":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}
