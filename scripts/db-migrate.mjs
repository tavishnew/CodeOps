import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

// Ordered schema files, matching how the database was originally provisioned.
const FILES = [
  "create_users.sql",
  "create_projects_workspaces.sql",
  "create_core_schema.sql",
  "create_insights.sql",
  "alter_user_email.sql",
  "create_auth_tables.sql",
  "add_github_integration.sql",
];

const drizzleDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "drizzle");
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required (copy .env.example to .env first)");

const connection = await mysql.createConnection(url);
// 1050 table exists · 1060 duplicate column · 1061 duplicate key name
const alreadyPresent = new Set([1050, 1060, 1061]);

let applied = 0;
let skipped = 0;
for (const file of FILES) {
  const sql = await readFile(path.join(drizzleDir, file), "utf8");
  const statements = sql
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);
  for (const statement of statements) {
    try {
      await connection.query(statement);
      applied++;
    } catch (error) {
      if (alreadyPresent.has(error?.errno)) {
        skipped++;
        continue;
      }
      console.error(`db:migrate failed in ${file}:\n${statement.slice(0, 200)}`);
      throw error;
    }
  }
}
await connection.end();
console.log(`db:migrate complete — ${applied} statement(s) applied, ${skipped} already present.`);
