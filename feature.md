# Feature: Plaid Item webhooks (reactive re-auth detection)

## Why

Right now we only find out an Item (bank connection) is broken —
`ITEM_LOGIN_REQUIRED`, e.g. the Discover/Chase failures we hit — when the
daily `snapshot-balances` / `sync-transactions` crons happen to run into it
(or when we curl them manually). Plaid can push us that same information the
moment it happens via a webhook, instead of waiting up to a day.

This is not a bug fix for anything currently broken — it's a
detection/notification improvement. Reconnecting still requires the user to
go through Plaid Link's update mode (already built: the "Manage" button on
`/manage-accounts`).

## How it works

- All Item-related events arrive with `webhook_type: "ITEM"`. The one we
  care about is `webhook_code: "ERROR"`, which fires when an Item enters an
  error state that needs user action (covers `ITEM_LOGIN_REQUIRED` and
  friends). Other useful codes:
  - `PENDING_DISCONNECT` — fires ~7 days before a US/CA Item is cut off, so
    we could warn the user before it actually breaks.
  - `PENDING_EXPIRATION` — same idea for UK/EU OAuth consent.
  - `USER_PERMISSION_REVOKED` / `USER_ACCOUNT_REVOKED` — user revoked access
    directly with the bank/Plaid.
  - `LOGIN_REPAIRED` — Item recovered on its own without update mode; useful
    to auto-clear any "needs reconnect" flag we show in the UI.

- Example payload shape:
  ```json
  {
    "webhook_type": "ITEM",
    "webhook_code": "ERROR",
    "item_id": "...",
    "error": {
      "error_code": "ITEM_LOGIN_REQUIRED",
      "error_message": "...",
      ...
    }
  }
  ```

## Implementation sketch

1. **New route**: `app/api/plaid/webhook/route.ts` (`POST`), publicly
   reachable (Plaid calls it directly, no `Authorization: Bearer` like our
   cron routes — auth is via signature verification instead, see below).

2. **Register the webhook URL** with Plaid. Either:
   - Pass `webhook: "https://<domain>/api/plaid/webhook"` when creating the
     Link token (`/api/plaid/link-token`), or
   - Call `/item/webhook/update` per existing item to point it at the new
     URL retroactively (needed for Items — Discover, Chase, Robinhood —
     that were linked before this feature existed).

3. **Verify authenticity before trusting the payload** (Plaid docs:
   [Webhook verification](https://plaid.com/docs/api/webhooks/webhook-verification/)):
   - Plaid signs each webhook with a JWT in the `Plaid-Verification` header.
   - Decode the JWT header (unverified) and check `alg === "ES256"`.
   - Take the `kid` from the JWT header, call
     `/webhook_verification_key/get` (cache the response — no need to
     refetch per request) to get the JWK.
   - Verify the JWT signature with that key (use a real JWT/JWK library,
     e.g. `jose` — Plaid explicitly recommends not hand-rolling this).
   - Check `iat` — reject anything older than 5 minutes (replay protection).
   - Recompute SHA-256 of the raw request body and compare to
     `request_body_sha256` in the JWT payload (constant-time compare).

4. **On a valid `ITEM_LOGIN_REQUIRED` error webhook**: look up the
   `plaidItems` row by `item_id`, set `transactionsConsentMissing` (or a new
   dedicated `needsReauth` flag) the same way `sync-transactions/route.ts`
   already does today for `ADDITIONAL_CONSENT_REQUIRED`.

5. **Surface it in the UI**: `/manage-accounts` already lists institutions
   with a reconnect button — just add a visible "needs reconnect" badge
   driven by that flag instead of the user only finding out when a balance
   goes stale.

## Open questions for later

- Do we want email/push notification on top of the UI badge, or is the
  badge enough for a single-user app?
- Should `PENDING_DISCONNECT`/`PENDING_EXPIRATION` get their own "reconnect
  soon" state, distinct from the hard-broken `ERROR` state?
- Webhook endpoint needs to stay reachable without our `CRON_SECRET` auth —
  make sure it's not accidentally protected by middleware, and that
  signature verification is the only gate.

## References

- https://plaid.com/docs/api/items/#item-webhooks
- https://plaid.com/docs/api/webhooks/webhook-verification/
- https://plaid.com/docs/link/update-mode/
- https://plaid.com/docs/errors/item/
