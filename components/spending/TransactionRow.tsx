interface TransactionRowProps {
  date: string;
  name: string;
  amount: number;
  pending: boolean;
  categoryLabel?: string;
  color?: string;
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function TransactionRow({
  date,
  name,
  amount,
  pending,
  categoryLabel,
  color,
}: TransactionRowProps) {
  return (
    <li className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3">
        <span className="font-mono text-[0.8125rem] text-linen-700">
          {formatDate(date)}
        </span>
        {color && (
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
        )}
        <span className="font-sans text-[0.875rem] text-ink-900">{name}</span>
        {categoryLabel && (
          <span className="font-sans text-[0.75rem] text-linen-700">
            {categoryLabel}
          </span>
        )}
        {pending && (
          <span className="rounded-pill border border-linen-300 px-2 py-0.5 font-sans text-[0.6875rem] text-linen-700">
            Pending
          </span>
        )}
      </div>
      <span className="font-mono text-[0.875rem] text-ink-900">
        -{currency.format(amount)}
      </span>
    </li>
  );
}
