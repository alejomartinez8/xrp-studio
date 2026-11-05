# 009 — Keep the Google session after a reload

## Problem

XRPWeb keeps the Google session in memory only (`src/services/google-auth.ts`). Reloading the page
signs the user out, and they have to open Google's popup again.

## Solution

On startup, the sign-in widget asks the auth backend for a new access token; if it gets one, it
loads the profile and finishes the sign-in as usual (same `finalizeLogin` path as the popup).

- `GoogleAuthService.restoreSession()` only tries when the last sign-in in this browser did not end
  with a sign-out (`GoogleSession` in `localStorage`, set after the code exchange and removed on
  sign-out). Signed-out users make no extra request.
- It calls the existing `refresh-token` endpoint. With the fork's server (spec 008) the refresh
  token lives in an HttpOnly cookie that survives the reload. A backend that cannot restore the
  session answers with an error: the hint is cleared and the user signs in as before.
- Called once per page load, even with React StrictMode or more than one widget.

## Files

- `src/services/google-auth.ts`: `restoreSession()`, hint set on exchange and cleared on sign-out.
- `src/widgets/login.tsx`: one effect that restores the session on mount.
- `src/utils/localstorage.ts`: `GOOGLE_SESSION` key.
- Test: `src/services/tests/google-auth.spec.ts`.

## How to test

1. With the spec 008 setup, `npm run dev`, sign in with Google.
2. Reload: the avatar comes back without the popup.
3. Sign out and reload: the "Google Sign In" button is shown and no `refresh-token` request is made.
4. Expired session: with `GoogleSession=true` in `localStorage` and no refresh cookie, a reload makes
   one `refresh-token` request (401), clears the hint and shows the sign-in button (checked with
   Playwright).

Automated: `src/services/tests/google-auth.spec.ts` (no hint, restore once, backend refusal,
sign-out).

No visual change: the button and avatar are the same as before.

## Upstream

Possible. With XRPWeb's own backend it depends on whether that backend can refresh with a new
handshake token; if not, it falls back to today's behaviour.
