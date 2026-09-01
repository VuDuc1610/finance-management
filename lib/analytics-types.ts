export type ComparisonMode =
  | "week"
  | "month"
  | "month-vs-year"
  | "month-vs-average"
  | "year";

export const COMPARISON_OPTIONS: { value: ComparisonMode; label: string }[] = [
  { value: "week", label: "This week vs. last week" },
  { value: "month", label: "This month vs. last month" },
  { value: "month-vs-year", label: "This month vs. last year" },
  { value: "month-vs-average", label: "This month vs. average month" },
  { value: "year", label: "This year vs. last year" },
];

export interface ComparisonPoint {
  label: string;
  current: number;
  previous: number;
}

export interface SpendingComparison {
  points: ComparisonPoint[];
  totalCurrent: number;
  currentLabel: string;
  previousLabel: string;
}
