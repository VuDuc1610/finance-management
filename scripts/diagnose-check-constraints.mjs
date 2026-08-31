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
  console.log("=== ALL CHECK constraints, every schema (flagging any with a NULL/undefined definition) ===");
  const checks = await sql`
    select connamespace::regnamespace::text as schema_name,
           conrelid::regclass::text as table_name,
           conname,
           pg_get_constraintdef(oid) as def
    from pg_constraint
    where contype = 'c'
    order by schema_name, table_name
  `;
  for (const row of checks) {
    const flag = row.def == null ? "  <-- NULL DEFINITION" : "";
    console.log(`${row.schema_name}.${row.table_name}.${row.conname}: ${JSON.stringify(row.def)}${flag}`);
  }
  if (checks.length === 0) console.log("(none)");

  console.log("\n=== ALL RLS policies, every schema ===");
  const policies = await sql`
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    order by schemaname, tablename
  `;
  for (const row of policies) {
    console.log(`${row.schemaname}.${row.tablename}.${row.policyname}: qual=${JSON.stringify(row.qual)} with_check=${JSON.stringify(row.with_check)}`);
  }
  if (policies.length === 0) console.log("(none)");
}

main()
  .then(() => sql.end())
  .catch(async (err) => {
    console.error(err);
    await sql.end();
    process.exit(1);
  });
