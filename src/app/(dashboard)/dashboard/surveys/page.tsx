import Link from "next/link";
import { requireSession } from "@/lib/session";
import { can } from "@/lib/rbac";
import { listSurveys } from "@/lib/services/surveys";
import { formatDate } from "@/lib/utils";
import { PageHeader, EmptyState } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";

export default async function SurveysPage() {
  const session = await requireSession();
  const surveys = await listSurveys();
  const canWrite = can(session.user.role, "surveys_write");

  return (
    <div>
      <PageHeader
        title="Site surveys"
        description="Roof and site assessments"
        actions={
          canWrite ? (
            <LinkButton href="/dashboard/surveys/new">New survey</LinkButton>
          ) : null
        }
      />
      {surveys.length === 0 ? (
        <EmptyState message="No surveys yet." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="data">
            <thead>
              <tr>
                <th>Project</th>
                <th>Surveyor</th>
                <th>Capacity req.</th>
                <th>Surveyed</th>
              </tr>
            </thead>
            <tbody>
              {surveys.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link
                      href={`/dashboard/surveys/${s.id}`}
                      className="font-medium text-sky-700 hover:underline"
                    >
                      {s.project.code}
                    </Link>
                    <div className="text-slate-500">{s.project.title}</div>
                  </td>
                  <td>{s.surveyor.name}</td>
                  <td>
                    {s.requiredCapacityKw != null
                      ? `${s.requiredCapacityKw} kW`
                      : "—"}
                  </td>
                  <td>{formatDate(s.surveyedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
