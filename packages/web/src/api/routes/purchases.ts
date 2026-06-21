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
    const [p] = await db.insert(schema.purchases).values({ ...body, total }).returning();
    return c.json({ purchase: p }, 201);
  })
  .patch("/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const total = (Number(body.qty) || 1) * (Number(body.unitCost) || 0);
    const [p] = await db.update(schema.purchases).set({ ...body, total }).where(eq(schema.purchases.id, id)).returning();
    return c.json({ purchase: p }, 200);
  })
  .delete("/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    await db.delete(schema.purchases).where(eq(schema.purchases.id, id));
    return c.json({ ok: true }, 200);
  });
