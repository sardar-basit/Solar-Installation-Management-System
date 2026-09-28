import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { isStaff } from "@/lib/rbac";
import { AppSidebar, staffNav } from "@/components/layout/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  if (!isStaff(session.user.role) && session.user.role !== "ADMIN") {
    if (session.user.role === "CUSTOMER") redirect("/portal");
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <AppSidebar
        role={session.user.role}
        name={session.user.name}
        items={staffNav}
      />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
