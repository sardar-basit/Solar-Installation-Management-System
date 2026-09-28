import { InventoryCategory, Role, StockMovementType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { notifyByRole } from "@/lib/notify";

export const inventoryItemSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  category: z.nativeEnum(InventoryCategory),
  quantity: z.number().int().nonnegative().default(0),
  minLevel: z.number().int().nonnegative().default(5),
  unitCost: z.number().nonnegative().default(0),
  unit: z.string().min(1).default("pcs"),
  description: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

export const inventoryItemUpdateSchema = inventoryItemSchema.partial();

async function notifyLowStock(sku: string, name: string, quantity: number, minLevel: number) {
  if (quantity > minLevel) return;
  const body = `${name} (${sku}) is at ${quantity} (min ${minLevel})`;
  await notifyByRole(Role.INVENTORY_MANAGER, "Low stock alert", body, "/dashboard/inventory");
  await notifyByRole(Role.ADMIN, "Low stock alert", body, "/dashboard/inventory");
}

export async function listItems(filters: { search?: string; active?: boolean } = {}) {
  const q = filters.search?.trim();
  return prisma.inventoryItem.findMany({
    where: {
      ...(filters.active === undefined ? {} : { active: filters.active }),
      ...(q
        ? {
            OR: [
              { sku: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

export async function createItem(
  data: z.infer<typeof inventoryItemSchema>,
  userId: string
) {
  const parsed = inventoryItemSchema.parse(data);
  const item = await prisma.inventoryItem.create({
    data: {
      sku: parsed.sku.trim().toUpperCase(),
      name: parsed.name.trim(),
      category: parsed.category,
      quantity: parsed.quantity ?? 0,
      minLevel: parsed.minLevel ?? 5,
      unitCost: parsed.unitCost ?? 0,
      unit: parsed.unit ?? "pcs",
      description: parsed.description ?? null,
      active: parsed.active ?? true,
    },
  });

  if (item.quantity > 0) {
    await prisma.stockMovement.create({
      data: {
        itemId: item.id,
        type: StockMovementType.IN,
        quantity: item.quantity,
        note: "Initial stock",
        userId,
      },
    });
  }

  await audit("CREATE", "InventoryItem", item.id, userId, `Created ${item.sku}`);
  await notifyLowStock(item.sku, item.name, item.quantity, item.minLevel);
  return item;
}

export async function updateItem(
  id: string,
  data: z.infer<typeof inventoryItemUpdateSchema>,
  userId: string
) {
  const parsed = inventoryItemUpdateSchema.parse(data);
  const existing = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!existing) throw new Error("Inventory item not found");

  // Quantity changes go through adjustStock / issueToProject
  const { quantity: _q, ...rest } = parsed;

  const item = await prisma.inventoryItem.update({
    where: { id },
    data: {
      ...(rest.sku !== undefined ? { sku: rest.sku.trim().toUpperCase() } : {}),
      ...(rest.name !== undefined ? { name: rest.name.trim() } : {}),
      ...(rest.category !== undefined ? { category: rest.category } : {}),
      ...(rest.minLevel !== undefined ? { minLevel: rest.minLevel } : {}),
      ...(rest.unitCost !== undefined ? { unitCost: rest.unitCost } : {}),
      ...(rest.unit !== undefined ? { unit: rest.unit } : {}),
      ...(rest.description !== undefined ? { description: rest.description } : {}),
      ...(rest.active !== undefined ? { active: rest.active } : {}),
    },
  });

  await audit("UPDATE", "InventoryItem", id, userId, `Updated ${item.sku}`);
  return item;
}

export async function adjustStock(
  itemId: string,
  type: "IN" | "OUT" | "ADJUST",
  quantity: number,
  note: string | null | undefined,
  userId: string
) {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("Quantity must be a positive integer");
  }

  const movementType =
    type === "IN"
      ? StockMovementType.IN
      : type === "OUT"
        ? StockMovementType.OUT
        : StockMovementType.ADJUST;

  const item = await prisma.$transaction(async (tx) => {
    const current = await tx.inventoryItem.findUnique({ where: { id: itemId } });
    if (!current) throw new Error("Inventory item not found");

    let nextQty = current.quantity;
    if (type === "IN") {
      nextQty = current.quantity + quantity;
    } else if (type === "OUT") {
      if (current.quantity < quantity) {
        throw new Error("Insufficient stock");
      }
      nextQty = current.quantity - quantity;
    } else {
      // ADJUST: set absolute quantity
      nextQty = quantity;
    }

    const updated = await tx.inventoryItem.update({
      where: { id: itemId },
      data: { quantity: nextQty },
    });

    await tx.stockMovement.create({
      data: {
        itemId,
        type: movementType,
        quantity: type === "ADJUST" ? nextQty : quantity,
        note: note ?? null,
        userId,
      },
    });

    return updated;
  });

  await audit(
    "STOCK_ADJUST",
    "InventoryItem",
    itemId,
    userId,
    `${type} qty=${quantity}`
  );

  await notifyLowStock(item.sku, item.name, item.quantity, item.minLevel);
  return item;
}

export async function issueToProject(
  projectId: string,
  itemId: string,
  quantity: number,
  userId: string,
  note?: string | null
) {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("Quantity must be a positive integer");
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error("Project not found");

  const result = await prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) throw new Error("Inventory item not found");
    if (!item.active) throw new Error("Inventory item is inactive");
    if (item.quantity < quantity) {
      throw new Error(
        `Insufficient stock for ${item.sku}: have ${item.quantity}, need ${quantity}`
      );
    }

    const updated = await tx.inventoryItem.update({
      where: { id: itemId },
      data: { quantity: item.quantity - quantity },
    });

    const issue = await tx.inventoryIssue.create({
      data: {
        projectId,
        itemId,
        quantity,
        note: note ?? null,
      },
    });

    await tx.stockMovement.create({
      data: {
        itemId,
        type: StockMovementType.ISSUE,
        quantity,
        note: note ?? `Issued to ${project.code}`,
        userId,
      },
    });

    return { issue, item: updated };
  });

  await audit(
    "ISSUE",
    "InventoryIssue",
    result.issue.id,
    userId,
    `Issued ${quantity} of ${result.item.sku} to ${project.code}`
  );

  await notifyLowStock(
    result.item.sku,
    result.item.name,
    result.item.quantity,
    result.item.minLevel
  );

  return result;
}
