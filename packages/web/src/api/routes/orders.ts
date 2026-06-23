import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, and, desc, ne, inArray } from "drizzle-orm";
import { pushOutbox } from "../sync-worker";

function generateOrderNumber(id: number): string {
  return `ORD-${String(id).padStart(4, "0")}`;
}

export const orders = new Hono()
  .get("/", async (c) => {
    const branchId = c.req.query("branchId");
    const status = c.req.query("status");
    const source = c.req.query("source");
    const conditions: any[] = [];
    if (branchId) conditions.push(eq(schema.orders.branchId, parseInt(branchId)));
    if (source) conditions.push(eq(schema.orders.source, source));
    if (status) conditions.push(eq(schema.orders.status, status));
    else conditions.push(ne(schema.orders.status, "cancelled"));

    const all = conditions.length
      ? await db.select().from(schema.orders).where(and(...conditions)).orderBy(desc(schema.orders.createdAt))
      : await db.select().from(schema.orders).orderBy(desc(schema.orders.createdAt));

    // Always include items
    let ordersWithItems: any[] = all;
    if (all.length > 0) {
      const orderIds = all.map((o) => o.id);
      const allItems = await db.select().from(schema.orderItems).where(inArray(schema.orderItems.orderId, orderIds));
      const itemsByOrder: Record<number, any[]> = {};
      for (const item of allItems) {
        if (!itemsByOrder[item.orderId!]) itemsByOrder[item.orderId!] = [];
        itemsByOrder[item.orderId!].push(item);
      }
      ordersWithItems = all.map((o) => ({ ...o, items: itemsByOrder[o.id] || [] }));
    }
    return c.json({ orders: ordersWithItems }, 200);
  })
  .post("/", async (c) => {
    const body = await c.req.json();
    // Use client-provided orderNumber if present, else generate from ID
    if (body.orderNumber && body.orderNumber !== "TEMP") {
      const [order] = await db.insert(schema.orders).values(body).returning();
      pushOutbox("orders", "insert", order.id, order, order.branchId ?? undefined);
      return c.json({ order }, 201);
    }
    // Fallback: insert with TEMP then update
    const [order] = await db.insert(schema.orders).values({
      ...body,
      orderNumber: "TEMP",
    }).returning();
    const orderNumber = generateOrderNumber(order.id);
    const [updated] = await db.update(schema.orders)
      .set({ orderNumber })
      .where(eq(schema.orders.id, order.id))
      .returning();
    pushOutbox("orders", "insert", updated.id, updated, updated.branchId ?? undefined);
    return c.json({ order: updated }, 201);
  })
  .get("/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, id));
    if (!order) return c.json({ error: "Not found" }, 404);
    const items = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, id));
    return c.json({ order, items }, 200);
  })
  .patch("/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const [order] = await db.update(schema.orders)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(schema.orders.id, id))
      .returning();
    pushOutbox("orders", "update", order.id, order, order.branchId ?? undefined);
    return c.json({ order }, 200);
  })
  .post("/:id/refund", async (c) => {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json() as any;
    const { mode, reason, items: refundItems } = body;

    const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, id));
    if (!order) return c.json({ error: "Order not found" }, 404);
    if (order.status !== "completed" && order.status !== "partially_refunded")
      return c.json({ error: "Only completed orders can be refunded" }, 400);

    const allItems = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, id));

    let refundTotal = 0;
    let finalRefundItems: any[] = [];

    if (mode === "full") {
      refundTotal = order.total;
      finalRefundItems = allItems.map(it => ({ id: it.id, qty: it.qty, name: it.name, price: it.price }));
    } else {
      if (!refundItems || !refundItems.length) return c.json({ error: "No items selected for partial refund" }, 400);
      finalRefundItems = refundItems;
      refundTotal = refundItems.reduce((s: number, it: any) => s + (it.price * it.qty), 0);
    }

    // Create refund order (negative total)
    const refundNumber = `REF-${order.orderNumber}`;
    const [refund] = await db.insert(schema.orders).values({
      branchId: order.branchId,
      orderNumber: refundNumber,
      type: order.type,
      status: "refunded",
      customerName: order.customerName,
      customerId: order.customerId,
      notes: reason ? `Refund: ${reason}` : `Refund of ${order.orderNumber}`,
      subtotal: -refundTotal,
      total: -refundTotal,
    }).returning();

    // Mark original order
    const newStatus = mode === "full" ? "refunded" : "partially_refunded";
    const [updated] = await db.update(schema.orders)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(schema.orders.id, id))
      .returning();

    pushOutbox("orders", "update", updated.id, updated, updated.branchId ?? undefined);
    pushOutbox("orders", "insert", refund.id, refund, refund.branchId ?? undefined);

    return c.json({ refund: { ...refund, refundItems: finalRefundItems }, original: updated }, 201);
  });
