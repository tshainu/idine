import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";

export const orderItems = new Hono()
  .get("/", async (c) => {
    const orderId = c.req.query("orderId");
    if (!orderId) return c.json({ error: "orderId required" }, 400);
    const items = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, parseInt(orderId)));
    return c.json({ orderItems: items }, 200);
  })
  .post("/", async (c) => {
    const body = await c.req.json();
    const total = body.price * body.qty;
    const [item] = await db.insert(schema.orderItems).values({ ...body, total }).returning();
    return c.json({ orderItem: item }, 201);
  })
  .post("/bulk", async (c) => {
    const { items } = await c.req.json();
    const withTotals = items.map((i: any) => ({ ...i, total: i.price * i.qty }));
    const created = await db.insert(schema.orderItems).values(withTotals).returning();
    return c.json({ orderItems: created }, 201);
  })
  .patch("/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const [item] = await db.update(schema.orderItems).set(body).where(eq(schema.orderItems.id, id)).returning();
    return c.json({ orderItem: item }, 200);
  })
  .delete("/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    await db.delete(schema.orderItems).where(eq(schema.orderItems.id, id));
    return c.json({ ok: true }, 200);
  });
