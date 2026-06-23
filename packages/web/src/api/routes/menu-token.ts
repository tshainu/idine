import { Hono } from "hono";

const SECRET = process.env.BETTER_AUTH_SECRET || "localsecret1234567890abcdef";
const EXPIRY_MS = 3 * 60 * 60 * 1000; // 3 hours

// ── HMAC-SHA256 helpers (Web Crypto — works in Bun) ──────────────────────────

async function getKey(secret: string) {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function sign(payload: object): Promise<string> {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  const data = `${header}.${body}`;
  const key = await getKey(SECRET);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return `${data}.${sigB64}`;
}

async function verify(token: string): Promise<{ valid: boolean; payload?: any; reason?: string }> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return { valid: false, reason: "malformed" };
    const [header, body, sigB64] = parts;
    const data = `${header}.${body}`;
    const key = await getKey(SECRET);
    const sigBytes = Uint8Array.from(atob(sigB64), c => c.charCodeAt(0));
    const ok = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(data));
    if (!ok) return { valid: false, reason: "invalid_signature" };
    const payload = JSON.parse(atob(body));
    if (Date.now() > payload.exp) return { valid: false, reason: "expired" };
    return { valid: true, payload };
  } catch {
    return { valid: false, reason: "error" };
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

export const menuToken = new Hono()
  // Generate a signed token for a table QR
  .post("/token", async (c) => {
    const { branchId, table } = await c.req.json();
    if (!branchId || !table) return c.json({ error: "branchId and table required" }, 400);
    const payload = {
      branchId: Number(branchId),
      table: String(table),
      iat: Date.now(),
      exp: Date.now() + EXPIRY_MS,
    };
    const token = await sign(payload);
    return c.json({ token, expiresIn: EXPIRY_MS / 1000 }, 200);
  })
  // Verify token — called by menu page on load
  .post("/verify", async (c) => {
    const { token } = await c.req.json();
    if (!token) return c.json({ valid: false, reason: "missing_token" }, 400);
    const result = await verify(token);
    return c.json(result, 200);
  });
