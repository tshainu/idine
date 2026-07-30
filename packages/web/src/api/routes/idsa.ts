import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";

const IDSA_PASSWORD = process.env.IDSA_PASSWORD || "iDineOwner@2026";
const IDSA_SECRET = process.env.IDSA_SECRET || "idine-idsa-secret-9f3e7a1c5b8d2f60";

const ANIMALS = [
  "elephant", "tiger", "lion", "panda", "eagle", "falcon", "dolphin", "shark",
  "wolf", "fox", "bear", "otter", "hawk", "cobra", "zebra", "camel", "koala",
  "rhino", "gecko", "heron", "ibis", "lynx", "moose", "puma", "quail", "raven",
];

function makeToken() {
  const ts = Date.now();
  const sig = Bun.hash(`${ts}:${IDSA_SECRET}`).toString(16);
  return Buffer.from(`${ts}.${sig}`).toString("base64");
}
function verifyToken(token: string | undefined) {
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [ts, sig] = decoded.split(".");
    if (!ts || !sig) return false;
    if (Date.now() - Number(ts) > 1000 * 60 * 60 * 24 * 7) return false;
    return Bun.hash(`${ts}:${IDSA_SECRET}`).toString(16) === sig;
  } catch {
    return false;
  }
}

async function generateUserId(): Promise<string> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    const prefix = animal.slice(0, 3).toUpperCase();
    const digits = String(Math.floor(1000 + Math.random() * 9000));
    const candidate = `${prefix}${digits}`;
    const [exists] = await db.select().from(schema.businesses).where(eq(schema.businesses.userId, candidate));
    if (!exists) return candidate;
  }
  return `BIZ${Date.now().toString().slice(-6)}`;
}

export const idsa = new Hono()
  .post("/login", async (c) => {
    const { password } = await c.req.json();
    if (password !== IDSA_PASSWORD) return c.json({ error: "Invalid password" }, 401);
    return c.json({ token: makeToken() }, 200);
  })
  .use("/*", async (c, next) => {
    if (c.req.path.endsWith("/idsa/login")) return next();
    const token = c.req.header("X-Idsa-Token");
    if (!verifyToken(token)) return c.json({ error: "Unauthorized" }, 401);
    await next();
  })
  .get("/businesses", async (c) => {
    const rows = await db.select().from(schema.businesses);
    return c.json({ businesses: rows }, 200);
  })
  .post("/businesses", async (c) => {
    const { businessName, password, branchName, branchAddress, branchPhone } = await c.req.json();
    if (!businessName || !password) return c.json({ error: "Business name and password are required" }, 400);

    const userId = await generateUserId();
    const hash = await Bun.password.hash(password);

    const [branch] = await db.insert(schema.branches).values({
      name: branchName || businessName,
      address: branchAddress || null,
      phone: branchPhone || null,
      isActive: true,
    }).returning();

    const [biz] = await db.insert(schema.businesses).values({
      userId,
      businessName,
      username: "admin",
      password: hash,
      passwordPlain: password,
      status: "active",
      branchId: branch.id,
    }).returning();

    await db.insert(schema.users).values({
      branchId: branch.id,
      name: `${businessName} Admin`,
      userId,
      username: "admin",
      password: hash,
      role: "admin",
      isActive: true,
    });

    return c.json({ business: biz }, 201);
  })
  .patch("/businesses/:id/suspend", async (c) => {
    const id = parseInt(c.req.param("id"));
    await db.update(schema.businesses).set({ status: "suspended" }).where(eq(schema.businesses.id, id));
    return c.json({ ok: true }, 200);
  })
  .patch("/businesses/:id/activate", async (c) => {
    const id = parseInt(c.req.param("id"));
    await db.update(schema.businesses).set({ status: "active" }).where(eq(schema.businesses.id, id));
    return c.json({ ok: true }, 200);
  })
  .patch("/businesses/:id/password", async (c) => {
    const id = parseInt(c.req.param("id"));
    const { password } = await c.req.json();
    if (!password) return c.json({ error: "Password required" }, 400);
    const hash = await Bun.password.hash(password);
    const [biz] = await db.update(schema.businesses).set({ password: hash, passwordPlain: password }).where(eq(schema.businesses.id, id)).returning();
    if (biz) {
      await db.update(schema.users).set({ password: hash }).where(eq(schema.users.userId, biz.userId));
    }
    return c.json({ ok: true }, 200);
  })
  .delete("/businesses/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    await db.delete(schema.businesses).where(eq(schema.businesses.id, id));
    return c.json({ ok: true }, 200);
  });
