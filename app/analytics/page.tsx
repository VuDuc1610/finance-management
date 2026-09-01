import { Card } from "@/components/ui/Card";
import { SpendingComparisonCard } from "@/components/analytics/SpendingComparisonCard";
import { getSpendingComparison } from "@/lib/analytics";
import { COMPARISON_OPTIONS } from "@/lib/analytics-types";
import type { ComparisonMode } from "@/lib/analytics-types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function isComparisonMode(value: string | undefined): value is ComparisonMode {
  return COMPARISON_OPTIONS.some((option) => option.value === value);
}

export default async function AnalyticsPage(props: PageProps<"/analytics">) {
  const searchParams = await props.searchParams;
  const compareParam = Array.isArray(searchParams.compare)
    ? searchParams.compare[0]
    : searchParams.compare;
  const mode: ComparisonMode = isComparisonMode(compareParam) ? compareParam : "month";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const data = await getSpendingComparison(user!.id, mode);

  return (
    <main className="w-full max-w-6xl flex-1 px-6 py-10 md:px-10 lg:px-16">
      <h1 className="mb-6 font-display text-[1.4rem] text-ink-900">
        Analytics
      </h1>

      <Card>
        <SpendingComparisonCard mode={mode} data={data} />
      </Card>
    </main>
  );
}
