import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";

export const comboItems = new Hono()
  .get("/", async (c) => {
    const comboId = c.req.query("comboId");
    if (!comboId) return c.json({ error: "comboId required" }, 400);
    const items = await db.select().from(schema.comboItems).where(eq(schema.comboItems.comboId, parseInt(comboId)));
    return c.json({ comboItems: items }, 200);
  })
  // Replace the full set of included items for a combo in one call — simplest way to keep the
  // management UI's multi-select in sync without diffing individual rows.
  .post("/replace", async (c) => {
    const { comboId, items } = await c.req.json();
    await db.delete(schema.comboItems).where(eq(schema.comboItems.comboId, comboId));
    if (items?.length > 0) {
      await db.insert(schema.comboItems).values(
        items.map((i: any) => ({ comboId, menuItemId: i.menuItemId ?? null, name: i.name, qty: i.qty || 1 }))
      );
    }
    const created = await db.select().from(schema.comboItems).where(eq(schema.comboItems.comboId, comboId));
    return c.json({ comboItems: created }, 200);
  });
