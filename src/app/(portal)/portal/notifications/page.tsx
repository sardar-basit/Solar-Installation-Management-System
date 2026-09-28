import { Role } from "@prisma/client";
import { requireRoles } from "@/lib/session";
import { listForUser } from "@/lib/services/notifications-service";
import { formatDateTime } from "@/lib/utils";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/actions/notifications";
import {
  PageHeader,
  EmptyState,
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

function portalLink(link: string | null) {
  if (!link) return null;
  if (link.startsWith("/portal")) return link;
  if (link.startsWith("/projects/")) return `/portal${link}`;
  if (link.startsWith("/maintenance/")) return `/portal/maintenance`;
  return "/portal";
}

export default async function PortalNotificationsPage() {
  const session = await requireRoles([Role.CUSTOMER, Role.ADMIN]);
  const notifications = await listForUser(session.user.id);

  async function markAll() {
    "use server";
    await markAllNotificationsReadAction();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        actions={
          <form action={markAll}>
            <Button type="submit" size="sm" variant="outline">
              Mark all read
            </Button>
          </form>
        }
      />
      {notifications.length === 0 ? (
        <EmptyState message="No notifications." />
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const href = portalLink(n.link);
            return (
              <Card key={n.id} className={n.read ? "opacity-70" : ""}>
                <CardContent className="flex items-start justify-between gap-4 py-4">
                  <div>
                    <div className="font-medium">{n.title}</div>
                    <p className="mt-1 text-sm text-slate-600">{n.body}</p>
                    <p className="mt-2 text-xs text-slate-400">
                      {formatDateTime(n.createdAt)}
                    </p>
                    {href ? (
                      <Link
                        href={href}
                        className="mt-2 inline-block text-sm text-sky-700 hover:underline"
                      >
                        Open
                      </Link>
                    ) : null}
                  </div>
                  {!n.read ? (
                    <form
                      action={async () => {
                        "use server";
                        await markNotificationReadAction(n.id);
                      }}
                    >
                      <Button type="submit" size="sm" variant="outline">
                        Mark read
                      </Button>
                    </form>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
