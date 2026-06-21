import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, and, asc } from "drizzle-orm";

export const menuItems = new Hono()
  .get("/", async (c) => {
    const branchId = c.req.query("branchId");
    const categoryId = c.req.query("categoryId");
    const conditions = [eq(schema.menuItems.isActive, true)];
    if (branchId) conditions.push(eq(schema.menuItems.branchId, parseInt(branchId)));
    if (categoryId) conditions.push(eq(schema.menuItems.categoryId, parseInt(categoryId)));
    const items = await db.select().from(schema.menuItems).where(and(...conditions)).orderBy(asc(schema.menuItems.sortOrder));
    return c.json({ menuItems: items }, 200);
  })
  .post("/", async (c) => {
    const body = await c.req.json();
    const [item] = await db.insert(schema.menuItems).values(body).returning();
    return c.json({ menuItem: item }, 201);
  })
  .patch("/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const [item] = await db.update(schema.menuItems).set(body).where(eq(schema.menuItems.id, id)).returning();
    return c.json({ menuItem: item }, 200);
  })
  .delete("/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    await db.update(schema.menuItems).set({ isActive: false }).where(eq(schema.menuItems.id, id));
    return c.json({ ok: true }, 200);
  });
