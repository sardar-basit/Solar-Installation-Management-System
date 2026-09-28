import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const users = [
    { email: "admin@sims.local", username: "admin", name: "System Admin", role: Role.ADMIN },
    { email: "sales@sims.local", username: "sales", name: "Sara Sales", role: Role.SALES },
    { email: "surveyor@sims.local", username: "surveyor", name: "Sam Surveyor", role: Role.SITE_SURVEYOR },
    { email: "tech@sims.local", username: "tech", name: "Tom Technician", role: Role.INSTALLATION_TECH },
    { email: "pm@sims.local", username: "pm", name: "Pat Manager", role: Role.PROJECT_MANAGER },
    { email: "accountant@sims.local", username: "accountant", name: "Ali Accountant", role: Role.ACCOUNTANT },
    { email: "inventory@sims.local", username: "inventory", name: "Ivy Store", role: Role.INVENTORY_MANAGER },
    { email: "customer@sims.local", username: "customer", name: "Chris Customer", role: Role.CUSTOMER },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash, name: u.name, role: u.role, active: true },
      create: { ...u, passwordHash },
    });
  }

  const customerUser = await prisma.user.findUnique({
    where: { email: "customer@sims.local" },
  });

  const customer = await prisma.customer.upsert({
    where: { userId: customerUser!.id },
    update: {},
    create: {
      userId: customerUser!.id,
      fullName: "Chris Customer",
      email: "customer@sims.local",
      phone: "+92-300-1112233",
      address: "12 Garden Road",
      city: "Lahore",
      siteAddress: "Plot 45, DHA Phase 5",
      siteCity: "Lahore",
      siteNotes: "South-facing roof, good access",
    },
  });

  // Also create customer without portal user
  const walkIn = await prisma.customer.findFirst({
    where: { email: "ahmed@example.com" },
  });
  if (!walkIn) {
    await prisma.customer.create({
      data: {
        fullName: "Ahmed Khan",
        email: "ahmed@example.com",
        phone: "+92-321-5556677",
        address: "88 Mall Road",
        city: "Lahore",
        siteAddress: "88 Mall Road Rooftop",
        siteCity: "Lahore",
      },
    });
  }

  const inventoryDefaults = [
    { sku: "PNL-550", name: "550W Mono Panel", category: "PANEL" as const, quantity: 200, minLevel: 40, unitCost: 28000 },
    { sku: "INV-5K", name: "5kW Hybrid Inverter", category: "INVERTER" as const, quantity: 25, minLevel: 5, unitCost: 185000 },
    { sku: "BAT-5KWH", name: "5kWh Lithium Battery", category: "BATTERY" as const, quantity: 40, minLevel: 8, unitCost: 220000 },
    { sku: "CBL-DC6", name: "DC Solar Cable 6mm", category: "CABLE" as const, quantity: 500, minLevel: 100, unitCost: 350, unit: "m" },
    { sku: "MNT-RAIL", name: "Mounting Rail Kit", category: "MOUNTING" as const, quantity: 80, minLevel: 15, unitCost: 12000 },
  ];

  for (const item of inventoryDefaults) {
    await prisma.inventoryItem.upsert({
      where: { sku: item.sku },
      update: {},
      create: item,
    });
  }

  console.log("Seed complete. Default password for all users: password123");
  console.log("Customer linked:", customer.fullName);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
