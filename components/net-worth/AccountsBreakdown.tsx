import type { AccountGroup } from "@/lib/net-worth";

interface AccountsBreakdownProps {
  groups: AccountGroup[];
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const diffMinutes = Math.round(diffMs / 60000);

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

function subtypeLabel(subtype: string | null): string {
  if (!subtype) return "";
  return subtype
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function AccountsBreakdown({ groups }: AccountsBreakdownProps) {
  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => {
        const isPositive = group.changeAmount >= 0;

        return (
          <div key={group.type}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-baseline gap-2">
                <h3 className="font-sans text-[0.9375rem] font-medium text-ink-900">
                  {group.label}
                </h3>
                <span
                  className={`font-mono text-[0.75rem] ${isPositive ? "text-dye-moss" : "text-dye-madder"}`}
                >
                  {isPositive ? "↑" : "↓"}{" "}
                  {currency.format(Math.abs(group.changeAmount))} (
                  {Math.abs(group.changePercent).toFixed(1)}%) 1 month change
                </span>
              </div>
              <span className="font-mono text-[0.9375rem] text-ink-900">
                {currency.format(group.total)}
              </span>
            </div>

            <ul className="mt-3 flex flex-col divide-y divide-linen-300 rounded-card border border-linen-300">
              {group.accounts.map((account) => (
                <li
                  key={account.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <p className="font-sans text-[0.875rem] text-ink-900">
                      {account.name}
                    </p>
                    <p className="font-sans text-[0.75rem] text-linen-700">
                      {subtypeLabel(account.subtype)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-[0.875rem] text-ink-900">
                      {currency.format(account.balance)}
                    </p>
                    <p className="font-mono text-[0.75rem] text-linen-700">
                      {formatRelativeTime(account.lastUpdated)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
