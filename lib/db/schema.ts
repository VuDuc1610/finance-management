import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  date,
  timestamp,
  unique,
  boolean,
} from "drizzle-orm/pg-core";

export const plaidItems = pgTable("plaid_items", {
  id: serial("id").primaryKey(),
  institutionName: text("institution_name").notNull(),
  plaidItemId: text("plaid_item_id").notNull().unique(),
  accessToken: text("access_token").notNull(),
  transactionsCursor: text("transactions_cursor"),
  transactionsConsentMissing: boolean("transactions_consent_missing")
    .notNull()
    .default(false),
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

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id")
    .notNull()
    .references(() => accounts.id),
  plaidTransactionId: text("plaid_transaction_id").notNull().unique(),
  name: text("name").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  personalAmount: numeric("personal_amount", { precision: 14, scale: 2 }),
  date: date("date").notNull(),
  pending: boolean("pending").notNull().default(false),
  personalFinanceCategoryPrimary: text("personal_finance_category_primary"),
  personalFinanceCategoryDetailed: text("personal_finance_category_detailed"),
  isoCurrencyCode: text("iso_currency_code"),
  billKind: text("bill_kind"),
  dueDate: date("due_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const dismissedSubscriptionSuggestions = pgTable(
  "dismissed_subscription_suggestions",
  {
    name: text("name").primaryKey(),
    dismissedAt: timestamp("dismissed_at").notNull().defaultNow(),
  },
);

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  role: text("role").notNull(), // "user" | "model" | "tool"
  content: text("content").notNull(),
  toolName: text("tool_name"),
  toolArgs: text("tool_args"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
