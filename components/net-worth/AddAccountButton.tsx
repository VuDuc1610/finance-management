"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePlaidLink, PlaidLinkOnSuccessMetadata } from "react-plaid-link";

export function AddAccountButton() {
  const router = useRouter();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/plaid/link-token", { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setLinkToken(data.linkToken);
      })
      .catch(() => {
        if (!cancelled) setLinkToken(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const onSuccess = useCallback(
    (public_token: string | null, metadata: PlaidLinkOnSuccessMetadata) => {
      setIsLinking(true);
      setError(null);
      fetch("/api/plaid/exchange-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicToken: public_token,
          institutionName: metadata.institution?.name,
        }),
      })
        .then((res) => {
          if (res.ok) {
            router.refresh();
          } else {
            setError("Couldn't connect that account. Please try again.");
          }
        })
        .catch(() => {
          setError("Couldn't connect that account. Please try again.");
        })
        .finally(() => {
          setIsLinking(false);
        });
    },
    [router],
  );

  const { open, ready } = usePlaidLink({
    token: linkToken ?? "",
    onSuccess,
  });

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => open()}
        disabled={!ready || isLinking}
        className="rounded-pill bg-dye-saffron px-4 py-2 font-sans text-[0.8125rem] font-medium text-ink-900 hover:opacity-90 disabled:opacity-50"
      >
        {isLinking ? "Connecting…" : "+ Add account"}
      </button>
      {error ? (
        <p className="font-sans text-[0.75rem] text-dye-madder">{error}</p>
      ) : null}
    </div>
  );
}
