import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";

export const promotions = new Hono()
  .get("/", async (c) => {
    const branchId = c.req.query("branchId");
    const all = branchId
      ? await db.select().from(schema.promotions).where(eq(schema.promotions.branchId, parseInt(branchId))).orderBy(schema.promotions.name)
      : await db.select().from(schema.promotions).orderBy(schema.promotions.name);
    return c.json({ promotions: all }, 200);
  })
  .post("/", async (c) => {
    const body = await c.req.json();
    const [p] = await db.insert(schema.promotions).values(body).returning();
    return c.json({ promotion: p }, 201);
  })
  .patch("/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const [p] = await db.update(schema.promotions).set(body).where(eq(schema.promotions.id, id)).returning();
    return c.json({ promotion: p }, 200);
  })
  .delete("/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    await db.delete(schema.promotions).where(eq(schema.promotions.id, id));
    return c.json({ ok: true }, 200);
  });
