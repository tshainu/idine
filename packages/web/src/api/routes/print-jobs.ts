import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, and, asc } from "drizzle-orm";

export const printJobs = new Hono()
  // Poll endpoint for Windows print helper
  .get("/", async (c) => {
    const status = c.req.query("status") || "pending";
    const branchId = c.req.query("branchId");
    const conditions: any[] = [eq(schema.printJobs.status, status)];
    if (branchId) conditions.push(eq(schema.printJobs.branchId, parseInt(branchId)));
    const jobs = await db.select().from(schema.printJobs).where(and(...conditions)).orderBy(asc(schema.printJobs.createdAt));
    return c.json({ printJobs: jobs }, 200);
  })
  // Create print jobs (one per printer station for an order)
  .post("/", async (c) => {
    const body = await c.req.json();
    // idempotency: skip if key already exists
    const existing = await db.select().from(schema.printJobs).where(eq(schema.printJobs.idempotencyKey, body.idempotencyKey));
    if (existing.length > 0) return c.json({ printJob: existing[0], duplicate: true }, 200);
    const [job] = await db.insert(schema.printJobs).values(body).returning();
    return c.json({ printJob: job }, 201);
  })
  // Batch create — one call creates all station jobs for an order
  .post("/batch", async (c) => {
    const { jobs } = await c.req.json();
    const created = [];
    for (const job of jobs) {
      const existing = await db.select().from(schema.printJobs).where(eq(schema.printJobs.idempotencyKey, job.idempotencyKey));
      if (existing.length > 0) {
        created.push({ ...existing[0], duplicate: true });
      } else {
        const [j] = await db.insert(schema.printJobs).values(job).returning();
        created.push(j);
      }
    }
    return c.json({ printJobs: created }, 201);
  })
  // Update job status (called by print helper or on completion)
  .patch("/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const update: any = { ...body };
    if (body.status === "done") update.completedAt = new Date();
    if (body.status === "printing") update.lastAttemptAt = new Date();
    const [job] = await db.update(schema.printJobs).set(update).where(eq(schema.printJobs.id, id)).returning();
    return c.json({ printJob: job }, 200);
  });
