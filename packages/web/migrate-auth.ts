// One-off migration: backfill businesses + user credentials for existing (pre-auth-overhaul) data.
// Run with: bun --env-file=../../.env migrate-auth.ts   (from packages/web)
import { db } from "./src/api/database";
import * as schema from "./src/api/database/schema";
import { eq } from "drizzle-orm";

const ANIMALS = ["elephant", "tiger", "lion", "panda", "eagle", "falcon", "dolphin", "shark", "wolf", "fox"];
const DEFAULT_PASSWORD = "Idine@123";

async function generateUserId(): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    const candidate = `${animal.slice(0, 3).toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`;
    const [exists] = await db.select().from(schema.businesses).where(eq(schema.businesses.userId, candidate));
    if (!exists) return candidate;
  }
  return `BIZ${Date.now().toString().slice(-6)}`;
}

async function main() {
  const existingBiz = await db.select().from(schema.businesses);
  if (existingBiz.length > 0) {
    console.log("Businesses already exist, skipping business creation.");
  }

  const branches = await db.select().from(schema.branches);
  const hash = await Bun.password.hash(DEFAULT_PASSWORD);

  for (const branch of branches) {
    let biz = existingBiz.find(b => b.branchId === branch.id);
    if (!biz) {
      const userId = await generateUserId();
      [biz] = await db.insert(schema.businesses).values({
        userId,
        businessName: branch.name,
        username: "admin",
        password: hash,
        passwordPlain: DEFAULT_PASSWORD,
        status: "active",
        branchId: branch.id,
      }).returning();
      console.log(`Created business for branch "${branch.name}": userId=${biz.userId}`);
    }

    const usersInBranch = await db.select().from(schema.users).where(eq(schema.users.branchId, branch.id));
    for (const user of usersInBranch) {
      if (user.userId && user.username && user.password) continue; // already migrated
      const usernameBase = user.name.toLowerCase().replace(/[^a-z0-9]+/g, "");
      let username = usernameBase || `user${user.id}`;
      // ensure uniqueness within business
      let suffix = 0;
      while (true) {
        const clash = await db.select().from(schema.users).where(eq(schema.users.username, username));
        const conflict = clash.find(c => c.userId === biz!.userId && c.id !== user.id);
        if (!conflict) break;
        suffix += 1;
        username = `${usernameBase}${suffix}`;
      }
      await db.update(schema.users).set({
        userId: biz.userId,
        username,
        password: hash,
      }).where(eq(schema.users.id, user.id));
      console.log(`  User "${user.name}" -> username=${username}, userId=${biz.userId}, password=${DEFAULT_PASSWORD}`);
    }
  }

  console.log("\nMigration complete. Default password for all migrated users:", DEFAULT_PASSWORD);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
