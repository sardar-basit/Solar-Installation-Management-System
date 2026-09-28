/**
 * End-to-end domain happy-path exercise (no HTTP).
 * Run: npx tsx scripts/happy-path.ts
 */
import { PrismaClient, QuotationStatus, PaymentMethod, MaintenanceStatus } from "@prisma/client";
import {
  createProject,
  updateProjectStatus,
  assignTechnician,
} from "../src/lib/services/projects";
import { createSurvey } from "../src/lib/services/surveys";
import { createDesign } from "../src/lib/services/designs";
import { createQuotationFromDesign, updateQuotationStatus } from "../src/lib/services/quotations";
import { ensureInstallation, updateProgress, verifyInstallation } from "../src/lib/services/installations";
import { issueToProject } from "../src/lib/services/inventory";
import { recordPayment } from "../src/lib/services/payments";
import { createRequest, assignRequest, updateStatus } from "../src/lib/services/maintenance";

const prisma = new PrismaClient();

async function main() {
  const sales = await prisma.user.findUniqueOrThrow({ where: { email: "sales@sims.local" } });
  const surveyor = await prisma.user.findUniqueOrThrow({ where: { email: "surveyor@sims.local" } });
  const tech = await prisma.user.findUniqueOrThrow({ where: { email: "tech@sims.local" } });
  const pm = await prisma.user.findUniqueOrThrow({ where: { email: "pm@sims.local" } });
  const accountant = await prisma.user.findUniqueOrThrow({ where: { email: "accountant@sims.local" } });
  const inventory = await prisma.user.findUniqueOrThrow({ where: { email: "inventory@sims.local" } });
  const customer = await prisma.customer.findFirstOrThrow({ where: { email: "ahmed@example.com" } });
  const panel = await prisma.inventoryItem.findUniqueOrThrow({ where: { sku: "PNL-550" } });

  const project = await createProject(
    {
      title: "Ahmed 10kW Rooftop",
      description: "Happy-path demo project",
      customerId: customer.id,
      managerId: pm.id,
    },
    sales.id
  );
  console.log("Project", project.code);

  await createSurvey(
    {
      projectId: project.id,
      surveyorId: surveyor.id,
      roofType: "Concrete",
      roofAreaSqm: 120,
      roofOrientation: "South",
      monthlyConsumptionKwh: 900,
      requiredCapacityKw: 10,
      notes: "Clear roof",
    },
    surveyor.id
  );

  await createDesign(
    {
      projectId: project.id,
      designerId: surveyor.id,
      capacityKw: 10,
      panelCount: 18,
      inverterCount: 2,
      batteryCount: 2,
      yieldFactorKwhPerKwYear: 1400,
      notes: "Hybrid design",
    },
    surveyor.id
  );

  const quotation = await createQuotationFromDesign(
    project.id,
    [
      { category: "Equipment", description: "550W Panels x18", quantity: 18, unitPrice: 28000 },
      { category: "Equipment", description: "5kW Inverters x2", quantity: 2, unitPrice: 185000 },
      { category: "Labor", description: "Installation labor", quantity: 1, unitPrice: 150000 },
      { category: "Installation", description: "Mounting & wiring", quantity: 1, unitPrice: 80000 },
    ],
    50000,
    20000,
    "Standard package",
    sales.id
  );
  await updateQuotationStatus(quotation.id, QuotationStatus.SENT, sales.id);
  await updateQuotationStatus(quotation.id, QuotationStatus.APPROVED, sales.id);

  await assignTechnician(project.id, tech.id, pm.id);
  await issueToProject(project.id, panel.id, 18, inventory.id);

  const installation = await ensureInstallation(project.id);
  await updateProgress(
    installation.id,
    { progressPercent: 50, equipmentNotes: "Panels mounted", statusNotes: "In progress" },
    tech.id
  );
  await updateProgress(
    installation.id,
    { progressPercent: 100, equipmentNotes: "All equipment installed", statusNotes: "Ready for verify" },
    tech.id
  );
  await verifyInstallation(installation.id, pm.id);

  await recordPayment(
    {
      projectId: project.id,
      amount: 200000,
      method: PaymentMethod.BANK_TRANSFER,
      reference: "TXN-DEMO-1",
      notes: "Advance",
    },
    accountant.id
  );

  const maint = await createRequest(
    {
      projectId: project.id,
      customerId: customer.id,
      title: "Inverter fault light",
      description: "Red LED on inverter after storm",
      priority: "HIGH",
    },
    sales.id
  );
  await assignRequest(maint.id, tech.id, pm.id);
  await updateStatus(maint.id, MaintenanceStatus.IN_PROGRESS, tech.id, "On site");
  await updateStatus(maint.id, MaintenanceStatus.RESOLVED, tech.id, "Replaced surge protector");

  const final = await prisma.project.findUniqueOrThrow({
    where: { id: project.id },
    include: { quotation: true, installation: true, payments: true },
  });
  console.log("Happy path OK:", {
    status: final.status,
    quotation: final.quotation?.status,
    install: final.installation?.progressPercent,
    paid: final.payments.reduce((s, p) => s + p.amount, 0),
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
