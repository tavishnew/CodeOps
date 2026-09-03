import "dotenv/config";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { workspaces } from "../drizzle/schema";
import { seedWorkspace } from "./seed";

async function main() {
  const userId = Number(process.argv[2]);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error("Usage: pnpm db:seed -- <userId>");
  }

  const db = drizzle(process.env.DATABASE_URL!);

  const existing = await db.select().from(workspaces).where(eq(workspaces.ownerId, userId)).limit(1);
  if (!existing[0]) {
    await db
      .insert(workspaces)
      .values({ ownerId: userId, slug: `workspace-${userId}`, name: "Engineering workspace", mode: "connected" });
  }

  const [row] = await db.select().from(workspaces).where(eq(workspaces.ownerId, userId)).limit(1);
  if (!row) throw new Error("Workspace could not be created");

  await seedWorkspace(db, row.id);
  console.log(`Workspace ${row.id} is ready and seeded for user ${userId}.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
