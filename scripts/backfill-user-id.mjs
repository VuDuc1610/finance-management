import { readFileSync } from "node:fs";
import postgres from "postgres";

const OWNER_EMAIL = "ducvuminh6983@gmail.com";

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

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set (checked env and .env.local)");
}

const sql = postgres(connectionString, { prepare: false });

async function main() {
  const [owner] = await sql`select id from auth.users where email = ${OWNER_EMAIL}`;
  if (!owner) {
    throw new Error(`No auth.users row found for email ${OWNER_EMAIL}`);
  }
  const ownerId = owner.id;
  console.log(`Backfilling user_id = ${ownerId} (${OWNER_EMAIL})`);

  const items = await sql`
    update plaid_items set user_id = ${ownerId} where user_id is null returning id
  `;
  console.log(`plaid_items: backfilled ${items.length} row(s)`);

  const dismissed = await sql`
    update dismissed_subscription_suggestions set user_id = ${ownerId} where user_id is null returning name
  `;
  console.log(`dismissed_subscription_suggestions: backfilled ${dismissed.length} row(s)`);

  const chats = await sql`
    update chat_messages set user_id = ${ownerId} where user_id is null returning id
  `;
  console.log(`chat_messages: backfilled ${chats.length} row(s)`);
}

main()
  .then(() => sql.end())
  .catch(async (err) => {
    console.error(err);
    await sql.end();
    process.exit(1);
  });
