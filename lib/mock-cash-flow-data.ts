export interface CashFlowNode {
  name: string;
  color: string;
}

export interface CashFlowLink {
  source: number;
  target: number;
  value: number;
}

const indigo = "var(--color-dye-indigo)";
const madder = "var(--color-dye-madder)";
const moss = "var(--color-dye-moss)";
const saffron = "var(--color-dye-saffron)";
const plum = "var(--color-dye-plum)";
const mossTint = "color-mix(in srgb, var(--color-dye-moss) 65%, transparent)";

export const cashFlowNodes: CashFlowNode[] = [
  { name: "Paychecks", color: indigo }, // 0
  { name: "Income", color: indigo }, // 1
  { name: "Savings", color: moss }, // 2
  { name: "Housing", color: indigo }, // 3
  { name: "Financial", color: plum }, // 4
  { name: "Bills & Utilities", color: saffron }, // 5
  { name: "Food & Dining", color: madder }, // 6
  { name: "Travel & Lifestyle", color: mossTint }, // 7
  { name: "Mortgage", color: indigo }, // 8
  { name: "Home Improvement", color: indigo }, // 9
  { name: "Loan Repayment", color: plum }, // 10
  { name: "Insurance", color: plum }, // 11
  { name: "Investing", color: plum }, // 12
  { name: "Garbage", color: saffron }, // 13
  { name: "Phone", color: saffron }, // 14
  { name: "Internet", color: saffron }, // 15
  { name: "Cash & ATM", color: saffron }, // 16
  { name: "Dining Out", color: madder }, // 17
  { name: "Groceries", color: madder }, // 18
  { name: "Flights", color: mossTint }, // 19
  { name: "Hotels", color: mossTint }, // 20
];

export const cashFlowLinks: CashFlowLink[] = [
  { source: 0, target: 1, value: 4200.0 },

  { source: 1, target: 2, value: 480.54 },
  { source: 1, target: 3, value: 1593.0 },
  { source: 1, target: 4, value: 741.68 },
  { source: 1, target: 5, value: 683.47 },
  { source: 1, target: 6, value: 232.35 },
  { source: 1, target: 7, value: 468.96 },

  { source: 3, target: 8, value: 1385.0 },
  { source: 3, target: 9, value: 208.0 },

  { source: 4, target: 10, value: 500.23 },
  { source: 4, target: 11, value: 201.45 },
  { source: 4, target: 12, value: 40.0 },

  { source: 5, target: 13, value: 320.47 },
  { source: 5, target: 14, value: 140.0 },
  { source: 5, target: 15, value: 183.0 },
  { source: 5, target: 16, value: 40.0 },

  { source: 6, target: 17, value: 150.0 },
  { source: 6, target: 18, value: 82.35 },

  { source: 7, target: 19, value: 300.0 },
  { source: 7, target: 20, value: 168.96 },
];

export const cashFlowSummary = {
  totalIncome: 4200.0,
  rangeLabel: "Dec 1 – Dec 31, 2024",
};
