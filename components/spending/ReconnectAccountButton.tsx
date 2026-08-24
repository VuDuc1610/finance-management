"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePlaidLink, PlaidLinkOnSuccessMetadata } from "react-plaid-link";

interface ReconnectAccountButtonProps {
  itemId: number;
  institutionName: string;
}

export function ReconnectAccountButton({
  itemId,
  institutionName,
}: ReconnectAccountButtonProps) {
  const router = useRouter();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/plaid/link-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    })
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
  }, [itemId]);

  const onSuccess = useCallback(
    (public_token: string | null, metadata: PlaidLinkOnSuccessMetadata) => {
      setIsLinking(true);
      setError(null);
      fetch("/api/plaid/exchange-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicToken: public_token,
          institutionName: metadata.institution?.name ?? institutionName,
        }),
      })
        .then((res) => {
          if (res.ok) {
            router.refresh();
          } else {
            setError("Couldn't reconnect that account. Please try again.");
          }
        })
        .catch(() => {
          setError("Couldn't reconnect that account. Please try again.");
        })
        .finally(() => {
          setIsLinking(false);
        });
    },
    [router, institutionName],
  );

  const { open, ready } = usePlaidLink({
    token: linkToken ?? "",
    onSuccess,
  });

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => open()}
        disabled={!ready || isLinking}
        className="rounded-pill border border-dye-saffron px-3 py-1.5 font-sans text-[0.8125rem] font-medium text-ink-900 hover:bg-dye-saffron/10 disabled:opacity-50"
      >
        {isLinking ? "Reconnecting…" : `Reconnect ${institutionName}`}
      </button>
      {error ? (
        <p className="font-sans text-[0.75rem] text-dye-madder">{error}</p>
      ) : null}
    </div>
  );
}
