import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";

export const branches = new Hono()
  .get("/", async (c) => {
    const all = await db.select().from(schema.branches);
    return c.json({ branches: all }, 200);
  })
  .post("/", async (c) => {
    const body = await c.req.json();
    const [branch] = await db.insert(schema.branches).values(body).returning();
    return c.json({ branch }, 201);
  })
  .get("/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    const [branch] = await db.select().from(schema.branches).where(eq(schema.branches.id, id));
    if (!branch) return c.json({ error: "Not found" }, 404);
    return c.json({ branch }, 200);
  })
  .patch("/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const [branch] = await db.update(schema.branches).set(body).where(eq(schema.branches.id, id)).returning();
    return c.json({ branch }, 200);
  })
  .delete("/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    await db.update(schema.branches).set({ isActive: false }).where(eq(schema.branches.id, id));
    return c.json({ ok: true }, 200);
  });
