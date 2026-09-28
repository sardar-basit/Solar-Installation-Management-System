"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/rbac";
import type { Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  UserCircle,
  FolderKanban,
  ClipboardList,
  Sun,
  FileText,
  Wrench,
  Package,
  CreditCard,
  Bell,
  BarChart3,
  LogOut,
  HardHat,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Role[];
};

export const staffNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/customers", label: "Customers", icon: UserCircle, roles: ["ADMIN", "SALES", "PROJECT_MANAGER", "SITE_SURVEYOR", "ACCOUNTANT"] },
  { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
  { href: "/dashboard/surveys", label: "Surveys", icon: ClipboardList, roles: ["ADMIN", "SITE_SURVEYOR", "PROJECT_MANAGER"] },
  { href: "/dashboard/designs", label: "Designs", icon: Sun, roles: ["ADMIN", "SALES", "SITE_SURVEYOR", "PROJECT_MANAGER"] },
  { href: "/dashboard/quotations", label: "Quotations", icon: FileText, roles: ["ADMIN", "SALES", "PROJECT_MANAGER", "ACCOUNTANT"] },
  { href: "/dashboard/installations", label: "Installations", icon: HardHat, roles: ["ADMIN", "INSTALLATION_TECH", "PROJECT_MANAGER"] },
  { href: "/dashboard/inventory", label: "Inventory", icon: Package, roles: ["ADMIN", "INVENTORY_MANAGER"] },
  { href: "/dashboard/payments", label: "Payments", icon: CreditCard, roles: ["ADMIN", "ACCOUNTANT", "PROJECT_MANAGER"] },
  { href: "/dashboard/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3, roles: ["ADMIN", "PROJECT_MANAGER", "SALES", "ACCOUNTANT", "INVENTORY_MANAGER"] },
  { href: "/dashboard/users", label: "Users", icon: Users, roles: ["ADMIN"] },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
];

export const portalNav: NavItem[] = [
  { href: "/portal", label: "Overview", icon: LayoutDashboard },
  { href: "/portal/projects", label: "My Projects", icon: FolderKanban },
  { href: "/portal/quotations", label: "Quotations", icon: FileText },
  { href: "/portal/payments", label: "Payments", icon: CreditCard },
  { href: "/portal/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/portal/notifications", label: "Notifications", icon: Bell },
];

export function AppSidebar({
  role,
  name,
  items,
  brand = "SIMS",
}: {
  role: Role;
  name: string;
  items: NavItem[];
  brand?: string;
}) {
  const pathname = usePathname();
  const filtered = items.filter(
    (item) => !item.roles || item.roles.includes(role)
  );

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-950 text-slate-100">
      <div className="border-b border-slate-800 px-5 py-5">
        <div className="text-lg font-semibold tracking-wide text-sky-400">
          {brand}
        </div>
        <div className="mt-1 text-xs text-slate-400">
          Solar Installation Management
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {filtered.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" &&
              item.href !== "/portal" &&
              pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sky-700 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-800 p-4">
        <div className="mb-3 truncate text-sm font-medium">{name}</div>
        <div className="mb-3 text-xs text-slate-400">{ROLE_LABELS[role]}</div>
        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4" />
          Log out
        </Button>
      </div>
    </aside>
  );
}
