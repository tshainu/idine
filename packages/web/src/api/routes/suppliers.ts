import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, and, desc } from "drizzle-orm";

export const suppliers = new Hono()
  .get("/", async (c) => {
    const branchId = c.req.query("branchId");
    const all = branchId
      ? await db.select().from(schema.suppliers).where(eq(schema.suppliers.branchId, parseInt(branchId))).orderBy(desc(schema.suppliers.createdAt))
      : await db.select().from(schema.suppliers).orderBy(desc(schema.suppliers.createdAt));
    return c.json({ suppliers: all }, 200);
  })
  .post("/", async (c) => {
    const body = await c.req.json();
    const [s] = await db.insert(schema.suppliers).values(body).returning();
    return c.json({ supplier: s }, 201);
  })
  .patch("/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const [s] = await db.update(schema.suppliers).set(body).where(eq(schema.suppliers.id, id)).returning();
    return c.json({ supplier: s }, 200);
  })
  .delete("/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    await db.update(schema.suppliers).set({ isActive: false }).where(eq(schema.suppliers.id, id));
    return c.json({ ok: true }, 200);
  });
