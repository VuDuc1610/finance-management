import { Type, type FunctionDeclaration } from "@google/genai";
import { getAvailableMonths, getSpendingCategories, getCategoryTransactions } from "@/lib/spending";
import { getSubscriptionsAndBills } from "@/lib/subscriptions";
import { getCashFlowSankey } from "@/lib/cash-flow";
import { getNetWorthBreakdownSeries, getAccountsBreakdown } from "@/lib/net-worth";

const monthYearParams = {
  type: Type.OBJECT,
  properties: {
    year: { type: Type.NUMBER, description: "Four-digit year, e.g. 2026" },
    month: { type: Type.NUMBER, description: "Month number, 1-12" },
  },
  required: ["year", "month"],
};

const noParams = { type: Type.OBJECT, properties: {} };

export const toolDeclarations: FunctionDeclaration[] = [
  {
    name: "getAvailableMonths",
    description:
      "List the year/month combinations that have transaction data, most recent first. Call this first if unsure which months have data before asking for a specific month.",
    parameters: noParams,
  },
  {
    name: "getSpendingSummary",
    description:
      "Get spending broken down by category for a given month, with totals and percentages per category.",
    parameters: monthYearParams,
  },
  {
    name: "getRecentTransactions",
    description:
      "Get every transaction in a specific spending category for a given month. Call getSpendingSummary first to find valid category keys, then call this per category to see the transactions behind a number.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        year: { type: Type.NUMBER, description: "Four-digit year, e.g. 2026" },
        month: { type: Type.NUMBER, description: "Month number, 1-12" },
        categoryKey: { type: Type.STRING, description: "Category key from getSpendingSummary, e.g. 'FOOD_AND_DRINK', 'TRANSPORT', or 'OTHER'" },
      },
      required: ["year", "month", "categoryKey"],
    },
  },
  {
    name: "getSubscriptions",
    description:
      "Get all recurring subscriptions and bills, with monthly totals, counts, and how many are due soon.",
    parameters: noParams,
  },
  {
    name: "getCashFlow",
    description:
      "Get income vs. spending flow (cash flow) for a given month, broken down by source and category.",
    parameters: monthYearParams,
  },
  {
    name: "getNetWorth",
    description:
      "Get the daily net worth history (assets, liabilities, net total) across all linked accounts.",
    parameters: noParams,
  },
  {
    name: "getAccounts",
    description:
      "Get current balances for every linked account, grouped by type (cash, credit cards, investments, loans).",
    parameters: noParams,
  },
];

type ToolArgs = Record<string, unknown>;

function asYearMonth(args: ToolArgs): { year: number; month: number } {
  const year = Number(args.year);
  const month = Number(args.month);
  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    throw new Error(`Invalid year/month tool args: ${JSON.stringify(args)}`);
  }
  return { year, month };
}

export async function executeTool(
  name: string,
  args: ToolArgs,
  userId: string,
): Promise<unknown> {
  switch (name) {
    case "getAvailableMonths":
      return getAvailableMonths(userId);
    case "getSpendingSummary": {
      const { year, month } = asYearMonth(args);
      return getSpendingCategories(userId, year, month);
    }
    case "getRecentTransactions": {
      const { year, month } = asYearMonth(args);
      const categoryKey = String(args.categoryKey ?? "").trim();
      if (!categoryKey) {
        throw new Error(`Invalid categoryKey: must be a non-empty string, got ${JSON.stringify(args.categoryKey)}`);
      }
      return getCategoryTransactions(userId, year, month, categoryKey);
    }
    case "getSubscriptions":
      return getSubscriptionsAndBills(userId);
    case "getCashFlow": {
      const { year, month } = asYearMonth(args);
      return getCashFlowSankey(userId, year, month);
    }
    case "getNetWorth":
      return getNetWorthBreakdownSeries(userId);
    case "getAccounts":
      return getAccountsBreakdown(userId);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
