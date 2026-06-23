/**
 * Cloud Sync Worker — Outbox Pattern
 *
 * Each branch is the source of truth for its own data.
 * When records are written locally, a helper `pushOutbox()` queues a row in
 * the `outbox` table.  This worker picks those up and POSTs them to the
 * configured cloud URL (CLOUD_SYNC_URL env var).
 *
 * If internet is down the rows just accumulate and retry on next tick.
 * Conflict resolution: branch owns its data — cloud is a replica/aggregate.
 *
 * Configure:
 *   CLOUD_SYNC_URL=https://your-cloud.example.com/api/sync
 *   CLOUD_SYNC_SECRET=your-shared-secret   (sent as Bearer token)
 *   CLOUD_SYNC_BRANCH_ID=1                 (defaults to 1)
 *
 * Cloud endpoint must accept POST with body:
 *   { branchId, events: [{ id, table, operation, recordId, payload, createdAt }] }
 * and respond { ok: true, syncedIds: [id, ...] }
 */

import { db } from "./database";
import * as schema from "./database/schema";
import { eq, and, lte } from "drizzle-orm";

const CLOUD_URL    = process.env.CLOUD_SYNC_URL ?? "";
const CLOUD_SECRET = process.env.CLOUD_SYNC_SECRET ?? "";
const BRANCH_ID    = parseInt(process.env.CLOUD_SYNC_BRANCH_ID ?? "1");
const BATCH_SIZE   = 50;
const MAX_ATTEMPTS = 5;
const INTERVAL_MS  = 10_000; // 10 s

// ── Public helper — call this inside route handlers after writes ─────────────

export async function pushOutbox(
  table: string,
  operation: "insert" | "update" | "delete",
  recordId: number,
  payload: object,
  branchId = BRANCH_ID,
): Promise<void> {
  try {
    await db.insert(schema.outbox).values({
      branchId,
      table,
      operation,
      recordId,
      payload: JSON.stringify(payload),
    });
  } catch (err: any) {
    // Never crash a request because outbox write failed
    console.warn("[sync-worker] pushOutbox failed:", err.message);
  }
}

// ── Connectivity probe ───────────────────────────────────────────────────────

async function isOnline(): Promise<boolean> {
  if (!CLOUD_URL) return false;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch(CLOUD_URL.replace(/\/sync$/, "/health"), {
      method: "HEAD",
      signal: ctrl.signal,
    });
    clearTimeout(t);
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}

// ── Sync tick ────────────────────────────────────────────────────────────────

async function tick(): Promise<void> {
  if (!CLOUD_URL) return; // sync disabled — no URL configured

  const pending = await db
    .select()
    .from(schema.outbox)
    .where(
      and(
        eq(schema.outbox.synced, false),
        eq(schema.outbox.branchId, BRANCH_ID),
        lte(schema.outbox.attempts, MAX_ATTEMPTS),
      )
    )
    .limit(BATCH_SIZE);

  if (pending.length === 0) return;

  const online = await isOnline();
  if (!online) {
    console.log(`[sync-worker] offline — ${pending.length} event(s) queued`);
    return;
  }

  const events = pending.map((row) => ({
    id: row.id,
    table: row.table,
    operation: row.operation,
    recordId: row.recordId,
    payload: JSON.parse(row.payload),
    createdAt: row.createdAt,
  }));

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10_000);
    const res = await fetch(CLOUD_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(CLOUD_SECRET ? { Authorization: `Bearer ${CLOUD_SECRET}` } : {}),
      },
      body: JSON.stringify({ branchId: BRANCH_ID, events }),
      signal: ctrl.signal,
    });
    clearTimeout(t);

    if (!res.ok) throw new Error(`Cloud responded ${res.status}`);

    const body: any = await res.json();
    const syncedIds: number[] = body.syncedIds ?? pending.map((r) => r.id);

    // Mark synced
    for (const id of syncedIds) {
      await db.update(schema.outbox)
        .set({ synced: true, syncedAt: new Date() })
        .where(eq(schema.outbox.id, id));
    }

    console.log(`[sync-worker] synced ${syncedIds.length} event(s) to cloud ✓`);
  } catch (err: any) {
    // Increment attempt counter on all rows in this batch
    for (const row of pending) {
      await db.update(schema.outbox)
        .set({
          attempts: (row.attempts ?? 0) + 1,
          lastError: String(err.message).slice(0, 255),
        })
        .where(eq(schema.outbox.id, row.id));
    }
    console.warn(`[sync-worker] sync failed: ${err.message}`);
  }
}

// ── Start ────────────────────────────────────────────────────────────────────

export async function runSyncWorker(): Promise<void> {
  if (!CLOUD_URL) {
    console.log("[sync-worker] CLOUD_SYNC_URL not set — running offline-only mode");
    return;
  }
  console.log(`[sync-worker] started — syncing to ${CLOUD_URL} every ${INTERVAL_MS / 1000}s`);
  await tick();
  setInterval(tick, INTERVAL_MS);
}
