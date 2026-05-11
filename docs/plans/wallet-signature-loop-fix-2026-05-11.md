# Wallet Signature Loop Fix: Plan

## Goal

Stop repeated WAGDIE wallet signature prompts by making auth session-aware, shared across consumers, and guarded against automatic re-prompts after a valid session or user rejection.

## Background

- The root cause is per-hook auth state that starts unauthenticated and auto-signs before checking the server session (`docs/investigations/wallet-signature-loop-2026-05-11.md:108-116`).
- `useAuth()` owns local `isAuthenticated`, auto-authenticates when a wallet address appears, and performs nonce → SIWE signature → verify directly (`hooks/useAuth.ts:41-50`, `hooks/useAuth.ts:60-102`).
- Server session reuse already exists through `/api/auth/me` and `api.auth.getSession()` (`app/api/auth/me/route.ts:11-23`, `lib/api/endpoints.ts:125-127`). `useCurrentUser()` also fetches `/api/auth/me`, but it is not a shared auth owner today (`hooks/useCurrentUser.ts:18-60`).
- `WalletButton` is globally mounted through layout/header, while lore and searing pages mount additional `useAuth()` consumers (`app/layout.tsx:45-49`, `components/layout/Header.tsx:119,138`, `components/wallet/WalletButton.tsx:13`, `components/lore/submissions/LoreSubmissionForm.tsx:110`, `components/searing/SearingPageClient.tsx:204-206`).
- `useWalletAuth()` is a second WAGDIE SIWE implementation and must not keep an independent nonce/sign/verify path (`hooks/useWalletAuth.ts:49-132`, `components/wallet/UserDropdown.tsx:47`).
- Local UI-only development can proxy `/api/*` through `WAGDIE_API_BASE_URL`; middleware currently preserves upstream `Set-Cookie`, so proxy behavior is validation scope, not a presumed code change (`middleware.ts:11-62`).

## Decisions

- Keep `useAuth()` as the canonical public hook path.
- Add one shared `AuthProvider` under `components/providers.tsx`, inside Wagmi/RainbowKit.
- Preserve first-connect auto-sign only after hydration proves there is no valid matching session.
- Store in-flight auth, hydration request IDs, and per-address rejection guards in provider refs/state. This survives client route navigation but resets on full reload.
- Convert `useWalletAuth()` into a compatibility wrapper over `useAuth()`; do not delete the hook in this pass.
- Leave SIWE `chainId: 1` unchanged; this plan fixes prompt loops, not chain support.
- Keep Eliza chat auth separate from WAGDIE auth.

## Approach

1. **Centralize auth ownership.** Add `contexts/AuthContext.tsx` with shared session/auth state, actions, and guards. Mount it once in `components/providers.tsx`.
2. **Use an explicit hydration state machine.** For each normalized wallet address: `idle` → `hydrating` → `matched | none | mismatch | error`. Discard hydration responses whose request id/address no longer matches the current wallet.
3. **Hydrate before signing.** On connected address, call `api.auth.getSession()` / `/api/auth/me`. A matching session marks the app authenticated and must not request a nonce or signature.
4. **Gate SIWE centrally.** Start nonce/sign/verify only when hydration completed with `none` or `mismatch`, no auth is already in flight for that address, and the address has not rejected signing during this page load.
5. **Refresh after verify.** After `/api/auth/verify` succeeds, call `/api/auth/me` and mark authenticated only if the session loads for the same address. If verify succeeds but session hydration fails, show an error and do not loop.
6. **Make hooks facades.** Refactor `hooks/useAuth.ts` to return shared context and `hooks/useWalletAuth.ts` to adapt that context without direct `useSignMessage`, `SiweMessage`, `/api/auth/nonce`, or `/api/auth/verify` calls.
7. **Update consumers only for hydration UX.** Keep existing gates, but avoid showing “sign in required” while `isHydrating` is true.

## Work Items

1. **Shared provider**
   - Create `contexts/AuthContext.tsx` with `AuthProvider`, `useAuthContext`, shared `session`, `isAuthenticated`, `isHydrating`, `hasHydrated`, `isAuthenticating`, `siweStep`, `error`, `connect`, `disconnect`, `authenticate`, `refreshSession`, and `clearError`.
   - Use provider refs for `activeHydration`, `activeAuthentication`, and `rejectedAddresses` keyed by normalized address.
   - On disconnect/logout, call `api.auth.logout()`, disconnect the wallet, clear session/auth state, clear active promises, and clear the rejection guard for that address so a deliberate reconnect can sign again.

2. **Provider wiring**
   - Mount `AuthProvider` in `components/providers.tsx` inside `RainbowKitProvider` and above app children/chat providers.
   - Keep auth API route contracts unchanged.

3. **Hydration and signing flow**
   - Implement the address-scoped hydration state machine.
   - Implement the auto-sign gate after hydration.
   - Preserve one automatic first-time SIWE prompt when no valid session exists.
   - Prevent automatic retry after signature rejection until an explicit sign action clears the guard.

4. **Hook compatibility**
   - Replace `hooks/useAuth.ts` internals with a context facade while preserving existing return fields and adding only useful hydration/session fields.
   - Refactor `hooks/useWalletAuth.ts` into a wrapper over `useAuth()` with its existing shape for `UserDropdown` compatibility.
   - Decide whether `hooks/useCurrentUser.ts` should become a thin read-only facade over the new auth context or remain as a legacy standalone hook; do not allow it to compete as a second source of auth truth.

5. **Consumer adjustments**
   - Add hydration/loading handling where current UI would otherwise show an unauthenticated/sign prompt: wallet button if needed, lore submission/list/detail, and searing.
   - Do not introduce new component-local auth state.

6. **Regression coverage**
   - Add hook/provider tests for: valid session skips signing, remount skips signing, multiple consumers share one in-flight auth, address mismatch is not trusted, verify-success/session-refresh-failure does not loop, rejection does not auto-retry, and `useWalletAuth()` delegates to canonical auth.
   - Keep route contract tests passing: `tests/api/auth-me-route.test.ts`, `tests/integration/auth-nonce.test.ts`, `tests/integration/auth-verify.test.ts`, `tests/integration/rate-limit-auth.test.ts`.

7. **Mocks and validation**
   - Update Storybook/test auth mocks only as needed for the provider and additive auth fields.
   - Manually validate: normal local API, a multi-consumer route such as `/lore/submit`, rejection/retry behavior, and proxy mode with `WAGDIE_API_BASE_URL=https://fateofwagdie.com`.

## Open Questions

None blocking. The only follow-up decision is whether to deprecate `useCurrentUser()` after implementation; it must not remain an independent auth source if callers start relying on the provider.

## Validation Commands

```bash
bun run test -- tests/hooks/useAuth.test.tsx
bun run test -- tests/hooks/useWalletAuth.test.tsx
bun run test -- tests/api/auth-me-route.test.ts tests/integration/auth-nonce.test.ts tests/integration/auth-verify.test.ts tests/integration/rate-limit-auth.test.ts
bun run lint
```

## References

- Investigation: `docs/investigations/wallet-signature-loop-2026-05-11.md`
- Intended SIWE flow: `docs/architecture-diagram.md:327-348`
- Current auth hook: `hooks/useAuth.ts`
- Secondary auth hook: `hooks/useWalletAuth.ts`
- Current user session route: `app/api/auth/me/route.ts`
- Auth API wrapper: `lib/api/endpoints.ts`
- Provider stack: `components/providers.tsx`
- Middleware proxy: `middleware.ts`
