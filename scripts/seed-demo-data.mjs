import { readFileSync } from "node:fs";
import postgres from "postgres";

const DEMO_USER_ID = "demo-00000000-0000-0000-0000-000000000000";

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

// --- Hardcoded demo dataset -------------------------------------------------
// All figures below are literal, checked-in fake numbers — nothing here is
// randomly generated at request time. Re-running this script wipes and
// re-inserts the same rows under DEMO_USER_ID, leaving every other user's
// data untouched.

const MONTHS = [
  { year: 2026, month: 3 },
  { year: 2026, month: 4 },
  { year: 2026, month: 5 },
  { year: 2026, month: 6 },
  { year: 2026, month: 7 },
  { year: 2026, month: 8 },
];
const LAST_MONTH_INDEX = MONTHS.length - 1;
// Deterministic month-over-month variation applied to variable spending —
// fixed constants, not runtime randomness.
const MONTH_FACTORS = [0.94, 1.02, 0.98, 1.07, 1.0, 1.11];

function pad2(n) {
  return String(n).padStart(2, "0");
}
function isoDate(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}
function round2(n) {
  return Math.round(n * 100) / 100;
}

const INSTITUTIONS = [
  { key: "horizon", name: "Horizon Bank", plaidItemId: "demo-item-horizon", accessToken: "demo-access-horizon" },
  { key: "cedar", name: "Cedar Investments", plaidItemId: "demo-item-cedar", accessToken: "demo-access-cedar" },
];

const ACCOUNTS = [
  { key: "checking", item: "horizon", plaidAccountId: "demo-acct-checking", name: "Everyday Checking", officialName: "Horizon Everyday Checking", type: "depository", subtype: "checking", mask: "1234" },
  { key: "savings", item: "horizon", plaidAccountId: "demo-acct-savings", name: "High-Yield Savings", officialName: "Horizon High-Yield Savings", type: "depository", subtype: "savings", mask: "5678" },
  { key: "credit", item: "horizon", plaidAccountId: "demo-acct-credit", name: "Rewards Visa", officialName: "Horizon Rewards Visa", type: "credit", subtype: "credit card", mask: "9012" },
  { key: "brokerage", item: "cedar", plaidAccountId: "demo-acct-brokerage", name: "Brokerage Account", officialName: "Cedar Brokerage Account", type: "investment", subtype: "brokerage", mask: "3456" },
];

// Balance snapshots — biweekly points across the 6-month window per account.
const SNAPSHOT_DATES = [
  "2026-03-01", "2026-03-15", "2026-04-01", "2026-04-15", "2026-05-01", "2026-05-15",
  "2026-06-01", "2026-06-15", "2026-07-01", "2026-07-15", "2026-08-01", "2026-08-15", "2026-08-31",
];

const BALANCES = {
  checking: [2450, 4820, 2200, 4610, 2380, 4790, 2290, 4695, 2510, 4870, 2340, 4760, 3120],
  savings: [31200, 31450, 31900, 32300, 32800, 33250, 33800, 34300, 34900, 35450, 36100, 36700, 37450],
  credit: [820, 1180, 690, 1290, 750, 1240, 680, 1350, 720, 1310, 640, 1275, 980],
  brokerage: [64200, 65100, 63800, 66500, 67200, 66100, 68900, 69700, 68300, 71200, 72500, 70800, 73650],
};

// Recurring items tagged billKind — only the LAST month's occurrence carries
// the tag + dueDate, matching how the app itself keeps only one tagged
// transaction per recurring name (see app/api/transactions/[id]/route.ts).
const BILLS = [
  { name: "Sunset Ridge Apartments", account: "checking", day: 1, amount: 1850, primary: "RENT_AND_UTILITIES", detailed: "RENT_AND_UTILITIES_RENT", kind: "bill" },
  { name: "CityLight Electric", account: "checking", day: 5, amount: 92, primary: "RENT_AND_UTILITIES", detailed: "RENT_AND_UTILITIES_GAS_AND_ELECTRICITY", kind: "bill", varies: true },
  { name: "Fiberlink Internet", account: "checking", day: 7, amount: 65, primary: "RENT_AND_UTILITIES", detailed: "RENT_AND_UTILITIES_INTERNET_AND_CABLE", kind: "bill" },
  { name: "Wavecell Mobile", account: "checking", day: 9, amount: 58, primary: "RENT_AND_UTILITIES", detailed: "RENT_AND_UTILITIES_TELEPHONE", kind: "bill" },
  { name: "AutoFin Loan Services", account: "checking", day: 12, amount: 310, primary: "LOAN_PAYMENTS", detailed: "LOAN_PAYMENTS_CAR_PAYMENT", kind: "bill" },
  { name: "Netflix", account: "credit", day: 3, amount: 15.99, primary: "ENTERTAINMENT", detailed: "ENTERTAINMENT_TV_AND_MOVIES", kind: "subscription" },
  { name: "Spotify", account: "credit", day: 4, amount: 10.99, primary: "ENTERTAINMENT", detailed: "ENTERTAINMENT_MUSIC_AND_AUDIO", kind: "subscription" },
  { name: "Ironclad Fitness", account: "credit", day: 6, amount: 44.99, primary: "PERSONAL_CARE", detailed: "PERSONAL_CARE_GYMS_AND_FITNESS_CENTERS", kind: "subscription" },
  { name: "iCloud+", account: "credit", day: 10, amount: 2.99, primary: "GENERAL_SERVICES", detailed: "GENERAL_SERVICES_OTHER_GENERAL_SERVICES", kind: "subscription" },
];

