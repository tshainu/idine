import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, and } from "drizzle-orm";

export const users = new Hono()
  .get("/", async (c) => {
    const branchId = c.req.query("branchId");
    const query = db.select().from(schema.users);
    const all = branchId
      ? await db.select().from(schema.users).where(eq(schema.users.branchId, parseInt(branchId)))
      : await db.select().from(schema.users);
    return c.json({ users: all }, 200);
  })
  .post("/", async (c) => {
    const body = await c.req.json();
    const [user] = await db.insert(schema.users).values(body).returning();
    return c.json({ user }, 201);
  })
  .post("/login", async (c) => {
    const { pin, branchId } = await c.req.json();
    const conditions = [eq(schema.users.pin, pin), eq(schema.users.isActive, true)];
    if (branchId) conditions.push(eq(schema.users.branchId, parseInt(branchId)));
    const [user] = await db.select().from(schema.users).where(and(...conditions));
    if (!user) return c.json({ error: "Invalid PIN" }, 401);
    return c.json({ user }, 200);
  })
  .patch("/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const [user] = await db.update(schema.users).set(body).where(eq(schema.users.id, id)).returning();
    return c.json({ user }, 200);
  })
  .delete("/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    await db.update(schema.users).set({ isActive: false }).where(eq(schema.users.id, id));
    return c.json({ ok: true }, 200);
  });
