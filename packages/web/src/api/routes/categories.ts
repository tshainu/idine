import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, asc } from "drizzle-orm";

export const categories = new Hono()
  .get("/", async (c) => {
    const branchId = c.req.query("branchId");
    const all = branchId
      ? await db.select().from(schema.categories).where(eq(schema.categories.branchId, parseInt(branchId))).orderBy(asc(schema.categories.sortOrder))
      : await db.select().from(schema.categories).orderBy(asc(schema.categories.sortOrder));
    return c.json({ categories: all }, 200);
  })
  .post("/", async (c) => {
    const body = await c.req.json();
    const [cat] = await db.insert(schema.categories).values(body).returning();
    return c.json({ category: cat }, 201);
  })
  .patch("/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const [cat] = await db.update(schema.categories).set(body).where(eq(schema.categories.id, id)).returning();
    return c.json({ category: cat }, 200);
  })
  .delete("/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    const items = await db.select({ id: schema.menuItems.id }).from(schema.menuItems).where(eq(schema.menuItems.categoryId, id));
    if (items.length > 0) {
      return c.json({ error: `Cannot delete — ${items.length} item(s) use this category` }, 400);
    }
    await db.delete(schema.categories).where(eq(schema.categories.id, id));
    return c.json({ ok: true }, 200);
  });
