"use client";

import { useRouter } from "next/navigation";
import { Dropdown } from "@/components/ui/Dropdown";
import type { CashFlowMonth } from "@/lib/cash-flow";

interface CashFlowMonthPickerProps {
  availableMonths: CashFlowMonth[];
  selected: CashFlowMonth;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function monthKey(month: CashFlowMonth): string {
  return `${month.year}-${month.month}`;
}

export function CashFlowMonthPicker({
  availableMonths,
  selected,
}: CashFlowMonthPickerProps) {
  const router = useRouter();

  const options = availableMonths.map((month) => ({
    value: monthKey(month),
    label: `${MONTH_NAMES[month.month - 1]} ${month.year}`,
  }));

  return (
    <Dropdown
      value={monthKey(selected)}
      options={options}
      onChange={(value) => {
        const [year, month] = value.split("-");
        router.push(`/cash-flow?year=${year}&month=${month}`);
      }}
    />
  );
}
