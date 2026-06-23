import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, desc } from "drizzle-orm";

export const purchaseItems = new Hono()
  .get("/", async (c) => {
    const branchId = c.req.query("branchId");
    const all = branchId
      ? await db.select().from(schema.purchaseItems).where(eq(schema.purchaseItems.branchId, parseInt(branchId))).orderBy(schema.purchaseItems.name)
      : await db.select().from(schema.purchaseItems).orderBy(schema.purchaseItems.name);
    return c.json({ items: all }, 200);
  })
  .post("/", async (c) => {
    const body = await c.req.json();
    const [item] = await db.insert(schema.purchaseItems).values(body).returning();
    return c.json({ item }, 201);
  })
  .patch("/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const [item] = await db.update(schema.purchaseItems).set(body).where(eq(schema.purchaseItems.id, id)).returning();
    return c.json({ item }, 200);
  })
  .delete("/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    await db.update(schema.purchaseItems).set({ isActive: false }).where(eq(schema.purchaseItems.id, id));
    return c.json({ ok: true }, 200);
  });
