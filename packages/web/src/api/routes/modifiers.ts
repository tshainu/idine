import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";

export const modifiers = new Hono()
  .get("/", async (c) => {
    const branchId = c.req.query("branchId");
    const all = branchId
      ? await db.select().from(schema.modifiers).where(eq(schema.modifiers.branchId, parseInt(branchId))).orderBy(schema.modifiers.groupName, schema.modifiers.name)
      : await db.select().from(schema.modifiers).orderBy(schema.modifiers.groupName, schema.modifiers.name);
    return c.json({ modifiers: all }, 200);
  })
  .post("/", async (c) => {
    const body = await c.req.json();
    const [m] = await db.insert(schema.modifiers).values(body).returning();
    return c.json({ modifier: m }, 201);
  })
  .patch("/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const [m] = await db.update(schema.modifiers).set(body).where(eq(schema.modifiers.id, id)).returning();
    return c.json({ modifier: m }, 200);
  })
  .delete("/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    await db.delete(schema.modifiers).where(eq(schema.modifiers.id, id));
    return c.json({ ok: true }, 200);
  });
