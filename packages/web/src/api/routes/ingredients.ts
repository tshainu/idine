import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, desc } from "drizzle-orm";

export const ingredients = new Hono()
  .get("/", async (c) => {
    const branchId = c.req.query("branchId");
    const all = branchId
      ? await db.select().from(schema.ingredients).where(eq(schema.ingredients.branchId, parseInt(branchId))).orderBy(schema.ingredients.name)
      : await db.select().from(schema.ingredients).orderBy(schema.ingredients.name);
    return c.json({ ingredients: all }, 200);
  })
  .post("/", async (c) => {
    const body = await c.req.json();
    const [i] = await db.insert(schema.ingredients).values(body).returning();
    return c.json({ ingredient: i }, 201);
  })
  .patch("/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const [i] = await db.update(schema.ingredients).set(body).where(eq(schema.ingredients.id, id)).returning();
    return c.json({ ingredient: i }, 200);
  })
  .delete("/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    await db.delete(schema.ingredients).where(eq(schema.ingredients.id, id));
    return c.json({ ok: true }, 200);
  });
