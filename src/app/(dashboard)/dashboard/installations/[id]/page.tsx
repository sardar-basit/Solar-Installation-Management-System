import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { can } from "@/lib/rbac";
import { getInstallation } from "@/lib/services/installations";
import { formatDateTime } from "@/lib/utils";
import {
  addInstallationPhotoAction,
  updateProgressAction,
  verifyInstallationAction,
} from "@/app/actions/installations";
import {
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { ActionForm } from "@/components/forms/action-form";

export default async function InstallationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const installation = await getInstallation(id);
  if (!installation) notFound();

  const canUpdate = can(session.user.role, "installations_update");
  const canVerify = can(session.user.role, "installations_verify");
  const boundProgress = updateProgressAction.bind(null, id);
  const boundPhoto = addInstallationPhotoAction.bind(null, id);

  async function verifyAction(_formData: FormData) {
    "use server";
    return verifyInstallationAction(id);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Installation — ${installation.project.code}`}
        description={`${installation.project.customer.fullName} · ${installation.progressPercent}%`}
        actions={
          installation.verifiedAt ? (
            <Badge className="bg-emerald-100 text-emerald-800">Verified</Badge>
          ) : null
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-sky-700"
                style={{ width: `${installation.progressPercent}%` }}
              />
            </div>
            <p className="text-sm text-slate-600">
              Technician: {installation.technician?.name ?? "Unassigned"}
            </p>
            <p className="text-sm text-slate-600">
              Started: {formatDateTime(installation.startedAt)} · Completed:{" "}
              {formatDateTime(installation.completedAt)}
            </p>
            {canUpdate ? (
              <ActionForm action={boundProgress} submitLabel="Update progress" className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="progressPercent">Progress %</Label>
                  <Input
                    id="progressPercent"
                    name="progressPercent"
                    type="number"
                    min="0"
                    max="100"
                    defaultValue={installation.progressPercent}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="equipmentNotes">Equipment notes</Label>
                  <Textarea
                    id="equipmentNotes"
                    name="equipmentNotes"
                    defaultValue={installation.equipmentNotes ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="statusNotes">Status notes</Label>
                  <Textarea
                    id="statusNotes"
                    name="statusNotes"
                    defaultValue={installation.statusNotes ?? ""}
                  />
                </div>
              </ActionForm>
            ) : (
              <div className="space-y-2 text-sm">
                <p>{installation.equipmentNotes}</p>
                <p>{installation.statusNotes}</p>
              </div>
            )}

            {canVerify &&
            installation.progressPercent >= 100 &&
            !installation.verifiedAt ? (
              <ActionForm action={verifyAction} submitLabel="Verify installation" />
            ) : null}
            {installation.verifiedAt ? (
              <p className="text-sm text-emerald-700">
                Verified by {installation.verifiedBy?.name} on{" "}
                {formatDateTime(installation.verifiedAt)}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <Link
                href={`/dashboard/projects/${installation.projectId}`}
                className="text-sky-700 hover:underline"
              >
                {installation.project.code} — {installation.project.title}
              </Link>
              <p>Site: {installation.project.customer.siteAddress}</p>
              {installation.project.design ? (
                <p>Design: {installation.project.design.capacityKw} kW</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Photos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {installation.photos.length === 0 ? (
                <p className="text-sm text-slate-500">No photos yet.</p>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {installation.photos.map((p) => (
                    <li key={p.id} className="text-sm">
                      <a
                        href={`/api/uploads${p.filePath.replace(/^\/uploads/, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-700 hover:underline"
                      >
                        {p.fileName}
                      </a>
                      {p.caption ? (
                        <div className="text-slate-500">{p.caption}</div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              {canUpdate ? (
                <ActionForm action={boundPhoto} submitLabel="Upload photo" className="space-y-3">
                  <Input name="file" type="file" accept="image/*" required />
                  <Input name="caption" placeholder="Caption (optional)" />
                </ActionForm>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
