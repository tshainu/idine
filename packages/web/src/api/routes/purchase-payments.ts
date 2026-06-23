import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, desc } from "drizzle-orm";

export const purchasePayments = new Hono()
  .get("/", async (c) => {
    const purchaseId = c.req.query("purchaseId");
    const all = purchaseId
      ? await db.select().from(schema.purchasePayments).where(eq(schema.purchasePayments.purchaseId, parseInt(purchaseId))).orderBy(desc(schema.purchasePayments.createdAt))
      : await db.select().from(schema.purchasePayments).orderBy(desc(schema.purchasePayments.createdAt));
    return c.json({ payments: all }, 200);
  })
  .post("/", async (c) => {
    const body = await c.req.json();
    const { purchaseId, amount, paymentDate, method, reference, notes, branchId } = body;

    // Insert payment
    const [payment] = await db.insert(schema.purchasePayments).values({
      purchaseId: parseInt(purchaseId),
      branchId: branchId ? parseInt(branchId) : null,
      amount: Number(amount),
      paymentDate,
      method: method || "cash",
      reference: reference || null,
      notes: notes || null,
    }).returning();

    // Recalculate purchase totals
    const allPayments = await db.select().from(schema.purchasePayments).where(eq(schema.purchasePayments.purchaseId, parseInt(purchaseId)));
    const totalPaid = allPayments.reduce((s, p) => s + Number(p.amount), 0);

    const [purchase] = await db.select().from(schema.purchases).where(eq(schema.purchases.id, parseInt(purchaseId)));
    if (purchase) {
      const due = Math.max(0, Number(purchase.total) - totalPaid);
      const status = due <= 0 ? "paid" : totalPaid > 0 ? "partial" : "due";
      await db.update(schema.purchases).set({ amountPaid: totalPaid, dueAmount: due, status }).where(eq(schema.purchases.id, parseInt(purchaseId)));
    }

    return c.json({ payment }, 201);
  })
  .delete("/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    const [payment] = await db.select().from(schema.purchasePayments).where(eq(schema.purchasePayments.id, id));
    await db.delete(schema.purchasePayments).where(eq(schema.purchasePayments.id, id));

    if (payment) {
      // Recalculate
      const allPayments = await db.select().from(schema.purchasePayments).where(eq(schema.purchasePayments.purchaseId, payment.purchaseId));
      const totalPaid = allPayments.reduce((s, p) => s + Number(p.amount), 0);
      const [purchase] = await db.select().from(schema.purchases).where(eq(schema.purchases.id, payment.purchaseId));
      if (purchase) {
        const due = Math.max(0, Number(purchase.total) - totalPaid);
        const status = due <= 0 ? "paid" : totalPaid > 0 ? "partial" : "due";
        await db.update(schema.purchases).set({ amountPaid: totalPaid, dueAmount: due, status }).where(eq(schema.purchases.id, payment.purchaseId));
      }
    }

    return c.json({ ok: true }, 200);
  });
