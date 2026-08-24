"use client";

import { useRouter } from "next/navigation";
import { Dropdown } from "@/components/ui/Dropdown";
import type { SpendingMonth } from "@/lib/spending";

interface SpendingMonthPickerProps {
  availableMonths: SpendingMonth[];
  selected: SpendingMonth;
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

function monthKey(month: SpendingMonth): string {
  return `${month.year}-${month.month}`;
}

export function SpendingMonthPicker({
  availableMonths,
  selected,
}: SpendingMonthPickerProps) {
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
        router.push(`/spending?year=${year}&month=${month}`);
      }}
    />
  );
}
