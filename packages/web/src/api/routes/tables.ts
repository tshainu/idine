import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, and, inArray, sql } from "drizzle-orm";

export const tables = new Hono()
  .get("/", async (c) => {
    const branchId = c.req.query("branchId");
    const all = branchId
      ? await db.select().from(schema.tables).where(eq(schema.tables.branchId, parseInt(branchId)))
      : await db.select().from(schema.tables);

    // fetch active orders (not paid/cancelled) grouped by tableId
    const tableIds = all.map(t => t.id);
    let activeOrders: any[] = [];
    if (tableIds.length > 0) {
      activeOrders = await db
        .select({
          tableId: schema.orders.tableId,
          orderId: schema.orders.id,
          orderNumber: schema.orders.orderNumber,
          status: schema.orders.status,
          createdAt: schema.orders.createdAt,
          itemCount: sql<number>`(select count(*) from order_items where order_items.order_id = ${schema.orders.id})`,
          customerName: schema.orders.customerName,
        })
        .from(schema.orders)
        .where(
          and(
            inArray(schema.orders.tableId, tableIds),
            inArray(schema.orders.status, ["pending", "confirmed", "draft", "served"])
          )
        );
    }

    // map tableId -> order info
    const orderByTable: Record<number, any> = {};
    for (const o of activeOrders) {
      if (o.tableId) orderByTable[o.tableId] = o;
    }

    const enriched = all.map(t => ({
      ...t,
      activeOrder: orderByTable[t.id] ?? null,
    }));

    return c.json({ tables: enriched }, 200);
  })
  .post("/", async (c) => {
    const body = await c.req.json();
    const [table] = await db.insert(schema.tables).values(body).returning();
    return c.json({ table }, 201);
  })
  .patch("/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const [table] = await db.update(schema.tables).set(body).where(eq(schema.tables.id, id)).returning();
    return c.json({ table }, 200);
  })
  .delete("/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    await db.update(schema.tables).set({ isActive: false }).where(eq(schema.tables.id, id));
    return c.json({ ok: true }, 200);
  });
