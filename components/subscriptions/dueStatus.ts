import { nextOccurrenceDate, daysUntil } from "@/lib/recurring-date";

export function getDueBadge(dueDate: string | null): {
  label: string;
  className: string;
} {
  if (dueDate === null) {
    return { label: "No date set", className: "text-linen-700" };
  }

  const next = nextOccurrenceDate(dueDate);
  const days = daysUntil(next);

  if (days < 5) {
    return {
      label: days <= 0 ? "Due today" : `Due in ${days}d`,
      className: "bg-dye-saffron/10 text-dye-saffron",
    };
  }

  return {
    label: new Date(`${next}T00:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    className: "text-linen-700",
  };
}
