import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";

export const printers = new Hono()
  .get("/", async (c) => {
    const branchId = c.req.query("branchId");
    const all = branchId
      ? await db.select().from(schema.printers).where(eq(schema.printers.branchId, parseInt(branchId)))
      : await db.select().from(schema.printers);
    return c.json({ printers: all }, 200);
  })
  .post("/", async (c) => {
    const body = await c.req.json();
    const [printer] = await db.insert(schema.printers).values(body).returning();
    return c.json({ printer }, 201);
  })
  .patch("/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const [printer] = await db.update(schema.printers).set(body).where(eq(schema.printers.id, id)).returning();
    return c.json({ printer }, 200);
  })
  .delete("/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    await db.update(schema.printers).set({ isActive: false }).where(eq(schema.printers.id, id));
    return c.json({ ok: true }, 200);
  });
