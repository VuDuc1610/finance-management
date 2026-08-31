import { readFileSync } from "node:fs";
import postgres from "postgres";

function loadEnvLocal() {
  if (process.env.DATABASE_URL) return;
  let raw;
  try {
    raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  } catch {
    return;
  }
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

async function main() {
  console.log("Adding plaid_items.user_id (nullable)...");
  await sql`alter table plaid_items add column if not exists user_id text`;

  console.log("Adding dismissed_subscription_suggestions.user_id (nullable) and dropping old primary key on name...");
  await sql`alter table dismissed_subscription_suggestions add column if not exists user_id text`;
  await sql`alter table dismissed_subscription_suggestions drop constraint if exists dismissed_subscription_suggestions_pkey`;

  console.log("Adding chat_messages.user_id (nullable)...");
  await sql`alter table chat_messages add column if not exists user_id text`;

  console.log("Done. Verifying columns exist...");
  const cols = await sql`
    select table_name, column_name, is_nullable
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ('plaid_items', 'dismissed_subscription_suggestions', 'chat_messages')
      and column_name = 'user_id'
    order by table_name
  `;
  for (const row of cols) {
    console.log(`${row.table_name}.user_id: nullable=${row.is_nullable}`);
  }
}

main()
  .then(() => sql.end())
  .catch(async (err) => {
    console.error(err);
    await sql.end();
    process.exit(1);
  });
