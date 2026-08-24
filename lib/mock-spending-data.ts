export interface SpendingCategory {
  name: string;
  amount: number;
  percent: number;
  color:
    | "var(--color-dye-indigo)"
    | "var(--color-dye-madder)"
    | "var(--color-dye-moss)"
    | "var(--color-dye-saffron)"
    | "var(--color-dye-plum)";
}

export const spendingCategories: SpendingCategory[] = [
  { name: "Housing", amount: 423.7, percent: 34, color: "var(--color-dye-indigo)" },
  { name: "Food & Dining", amount: 274.2, percent: 22, color: "var(--color-dye-madder)" },
  { name: "Subscriptions", amount: 224.34, percent: 18, color: "var(--color-dye-moss)" },
  { name: "Bills & Utilities", amount: 174.48, percent: 14, color: "var(--color-dye-saffron)" },
  { name: "Shopping", amount: 149.52, percent: 12, color: "var(--color-dye-plum)" },
];

export const spendingSummary = {
  total: spendingCategories.reduce((sum, category) => sum + category.amount, 0),
  monthLabel: "April",
};
