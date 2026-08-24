"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePlaidLink, PlaidLinkOnSuccessMetadata } from "react-plaid-link";

export function AddAccountButton() {
  const router = useRouter();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);

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
      fetch("/api/plaid/exchange-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicToken: public_token,
          institutionName: metadata.institution?.name,
        }),
      })
        .then(() => {
          router.refresh();
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
    <button
      type="button"
      onClick={() => open()}
      disabled={!ready || isLinking}
      className="rounded-pill bg-dye-saffron px-4 py-2 font-sans text-[0.8125rem] font-medium text-ink-900 hover:opacity-90 disabled:opacity-50"
    >
      {isLinking ? "Connecting…" : "+ Add account"}
    </button>
  );
}
