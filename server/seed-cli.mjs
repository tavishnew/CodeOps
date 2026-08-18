import "dotenv/config";
import mysql from "mysql2/promise";

const userId = Number(process.argv[2]);
if (!Number.isInteger(userId) || userId <= 0) {
  throw new Error("Usage: pnpm db:seed -- <userId>");
}

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const slug = `workspace-${userId}`;
await connection.execute("INSERT INTO workspaces (ownerId, slug, name, mode) VALUES (?, ?, ?, 'connected') ON DUPLICATE KEY UPDATE name = VALUES(name)", [userId, slug, "Engineering workspace"]);
const [rows] = await connection.execute("SELECT id FROM workspaces WHERE ownerId = ? LIMIT 1", [userId]);
const workspaceId = rows[0]?.id;
if (!workspaceId) throw new Error("Workspace could not be created");
await connection.end();
console.log(`Workspace ${workspaceId} is ready. The first authenticated dashboard request seeds its operational records idempotently.`);
