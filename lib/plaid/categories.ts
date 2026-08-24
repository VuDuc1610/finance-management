const DYE_HUES = [
  "var(--color-dye-indigo)",
  "var(--color-dye-madder)",
  "var(--color-dye-moss)",
  "var(--color-dye-saffron)",
  "var(--color-dye-plum)",
] as const;

export type DyeHue = (typeof DYE_HUES)[number];

export function dyeHueForIndex(index: number): DyeHue {
  return DYE_HUES[index % DYE_HUES.length];
}

const EXCLUDED_PRIMARY_CATEGORIES = new Set([
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "LOAN_PAYMENTS",
]);

export function isSpendingCategory(primary: string | null): boolean {
  if (!primary) return true;
  return !EXCLUDED_PRIMARY_CATEGORIES.has(primary);
}

const CATEGORY_LABELS: Record<string, string> = {
  FOOD_AND_DRINK: "Food & Dining",
  GENERAL_MERCHANDISE: "Shopping",
  HOME_IMPROVEMENT: "Home Improvement",
  MEDICAL: "Medical",
  PERSONAL_CARE: "Personal Care",
  GENERAL_SERVICES: "Services",
  GOVERNMENT_AND_NON_PROFIT: "Government & Non-Profit",
  TRANSPORTATION: "Transportation",
  TRAVEL: "Travel",
  RENT_AND_UTILITIES: "Bills & Utilities",
  ENTERTAINMENT: "Entertainment",
  BANK_FEES: "Bank Fees",
  INCOME: "Income",
};

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function labelForCategory(primary: string | null): string {
  if (!primary) return "Other";
  return CATEGORY_LABELS[primary] ?? toTitleCase(primary);
}
