import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, like, or, desc } from "drizzle-orm";

export const customers = new Hono()
  .get("/", async (c) => {
    const branchId = c.req.query("branchId");
    const search = c.req.query("search");
    let all;
    if (search) {
      all = await db.select().from(schema.customers).where(
        or(like(schema.customers.name, `%${search}%`), like(schema.customers.phone, `%${search}%`))
      );
    } else if (branchId) {
      all = await db.select().from(schema.customers).where(eq(schema.customers.branchId, parseInt(branchId)));
    } else {
      all = await db.select().from(schema.customers);
    }
    return c.json({ customers: all }, 200);
  })
  .post("/", async (c) => {
    const body = await c.req.json();
    const [customer] = await db.insert(schema.customers).values(body).returning();
    return c.json({ customer }, 201);
  })
  .patch("/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const [customer] = await db.update(schema.customers).set(body).where(eq(schema.customers.id, id)).returning();
    return c.json({ customer }, 200);
  })
  .delete("/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    await db.delete(schema.customers).where(eq(schema.customers.id, id));
    return c.json({ ok: true }, 200);
  });
