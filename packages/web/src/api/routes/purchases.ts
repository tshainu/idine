import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, and, desc } from "drizzle-orm";

export const purchases = new Hono()
  .get("/", async (c) => {
    const branchId = c.req.query("branchId");
    const all = branchId
      ? await db.select().from(schema.purchases).where(eq(schema.purchases.branchId, parseInt(branchId))).orderBy(desc(schema.purchases.createdAt))
      : await db.select().from(schema.purchases).orderBy(desc(schema.purchases.createdAt));
    return c.json({ purchases: all }, 200);
  })
  .post("/", async (c) => {
    const body = await c.req.json();
    const total = (Number(body.qty) || 1) * (Number(body.unitCost) || 0);
    const amountPaid = Number(body.amountPaid) || 0;
    const dueAmount = Math.max(0, total - amountPaid);
    const status = dueAmount <= 0 ? "paid" : amountPaid > 0 ? "partial" : "due";
    const [p] = await db.insert(schema.purchases).values({
      branchId: body.branchId ? parseInt(body.branchId) : null,
      supplierId: body.supplierId ? parseInt(body.supplierId) : null,
      supplierName: body.supplierName,
      purchaseItemId: body.purchaseItemId ? parseInt(body.purchaseItemId) : null,
      itemDescription: body.itemDescription,
      invoiceNumber: body.invoiceNumber || null,
      qty: Number(body.qty) || 1,
      unitCost: Number(body.unitCost) || 0,
      total,
      amountPaid,
      dueAmount,
      status,
      purchaseDate: body.purchaseDate,
      notes: body.notes || null,
    }).returning();

    // If initial payment, record it
    if (amountPaid > 0) {
      await db.insert(schema.purchasePayments).values({
        purchaseId: p.id,
        branchId: p.branchId,
        amount: amountPaid,
        paymentDate: body.purchaseDate,
        method: body.paymentMethod || "cash",
        notes: "Initial payment",
      });
    }

    return c.json({ purchase: p }, 201);
  })
  .patch("/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const total = (Number(body.qty) || 1) * (Number(body.unitCost) || 0);

    // Recalculate from existing payments
    const allPayments = await db.select().from(schema.purchasePayments).where(eq(schema.purchasePayments.purchaseId, id));
    const totalPaid = allPayments.reduce((s, p) => s + Number(p.amount), 0);
    const dueAmount = Math.max(0, total - totalPaid);
    const status = dueAmount <= 0 ? "paid" : totalPaid > 0 ? "partial" : "due";

    const [p] = await db.update(schema.purchases).set({
      supplierId: body.supplierId ? parseInt(body.supplierId) : null,
      supplierName: body.supplierName,
      purchaseItemId: body.purchaseItemId ? parseInt(body.purchaseItemId) : null,
      itemDescription: body.itemDescription,
      invoiceNumber: body.invoiceNumber || null,
      qty: Number(body.qty) || 1,
      unitCost: Number(body.unitCost) || 0,
      total,
      amountPaid: totalPaid,
      dueAmount,
      status,
      purchaseDate: body.purchaseDate,
      notes: body.notes || null,
    }).where(eq(schema.purchases.id, id)).returning();
    return c.json({ purchase: p }, 200);
  })
  .delete("/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    await db.delete(schema.purchasePayments).where(eq(schema.purchasePayments.purchaseId, id));
    await db.delete(schema.purchases).where(eq(schema.purchases.id, id));
    return c.json({ ok: true }, 200);
  });