// Variable, non-recurring spending — same template repeats each month with a
// deterministic per-month factor so amounts aren't identical every month.
const VARIABLE_SPENDING = [
  { name: "Green Leaf Grocery", account: "credit", day: 2, amount: 145, primary: "FOOD_AND_DRINK", detailed: "FOOD_AND_DRINK_GROCERIES" },
  { name: "Green Leaf Grocery", account: "credit", day: 16, amount: 132, primary: "FOOD_AND_DRINK", detailed: "FOOD_AND_DRINK_GROCERIES" },
  { name: "Corner Bistro", account: "credit", day: 8, amount: 38, primary: "FOOD_AND_DRINK", detailed: "FOOD_AND_DRINK_RESTAURANT" },
  { name: "Noodle House", account: "credit", day: 19, amount: 27, primary: "FOOD_AND_DRINK", detailed: "FOOD_AND_DRINK_RESTAURANT" },
  { name: "Bean & Barrel Coffee", account: "credit", day: 11, amount: 6.75, primary: "FOOD_AND_DRINK", detailed: "FOOD_AND_DRINK_COFFEE" },
  { name: "Bean & Barrel Coffee", account: "credit", day: 24, amount: 6.75, primary: "FOOD_AND_DRINK", detailed: "FOOD_AND_DRINK_COFFEE" },
  { name: "Amazon", account: "credit", day: 14, amount: 62, primary: "GENERAL_MERCHANDISE", detailed: "GENERAL_MERCHANDISE_ONLINE_MARKETPLACES" },
  { name: "Target", account: "credit", day: 21, amount: 48, primary: "GENERAL_MERCHANDISE", detailed: "GENERAL_MERCHANDISE_SUPERSTORES" },
  { name: "Shell Gas Station", account: "credit", day: 6, amount: 44, primary: "TRANSPORTATION", detailed: "TRANSPORTATION_GAS" },
  { name: "Shell Gas Station", account: "credit", day: 22, amount: 41, primary: "TRANSPORTATION", detailed: "TRANSPORTATION_GAS" },
  { name: "CityRide Rideshare", account: "credit", day: 27, amount: 19, primary: "TRANSPORTATION", detailed: "TRANSPORTATION_TAXIS_AND_RIDE_SHARES" },
  { name: "Cineplex Theaters", account: "credit", day: 17, amount: 24, primary: "ENTERTAINMENT", detailed: "ENTERTAINMENT_TV_AND_MOVIES" },
];

// One-off items that only appear in specific months, for a bit of texture.
const SPECIAL_SPENDING = [
  { monthIndex: 1, name: "Riverside Family Clinic", account: "credit", day: 18, amount: 35, primary: "MEDICAL", detailed: "MEDICAL_PRIMARY_CARE" },
  { monthIndex: 2, name: "GlowCut Salon", account: "credit", day: 13, amount: 55, primary: "PERSONAL_CARE", detailed: "PERSONAL_CARE_HAIR_AND_BEAUTY" },
  { monthIndex: 4, name: "GlowCut Salon", account: "credit", day: 13, amount: 55, primary: "PERSONAL_CARE", detailed: "PERSONAL_CARE_HAIR_AND_BEAUTY" },
  { monthIndex: 4, name: "SkyHigh Airlines", account: "credit", day: 20, amount: 312, primary: "TRAVEL", detailed: "TRAVEL_FLIGHTS" },
];

let txnCounter = 0;
function nextTxnId() {
  txnCounter += 1;
  return `demo-txn-${txnCounter}`;
}

