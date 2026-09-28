import { requireCapability } from "@/lib/session";
import { listProjects } from "@/lib/services/projects";
import { PageHeader, Card, CardContent } from "@/components/ui/card";
import { QuotationForm } from "@/components/forms/quotation-form";

export default async function NewQuotationPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  await requireCapability("quotations_write");
  const { projectId } = await searchParams;
  const projects = (await listProjects())
    .filter((p) => p.design && !p.quotation)
    .map((p) => ({
      id: p.id,
      code: p.code,
      title: p.title,
      capacityKw: p.design?.capacityKw ?? null,
    }));

  return (
    <div>
      <PageHeader
        title="New quotation"
        description="Build a quotation from an approved design"
      />
      <Card className="max-w-4xl">
        <CardContent className="pt-6">
          <QuotationForm projects={projects} defaultProjectId={projectId} />
        </CardContent>
      </Card>
    </div>
  );
}
