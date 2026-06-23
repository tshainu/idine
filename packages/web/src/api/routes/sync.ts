import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, and, count, max } from "drizzle-orm";

const BRANCH_ID = parseInt(process.env.CLOUD_SYNC_BRANCH_ID ?? "1");

export const sync = new Hono()
  .get("/status", async (c) => {
    const [{ pending }] = await db
      .select({ pending: count() })
      .from(schema.outbox)
      .where(and(eq(schema.outbox.synced, false), eq(schema.outbox.branchId, BRANCH_ID)));

    const [{ lastSyncedAt }] = await db
      .select({ lastSyncedAt: max(schema.outbox.syncedAt) })
      .from(schema.outbox)
      .where(and(eq(schema.outbox.synced, true), eq(schema.outbox.branchId, BRANCH_ID)));

    const cloudUrl = process.env.CLOUD_SYNC_URL ?? "";
    let online = false;
    if (cloudUrl) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 3000);
        const res = await fetch(cloudUrl.replace(/\/sync$/, "/health"), { method: "HEAD", signal: ctrl.signal });
        clearTimeout(t);
        online = res.ok || res.status < 500;
      } catch { online = false; }
    }

    return c.json({ pending, lastSyncedAt: lastSyncedAt ?? null, online, cloudEnabled: !!cloudUrl }, 200);
  });