async function main() {
  console.log(`Seeding demo data for user_id = ${DEMO_USER_ID}`);

  // Wipe any existing demo rows (children first) so this script is idempotent.
  await sql`
    delete from transactions
    where account_id in (
      select a.id from accounts a
      join plaid_items p on a.item_id = p.id
      where p.user_id = ${DEMO_USER_ID}
    )
  `;
  await sql`
    delete from balance_snapshots
    where account_id in (
      select a.id from accounts a
      join plaid_items p on a.item_id = p.id
      where p.user_id = ${DEMO_USER_ID}
    )
  `;
  await sql`
    delete from accounts
    where item_id in (select id from plaid_items where user_id = ${DEMO_USER_ID})
  `;
  await sql`delete from plaid_items where user_id = ${DEMO_USER_ID}`;

  const itemIdByKey = {};
  for (const inst of INSTITUTIONS) {
    const [row] = await sql`
      insert into plaid_items (user_id, institution_name, plaid_item_id, access_token)
      values (${DEMO_USER_ID}, ${inst.name}, ${inst.plaidItemId}, ${inst.accessToken})
      returning id
    `;
    itemIdByKey[inst.key] = row.id;
  }
  console.log(`plaid_items: inserted ${INSTITUTIONS.length}`);

  const accountIdByKey = {};
  for (const acct of ACCOUNTS) {
    const [row] = await sql`
      insert into accounts (item_id, plaid_account_id, name, official_name, type, subtype, mask)
      values (${itemIdByKey[acct.item]}, ${acct.plaidAccountId}, ${acct.name}, ${acct.officialName}, ${acct.type}, ${acct.subtype}, ${acct.mask})
      returning id
    `;
    accountIdByKey[acct.key] = row.id;
  }
  console.log(`accounts: inserted ${ACCOUNTS.length}`);

  let snapshotCount = 0;
  for (const acctKey of Object.keys(BALANCES)) {
    const balances = BALANCES[acctKey];
    for (let i = 0; i < SNAPSHOT_DATES.length; i++) {
      await sql`
        insert into balance_snapshots (account_id, date, current_balance, iso_currency_code)
        values (${accountIdByKey[acctKey]}, ${SNAPSHOT_DATES[i]}, ${balances[i]}, 'USD')
      `;
      snapshotCount += 1;
    }
  }
  console.log(`balance_snapshots: inserted ${snapshotCount}`);

  let txnCount = 0;

  for (let mi = 0; mi < MONTHS.length; mi++) {
    const { year, month } = MONTHS[mi];
    const factor = MONTH_FACTORS[mi];
    const isLastMonth = mi === LAST_MONTH_INDEX;

    // Paychecks (income = negative amount).
    for (const day of [1, 15]) {
      await sql`
        insert into transactions (
          account_id, plaid_transaction_id, name, amount, date, pending,
          personal_finance_category_primary, personal_finance_category_detailed, iso_currency_code
        ) values (
          ${accountIdByKey.checking}, ${nextTxnId()}, 'Acme Corp Payroll', ${-3200}, ${isoDate(year, month, day)}, false,
          'INCOME', 'INCOME_WAGES', 'USD'
        )
      `;
      txnCount += 1;
    }

    // Bills & subscriptions.
    for (const bill of BILLS) {
      const amount = bill.varies ? round2(bill.amount * factor) : bill.amount;
      const billKind = isLastMonth ? bill.kind : null;
      const dueDate = isLastMonth ? isoDate(year, month, bill.day) : null;
      await sql`
        insert into transactions (
          account_id, plaid_transaction_id, name, amount, date, pending,
          personal_finance_category_primary, personal_finance_category_detailed, iso_currency_code,
          bill_kind, due_date
        ) values (
          ${accountIdByKey[bill.account]}, ${nextTxnId()}, ${bill.name}, ${amount}, ${isoDate(year, month, bill.day)}, false,
          ${bill.primary}, ${bill.detailed}, 'USD',
          ${billKind}, ${dueDate}
        )
      `;
      txnCount += 1;
    }

    // Variable spending.
    for (const item of VARIABLE_SPENDING) {
      const amount = round2(item.amount * factor);
      await sql`
        insert into transactions (
          account_id, plaid_transaction_id, name, amount, date, pending,
          personal_finance_category_primary, personal_finance_category_detailed, iso_currency_code
        ) values (
          ${accountIdByKey[item.account]}, ${nextTxnId()}, ${item.name}, ${amount}, ${isoDate(year, month, item.day)}, false,
          ${item.primary}, ${item.detailed}, 'USD'
        )
      `;
      txnCount += 1;
    }

    // Month-specific one-offs.
    for (const item of SPECIAL_SPENDING.filter((s) => s.monthIndex === mi)) {
      await sql`
        insert into transactions (
          account_id, plaid_transaction_id, name, amount, date, pending,
          personal_finance_category_primary, personal_finance_category_detailed, iso_currency_code
        ) values (
          ${accountIdByKey[item.account]}, ${nextTxnId()}, ${item.name}, ${item.amount}, ${isoDate(year, month, item.day)}, false,
          ${item.primary}, ${item.detailed}, 'USD'
        )
      `;
      txnCount += 1;
    }

    // One-off freelance income in the last month, for cash-flow variety.
    if (isLastMonth) {
      await sql`
        insert into transactions (
          account_id, plaid_transaction_id, name, amount, date, pending,
          personal_finance_category_primary, personal_finance_category_detailed, iso_currency_code
        ) values (
          ${accountIdByKey.checking}, ${nextTxnId()}, 'Freelance Design Co', ${-650}, ${isoDate(year, month, 20)}, false,
          'INCOME', 'INCOME_OTHER_INCOME', 'USD'
        )
      `;
      txnCount += 1;
    }
  }

  console.log(`transactions: inserted ${txnCount}`);
  console.log("Demo data seeded successfully.");
}

main()
  .then(() => sql.end())
  .catch(async (err) => {
    console.error(err);
    await sql.end();
    process.exit(1);
  });
