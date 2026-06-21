import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";

export const tables = new Hono()
  .get("/", async (c) => {
    const branchId = c.req.query("branchId");
    const all = branchId
      ? await db.select().from(schema.tables).where(eq(schema.tables.branchId, parseInt(branchId)))
      : await db.select().from(schema.tables);
    return c.json({ tables: all }, 200);
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
