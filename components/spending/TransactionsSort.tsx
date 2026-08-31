"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Dropdown } from "@/components/ui/Dropdown";

export type TransactionSort =
  | "date-desc"
  | "date-asc"
  | "amount-desc"
  | "amount-asc";

const OPTIONS: { value: TransactionSort; label: string }[] = [
  { value: "date-desc", label: "Date (new to old)" },
  { value: "date-asc", label: "Date (old to new)" },
  { value: "amount-desc", label: "Amount (high to low)" },
  { value: "amount-asc", label: "Amount (low to high)" },
];

interface TransactionsSortProps {
  sort: TransactionSort;
}

export function TransactionsSort({ sort }: TransactionsSortProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <Dropdown
      value={sort}
      options={OPTIONS}
      onChange={(value) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("sort", value);
        router.push(`/transactions?${params.toString()}`);
      }}
    />
  );
}
