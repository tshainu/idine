import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, and, desc, ne, inArray } from "drizzle-orm";

function generateOrderNumber(id: number): string {
  return `ORD-${String(id).padStart(4, "0")}`;
}

export const orders = new Hono()
  .get("/", async (c) => {
    const branchId = c.req.query("branchId");
    const status = c.req.query("status");
    const conditions: any[] = [];
    if (branchId) conditions.push(eq(schema.orders.branchId, parseInt(branchId)));
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
    // Create order with temp number first
    const [order] = await db.insert(schema.orders).values({
      ...body,
      orderNumber: "TEMP",
    }).returning();
    // Update with proper order number based on ID
    const orderNumber = generateOrderNumber(order.id);
    const [updated] = await db.update(schema.orders)
      .set({ orderNumber })
      .where(eq(schema.orders.id, order.id))
      .returning();
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
    return c.json({ order }, 200);
  });
