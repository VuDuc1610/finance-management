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
  console.log("Making plaid_items.user_id NOT NULL...");
  await sql`alter table plaid_items alter column user_id set not null`;

  console.log("Making chat_messages.user_id NOT NULL...");
  await sql`alter table chat_messages alter column user_id set not null`;

  console.log("Making dismissed_subscription_suggestions.user_id NOT NULL...");
  await sql`alter table dismissed_subscription_suggestions alter column user_id set not null`;

  console.log("Dropping old dismissed_subscription_suggestions primary key...");
  await sql`alter table dismissed_subscription_suggestions drop constraint if exists dismissed_subscription_suggestions_pkey`;

  console.log("Adding composite primary key (user_id, name) to dismissed_subscription_suggestions...");
  await sql`alter table dismissed_subscription_suggestions add constraint dismissed_subscription_suggestions_pkey primary key (user_id, name)`;

  console.log("Done. Verifying NOT NULL constraints...");
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

  console.log("Verifying composite primary key on dismissed_subscription_suggestions...");
  const pk = await sql`
    select constraint_name, constraint_type
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'dismissed_subscription_suggestions'
      and constraint_type = 'PRIMARY KEY'
  `;
  for (const row of pk) {
    console.log(`dismissed_subscription_suggestions: ${row.constraint_name} (${row.constraint_type})`);
  }

  console.log("Verifying primary key columns...");
  const pkCols = await sql`
    select column_name
    from information_schema.key_column_usage
    where table_schema = 'public'
      and table_name = 'dismissed_subscription_suggestions'
      and constraint_name = 'dismissed_subscription_suggestions_pkey'
    order by ordinal_position
  `;
  for (const row of pkCols) {
    console.log(`- ${row.column_name}`);
  }
}

main()
  .then(() => sql.end())
  .catch(async (err) => {
    console.error(err);
    await sql.end();
    process.exit(1);
  });
