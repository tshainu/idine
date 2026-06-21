import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, and } from "drizzle-orm";

export const settings = new Hono()
  // GET /settings?branchId=1  → returns { settings: { key: value, ... } }
  .get("/", async (c) => {
    const branchId = parseInt(c.req.query("branchId") || "1");
    const rows = await db
      .select()
      .from(schema.branchSettings)
      .where(eq(schema.branchSettings.branchId, branchId));
    const settings: Record<string, string> = {};
    for (const row of rows) settings[row.key] = row.value ?? "";
    return c.json({ settings }, 200);
  })
  // POST /settings  → body: { branchId, settings: { key: value, ... } }
  // Upserts all keys
  .post("/", async (c) => {
    const body = await c.req.json() as { branchId: number; settings: Record<string, string> };
    const { branchId, settings: kv } = body;
    for (const [key, value] of Object.entries(kv)) {
      const existing = await db
        .select()
        .from(schema.branchSettings)
        .where(and(eq(schema.branchSettings.branchId, branchId), eq(schema.branchSettings.key, key)));
      if (existing.length > 0) {
        await db
          .update(schema.branchSettings)
          .set({ value: String(value) })
          .where(and(eq(schema.branchSettings.branchId, branchId), eq(schema.branchSettings.key, key)));
      } else {
        await db.insert(schema.branchSettings).values({ branchId, key, value: String(value) });
      }
    }
    return c.json({ ok: true }, 200);
  });
