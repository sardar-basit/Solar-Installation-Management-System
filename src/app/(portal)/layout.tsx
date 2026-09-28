import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { AppSidebar, portalNav } from "@/components/layout/sidebar";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "CUSTOMER" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <AppSidebar
        role={session.user.role}
        name={session.user.name}
        items={portalNav}
        brand="SIMS Portal"
      />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
