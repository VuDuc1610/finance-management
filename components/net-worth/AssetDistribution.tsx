import type { AssetDistributionEntry } from "@/lib/net-worth";

interface AssetDistributionProps {
  data: AssetDistributionEntry[];
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const DYE_HUES = [
  "var(--color-dye-indigo)",
  "var(--color-dye-madder)",
  "var(--color-dye-moss)",
  "var(--color-dye-saffron)",
  "var(--color-dye-plum)",
];

function colorForIndex(index: number) {
  const hue = DYE_HUES[index % DYE_HUES.length];
  const cycle = Math.floor(index / DYE_HUES.length);
  if (cycle === 0) return hue;
  const tintPercent = Math.max(35, 65 - cycle * 15);
  return `color-mix(in srgb, ${hue} ${tintPercent}%, transparent)`;
}

export function AssetDistribution({ data }: AssetDistributionProps) {
  if (data.length === 0) {
    return null;
  }

  return (
    <div>
      <h2 className="mb-4 font-sans text-[0.8125rem] font-medium tracking-wide text-linen-700 uppercase">
        Where your money sits
      </h2>
      <div className="flex h-3 w-full overflow-hidden rounded-pill">
        {data.map((entry, index) => (
          <div
            key={entry.institutionName}
            style={{
              width: `${entry.percent}%`,
              backgroundColor: colorForIndex(index),
            }}
          />
        ))}
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
        {data.map((entry, index) => (
          <li key={entry.institutionName} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: colorForIndex(index) }}
              aria-hidden="true"
            />
            <span className="font-sans text-[0.8125rem] text-ink-900">
              {entry.institutionName}
            </span>
            <span className="font-mono text-[0.8125rem] text-linen-700">
              {currency.format(entry.value)} · {entry.percent.toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
