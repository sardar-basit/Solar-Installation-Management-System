import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { can } from "@/lib/rbac";
import { getSurvey } from "@/lib/services/surveys";
import { formatDate } from "@/lib/utils";
import {
  updateSurveyAction,
  addSurveyAttachmentAction,
} from "@/app/actions/surveys";
import {
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { ActionForm } from "@/components/forms/action-form";

export default async function SurveyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const survey = await getSurvey(id);
  if (!survey) notFound();
  const canWrite = can(session.user.role, "surveys_write");
  const boundUpdate = updateSurveyAction.bind(null, id);
  const boundAttach = addSurveyAttachmentAction.bind(null, id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Survey — ${survey.project.code}`}
        description={`Surveyor: ${survey.surveyor.name} · ${formatDate(survey.surveyedAt)}`}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{canWrite ? "Edit survey" : "Survey details"}</CardTitle>
          </CardHeader>
          <CardContent>
            {canWrite ? (
              <ActionForm action={boundUpdate} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="roofType">Roof type</Label>
                    <Input id="roofType" name="roofType" defaultValue={survey.roofType ?? ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="roofAreaSqm">Roof area (sqm)</Label>
                    <Input id="roofAreaSqm" name="roofAreaSqm" type="number" min="0" step="0.01" defaultValue={survey.roofAreaSqm ?? ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="roofOrientation">Orientation</Label>
                    <Input id="roofOrientation" name="roofOrientation" defaultValue={survey.roofOrientation ?? ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="monthlyConsumptionKwh">Monthly kWh</Label>
                    <Input id="monthlyConsumptionKwh" name="monthlyConsumptionKwh" type="number" min="0" step="0.01" defaultValue={survey.monthlyConsumptionKwh ?? ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="requiredCapacityKw">Required kW</Label>
                    <Input id="requiredCapacityKw" name="requiredCapacityKw" type="number" min="0" step="0.01" defaultValue={survey.requiredCapacityKw ?? ""} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shadingNotes">Shading notes</Label>
                  <Textarea id="shadingNotes" name="shadingNotes" defaultValue={survey.shadingNotes ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="siteAccessNotes">Site access</Label>
                  <Textarea id="siteAccessNotes" name="siteAccessNotes" defaultValue={survey.siteAccessNotes ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" name="notes" defaultValue={survey.notes ?? ""} />
                </div>
              </ActionForm>
            ) : (
              <dl className="space-y-2 text-sm">
                <div><dt className="text-slate-500">Roof</dt><dd>{survey.roofType ?? "—"} / {survey.roofAreaSqm ?? "—"} sqm</dd></div>
                <div><dt className="text-slate-500">Required capacity</dt><dd>{survey.requiredCapacityKw ?? "—"} kW</dd></div>
                <div><dt className="text-slate-500">Notes</dt><dd>{survey.notes ?? "—"}</dd></div>
              </dl>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <Link href={`/dashboard/projects/${survey.projectId}`} className="text-sky-700 hover:underline">
                {survey.project.code} — {survey.project.title}
              </Link>
              <p className="mt-2 text-slate-500">
                Customer: {survey.project.customer.fullName}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attachments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {survey.attachments.length === 0 ? (
                <p className="text-sm text-slate-500">No files uploaded.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {survey.attachments.map((a) => (
                    <li key={a.id}>
                      <a
                        href={`/api/uploads${a.filePath.replace(/^\/uploads/, "")}`}
                        className="text-sky-700 hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {a.fileName}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              {canWrite ? (
                <ActionForm action={boundAttach} submitLabel="Upload file" className="space-y-3">
                  <Input name="file" type="file" required />
                </ActionForm>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
