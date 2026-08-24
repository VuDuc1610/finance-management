import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  date,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const plaidItems = pgTable("plaid_items", {
  id: serial("id").primaryKey(),
  institutionName: text("institution_name").notNull(),
  plaidItemId: text("plaid_item_id").notNull().unique(),
  accessToken: text("access_token").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id")
    .notNull()
    .references(() => plaidItems.id),
  plaidAccountId: text("plaid_account_id").notNull().unique(),
  name: text("name").notNull(),
  officialName: text("official_name"),
  type: text("type").notNull(),
  subtype: text("subtype"),
  mask: text("mask"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const balanceSnapshots = pgTable(
  "balance_snapshots",
  {
    id: serial("id").primaryKey(),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id),
    date: date("date").notNull(),
    currentBalance: numeric("current_balance", {
      precision: 14,
      scale: 2,
    }).notNull(),
    isoCurrencyCode: text("iso_currency_code"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    accountDateUnique: unique().on(table.accountId, table.date),
  }),
);
