import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, and } from "drizzle-orm";

export const auth = new Hono()
  .post("/login", async (c) => {
    const { userId, username, password } = await c.req.json();
    if (!userId || !username || !password) {
      return c.json({ error: "User ID, username and password are required" }, 400);
    }

    // Business must exist and be active
    const [biz] = await db.select().from(schema.businesses).where(eq(schema.businesses.userId, userId.trim()));
    if (!biz) return c.json({ error: "Invalid User ID." }, 401);
    if (biz.status === "suspended") return c.json({ error: "This business account is suspended." }, 403);

    const [user] = await db.select().from(schema.users).where(
      and(
        eq(schema.users.userId, userId.trim()),
        eq(schema.users.username, username.trim()),
        eq(schema.users.isActive, true),
      ),
    );
    if (!user || !user.password) return c.json({ error: "Invalid username or password." }, 401);

    const valid = await Bun.password.verify(password, user.password);
    if (!valid) return c.json({ error: "Invalid username or password." }, 401);

    const { password: _pw, ...safeUser } = user;
    return c.json({ user: safeUser }, 200);
  })
  .post("/change-password", async (c) => {
    const { userId: id, currentPassword, newPassword } = await c.req.json();
    if (!id || !newPassword) return c.json({ error: "Missing fields" }, 400);
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    if (!user) return c.json({ error: "User not found" }, 404);
    if (currentPassword) {
      const valid = user.password ? await Bun.password.verify(currentPassword, user.password) : false;
      if (!valid) return c.json({ error: "Current password is incorrect" }, 401);
    }
    const hash = await Bun.password.hash(newPassword);
    await db.update(schema.users).set({ password: hash }).where(eq(schema.users.id, id));
    return c.json({ ok: true }, 200);
  })
  .post("/change-username", async (c) => {
    const { userId: id, newUsername } = await c.req.json();
    if (!id || !newUsername) return c.json({ error: "Missing fields" }, 400);
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    if (!user) return c.json({ error: "User not found" }, 404);
    const [clash] = await db.select().from(schema.users).where(
      and(eq(schema.users.userId, user.userId!), eq(schema.users.username, newUsername.trim())),
    );
    if (clash && clash.id !== id) return c.json({ error: "Username already taken in this business" }, 409);
    await db.update(schema.users).set({ username: newUsername.trim() }).where(eq(schema.users.id, id));
    return c.json({ ok: true }, 200);
  });
