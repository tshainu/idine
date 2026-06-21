import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, desc } from "drizzle-orm";

export const expenses = new Hono()
  .get("/", async (c) => {
    const branchId = c.req.query("branchId");
    const all = branchId
      ? await db.select().from(schema.expenses).where(eq(schema.expenses.branchId, parseInt(branchId))).orderBy(desc(schema.expenses.createdAt))
      : await db.select().from(schema.expenses).orderBy(desc(schema.expenses.createdAt));
    return c.json({ expenses: all }, 200);
  })
  .post("/", async (c) => {
    const body = await c.req.json();
    const [e] = await db.insert(schema.expenses).values(body).returning();
    return c.json({ expense: e }, 201);
  })
  .patch("/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const [e] = await db.update(schema.expenses).set(body).where(eq(schema.expenses.id, id)).returning();
    return c.json({ expense: e }, 200);
  })
  .delete("/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    await db.delete(schema.expenses).where(eq(schema.expenses.id, id));
    return c.json({ ok: true }, 200);
  });
