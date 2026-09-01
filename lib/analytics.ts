import { and, eq, gte, lt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { accounts, plaidItems, transactions } from "@/lib/db/schema";
import { isSpendingCategory } from "@/lib/plaid/categories";
import { getAvailableMonths } from "@/lib/spending";
import type { ComparisonMode, ComparisonPoint, SpendingComparison } from "@/lib/analytics-types";

export type { ComparisonMode, ComparisonPoint, SpendingComparison } from "@/lib/analytics-types";
export { COMPARISON_OPTIONS } from "@/lib/analytics-types";

interface SpendingRow {
  date: string;
  amount: number;
}

function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}

function toIso(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function sum(values: number[]): number {
  return round2(values.reduce((total, value) => total + value, 0));
}

async function getSpendingRowsInRange(
  userId: string,
  start: string,
  end: string,
): Promise<SpendingRow[]> {
  const rows = await db
    .select({
      amount: transactions.amount,
      personalAmount: transactions.personalAmount,
      date: transactions.date,
      category: transactions.personalFinanceCategoryPrimary,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .innerJoin(plaidItems, eq(accounts.itemId, plaidItems.id))
    .where(
      and(
        gte(transactions.date, start),
        lt(transactions.date, end),
        eq(plaidItems.userId, userId),
      ),
    );

  return rows
    .map((row) => {
      const originalAmount = Number(row.amount);
      const personalAmount = row.personalAmount === null ? null : Number(row.personalAmount);
      return {
        date: row.date,
        amount: personalAmount ?? originalAmount,
        originalAmount,
        category: row.category,
      };
    })
    .filter((row) => row.originalAmount > 0 && isSpendingCategory(row.category))
    .map((row) => ({ date: row.date, amount: row.amount }));
}

function cumulate(current: number[], previous: number[], labels: string[]): ComparisonPoint[] {
  let curRunning = 0;
  let prevRunning = 0;
  return labels.map((label, index) => {
    curRunning += current[index] ?? 0;
    prevRunning += previous[index] ?? 0;
    return { label, current: round2(curRunning), previous: round2(prevRunning) };
  });
}

function startOfWeek(date: Date): Date {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + diff);
}

function addDays(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

async function weekComparison(userId: string): Promise<SpendingComparison> {
  const thisWeekStart = startOfWeek(new Date());
  const lastWeekStart = addDays(thisWeekStart, -7);
  const nextWeekStart = addDays(thisWeekStart, 7);

  const rows = await getSpendingRowsInRange(userId, toIso(lastWeekStart), toIso(nextWeekStart));

  const currentDaily = new Array(7).fill(0);
  const previousDaily = new Array(7).fill(0);

  for (const row of rows) {
    const rowDate = new Date(`${row.date}T00:00:00`);
    const curIndex = Math.round((rowDate.getTime() - thisWeekStart.getTime()) / 86_400_000);
    if (curIndex >= 0 && curIndex < 7) {
      currentDaily[curIndex] += row.amount;
      continue;
    }
    const prevIndex = Math.round((rowDate.getTime() - lastWeekStart.getTime()) / 86_400_000);
    if (prevIndex >= 0 && prevIndex < 7) {
      previousDaily[prevIndex] += row.amount;
    }
  }

  const points = cumulate(currentDaily, previousDaily, WEEKDAY_LABELS);
  return { points, totalCurrent: sum(currentDaily), currentLabel: "this week", previousLabel: "last week" };
}

function monthRange(year: number, month: number): { start: Date; end: Date } {
  return { start: new Date(year, month - 1, 1), end: new Date(year, month, 1) };
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

async function computeMonthVsMonth(
  userId: string,
  curYear: number,
  curMonth: number,
  prevYear: number,
  prevMonth: number,
  currentLabel: string,
  previousLabel: string,
): Promise<SpendingComparison> {
  const curRange = monthRange(curYear, curMonth);
  const prevRange = monthRange(prevYear, prevMonth);

  const [curRows, prevRows] = await Promise.all([
    getSpendingRowsInRange(userId, toIso(curRange.start), toIso(curRange.end)),
    getSpendingRowsInRange(userId, toIso(prevRange.start), toIso(prevRange.end)),
  ]);

  const pointCount = Math.max(daysInMonth(curYear, curMonth), daysInMonth(prevYear, prevMonth));
  const currentDaily = new Array(pointCount).fill(0);
  const previousDaily = new Array(pointCount).fill(0);

  for (const row of curRows) {
    currentDaily[Number(row.date.slice(8, 10)) - 1] += row.amount;
  }
  for (const row of prevRows) {
    previousDaily[Number(row.date.slice(8, 10)) - 1] += row.amount;
  }

  const labels = Array.from({ length: pointCount }, (_, index) => String(index + 1));
  const points = cumulate(currentDaily, previousDaily, labels);
  return { points, totalCurrent: sum(currentDaily), currentLabel, previousLabel };
}

async function monthVsAverageComparison(userId: string): Promise<SpendingComparison> {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const curRange = monthRange(year, month);

  const [curRows, availableMonths] = await Promise.all([
    getSpendingRowsInRange(userId, toIso(curRange.start), toIso(curRange.end)),
    getAvailableMonths(userId),
  ]);

  const historicalMonths = availableMonths.filter(
    (entry) => !(entry.year === year && entry.month === month),
  );

  const curDays = daysInMonth(year, month);
  const currentDaily = new Array(curDays).fill(0);
  for (const row of curRows) {
    currentDaily[Number(row.date.slice(8, 10)) - 1] += row.amount;
  }

  const dailySums = new Array(31).fill(0);
  const dailyCounts = new Array(31).fill(0);

  await Promise.all(
    historicalMonths.map(async (entry) => {
      const range = monthRange(entry.year, entry.month);
      const rows = await getSpendingRowsInRange(userId, toIso(range.start), toIso(range.end));
      const days = daysInMonth(entry.year, entry.month);
      const daily = new Array(days).fill(0);
      for (const row of rows) {
        daily[Number(row.date.slice(8, 10)) - 1] += row.amount;
      }
      for (let index = 0; index < days; index += 1) {
        dailySums[index] += daily[index];
        dailyCounts[index] += 1;
      }
    }),
  );

  let pointCount = curDays;
  for (let index = 30; index >= 0; index -= 1) {
    if (dailyCounts[index] > 0) {
      pointCount = Math.max(pointCount, index + 1);
      break;
    }
  }

  const previousDaily = new Array(pointCount).fill(0);
  for (let index = 0; index < pointCount; index += 1) {
    previousDaily[index] = dailyCounts[index] > 0 ? dailySums[index] / dailyCounts[index] : 0;
  }

  const finalCurrent = new Array(pointCount).fill(0);
  for (let index = 0; index < curDays; index += 1) {
    finalCurrent[index] = currentDaily[index];
  }

  const labels = Array.from({ length: pointCount }, (_, index) => String(index + 1));
  const points = cumulate(finalCurrent, previousDaily, labels);
  return { points, totalCurrent: sum(finalCurrent), currentLabel: "this month", previousLabel: "average month" };
}

async function yearComparison(userId: string): Promise<SpendingComparison> {
  const today = new Date();
  const year = today.getFullYear();
  const prevYear = year - 1;

  const rows = await getSpendingRowsInRange(userId, `${prevYear}-01-01`, `${year + 1}-01-01`);

  const currentMonthly = new Array(12).fill(0);
  const previousMonthly = new Array(12).fill(0);

  for (const row of rows) {
    const rowYear = Number(row.date.slice(0, 4));
    const rowMonth = Number(row.date.slice(5, 7));
    if (rowYear === year) {
      currentMonthly[rowMonth - 1] += row.amount;
    } else if (rowYear === prevYear) {
      previousMonthly[rowMonth - 1] += row.amount;
    }
  }

  const points = cumulate(currentMonthly, previousMonthly, MONTH_LABELS);
  return { points, totalCurrent: sum(currentMonthly), currentLabel: "this year", previousLabel: "last year" };
}

export async function getSpendingComparison(
  userId: string,
  mode: ComparisonMode,
): Promise<SpendingComparison> {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  switch (mode) {
    case "week":
      return weekComparison(userId);
    case "month": {
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      return computeMonthVsMonth(
        userId,
        year,
        month,
        prevYear,
        prevMonth,
        "this month",
        "last month",
      );
    }
    case "month-vs-year":
      return computeMonthVsMonth(userId, year, month, year - 1, month, "this month", "last year");
    case "month-vs-average":
      return monthVsAverageComparison(userId);
    case "year":
      return yearComparison(userId);
    default:
      return weekComparison(userId);
  }
}
