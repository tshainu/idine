import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";

export const variations = new Hono()
  // GET /variations?menuItemId=1
  .get("/", async (c) => {
    const menuItemId = c.req.query("menuItemId");
    if (!menuItemId) return c.json({ variations: [] }, 200);
    const rows = await db
      .select()
      .from(schema.menuItemVariations)
      .where(eq(schema.menuItemVariations.menuItemId, parseInt(menuItemId)));
    return c.json({ variations: rows }, 200);
  })
  // POST /variations
  .post("/", async (c) => {
    const body = await c.req.json();
    const [row] = await db.insert(schema.menuItemVariations).values(body).returning();
    return c.json({ variation: row }, 201);
  })
  // PATCH /variations/:id
  .patch("/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const [row] = await db
      .update(schema.menuItemVariations)
      .set(body)
      .where(eq(schema.menuItemVariations.id, id))
      .returning();
    return c.json({ variation: row }, 200);
  })
  // DELETE /variations/:id
  .delete("/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    await db.delete(schema.menuItemVariations).where(eq(schema.menuItemVariations.id, id));
    return c.json({ ok: true }, 200);
  });
