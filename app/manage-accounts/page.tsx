import { Card } from "@/components/ui/Card";
import { AddAccountButton } from "@/components/net-worth/AddAccountButton";
import { ReconnectAccountButton } from "@/components/spending/ReconnectAccountButton";
import { getLinkedInstitutions } from "@/lib/net-worth";
import { getCurrentUser } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

export default async function ManageAccountsPage() {
  const currentUser = await getCurrentUser();

  const linkedInstitutions = await getLinkedInstitutions(currentUser!.id);

  return (
    <main className="w-full max-w-6xl flex-1 px-6 py-10 md:px-10 lg:px-16">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-[1.4rem] text-ink-900">
          Manage accounts
        </h1>
        <div className="flex gap-3">
          <button
            type="button"
            className="rounded-pill border border-dye-indigo/40 px-4 py-2 font-sans text-[0.8125rem] text-dye-indigo hover:bg-dye-indigo/10"
          >
            Refresh all
          </button>
          <AddAccountButton />
        </div>
      </div>

      {linkedInstitutions.length > 0 ? (
        <Card className="p-6 sm:p-8">
          <h2 className="font-display text-[1.0625rem] text-ink-900">
            Linked institutions
          </h2>
          <p className="mt-1 font-sans text-[0.8125rem] text-linen-700">
            Reconnect an institution if you need to add another account at a
            bank you&apos;ve already linked, or refresh its connection.
          </p>
          <ul className="mt-4 flex flex-col divide-y divide-linen-300 rounded-card border border-linen-300">
            {linkedInstitutions.map((item) => (
              <li
                key={item.itemId}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <p className="font-sans text-[0.875rem] text-ink-900">
                  {item.institutionName}
                </p>
                <ReconnectAccountButton
                  itemId={item.itemId}
                  institutionName={item.institutionName}
                  label="Manage"
                  loadingLabel="Opening…"
                />
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Card className="p-8 text-center">
          <p className="font-sans text-[0.9375rem] text-linen-700">
            No linked accounts yet — add an account above to get started.
          </p>
        </Card>
      )}
    </main>
  );
}
