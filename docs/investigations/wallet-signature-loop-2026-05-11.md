# Investigation: Wallet Signature Loop

## Summary
The repeated wallet signature prompts are primarily caused by client-side auth state being local to each auth hook instance and never hydrated from the existing `/api/auth/me` server session before SIWE auto-signing. Newly mounted/remounted wallet auth consumers start from `isAuthenticated = false` and request nonce/sign/verify again even when `wagdie_session` is still valid; duplicate auth implementations, route-level consumers, optional API proxying, and Eliza auth can amplify the perceived prompt volume.

## Symptoms
- Connecting a wallet appears buggy.
- The app asks for many signatures repeatedly instead of authenticating once per session.

## Background / Prior Research
No external research gathered yet; initial triage suggests the relevant evidence should be in the workspace: wallet hooks/components, SIWE API routes, providers, middleware, and tests.

## Investigator Findings
<!-- Pair investigator will append structured analysis here: file:line refs, evidence, conclusions. -->

### 2026-05-11 - Pair Investigation Findings

#### Executive conclusion
- **Root-cause confidence: high.** The repeated signature prompts are best explained by **client-side auth state being local to each hook instance and never hydrated from the existing server session**. Any mounted `useAuth()` instance starts with `isAuthenticated = false` (`hooks/useAuth.ts:41`) and auto-signs as soon as a wallet address exists (`hooks/useAuth.ts:46-50`), without first calling `/api/auth/me` or `api.auth.getSession()`. The server already supports session hydration (`app/api/auth/me/route.ts:10-23`; `lib/api/endpoints.ts:134-135`), and tests assert that contract (`tests/api/auth-me-route.test.ts:17-44`), but the signing hooks do not consume it.
- **Secondary confidence: medium.** Duplicate mounted instances amplify the problem. The app shell globally mounts `Header` inside `Providers` (`app/layout.tsx:45-49`), `Header` mounts `WalletButton` (`components/layout/Header.tsx:119`, `components/layout/Header.tsx:138`), and `WalletButton` calls `useAuth()` (`components/wallet/WalletButton.tsx:12-13`). Route-level components also call `useAuth()`, so navigating to protected flows or opening mobile UI can create fresh local auth state and trigger another SIWE signing flow despite a valid `wagdie_session` cookie.
- **Proxy confidence: medium as a worsener, not the primary root cause.** When `WAGDIE_API_BASE_URL` is set, middleware proxies every `/api/*` request to the remote origin (`middleware.ts:10-18`) and returns the upstream response directly (`middleware.ts:38-41`) after rewriting forwarded host/proto (`middleware.ts:22-26`). Production auth cookies are marked `secure` (`lib/auth/session.ts:13-18`; `app/api/auth/verify/route.ts:78-85`), so local HTTP proxying can make persistence depend on browser handling of unmodified upstream `Set-Cookie` headers.

#### Hypothesis review
1. **Partly proved: parallel SIWE auth systems exist, but `useWalletAuth` does not appear production-mounted today.**
   - `useAuth()` auto-authenticates when `wallet.address` appears (`hooks/useAuth.ts:46-50`) and performs nonce -> SIWE message -> wallet signature -> verify (`hooks/useAuth.ts:60-91`).
   - `useWalletAuth()` independently auto-authenticates when `address` appears (`hooks/useWalletAuth.ts:55-61`) and performs its own nonce/sign/verify flow (`hooks/useWalletAuth.ts:77-132`).
   - `useWalletAuth()` is used by `UserDropdown` (`components/wallet/UserDropdown.tsx:5`, `components/wallet/UserDropdown.tsx:47`), but no production mount/import of `UserDropdown` was found; current `Header` uses `WalletButton` instead (`components/layout/Header.tsx:9`, `components/layout/Header.tsx:119`, `components/layout/Header.tsx:138`).
   - **Conclusion:** two parallel implementations are real technical debt, but current repeated prompts are more directly caused by multiple independent `useAuth()` instances plus local-only state.

2. **Proved: client auth state is local-only and not hydrated from `/api/auth/me`.**
   - `useAuth()` initializes local `isAuthenticated` to `false` (`hooks/useAuth.ts:41`) and only sets it after a new signature verifies (`hooks/useAuth.ts:96-98`). It never calls `/api/auth/me` or `api.auth.getSession()`.
   - `useWalletAuth()` also initializes local `isAuthenticated` to `false` (`hooks/useWalletAuth.ts:49`) and only sets it after a fresh verify (`hooks/useWalletAuth.ts:127-132`). It also never calls `/api/auth/me`.
   - A hydration hook exists, `useCurrentUser()`, and fetches `/api/auth/me` (`hooks/useCurrentUser.ts:18-29`), but repo search found no runtime consumers of `useCurrentUser()`.
   - Server session contract exists: verify saves `session.address`, `session.siwe`, and `session.expires` in iron-session (`app/api/auth/verify/route.ts:66-75`), and `/api/auth/me` returns valid session data when present (`app/api/auth/me/route.ts:10-23`).
   - **Conclusion:** refreshes, route remounts, mobile menu mounts, or any new hook instance will re-prompt because the client does not trust/hydrate the existing server session first.

3. **Partly proved: nonce overwrite is possible with parallel flows, but mitigated for simultaneous `useAuth()` only.**
   - `/api/auth/nonce` stores a single `siwe-nonce` cookie (`app/api/auth/nonce/route.ts:9-17`). `/api/auth/verify` reads that same cookie (`app/api/auth/verify/route.ts:35-40`), rejects mismatches (`app/api/auth/verify/route.ts:43-46`), and deletes it on success (`app/api/auth/verify/route.ts:63-64`). Tests explicitly cover mismatch/replay behavior (`tests/integration/auth-verify.test.ts:104-183`).
   - `useAuth()` has a module-level `activeAuthentication` promise guard (`hooks/useAuth.ts:15`, `hooks/useAuth.ts:60-94`), so two `useAuth()` instances that start at the same time should share one nonce/sign/verify flow.
   - `useWalletAuth()` has no equivalent module-level guard around its flow (`hooks/useWalletAuth.ts:55-61`, `hooks/useWalletAuth.ts:77-132`). If it is mounted concurrently with `useAuth()` or another `useWalletAuth()` instance, both can request `/api/auth/nonce` and overwrite the one `siwe-nonce` cookie.
   - **Conclusion:** nonce overwrite is a credible failure/retry mechanism if `useWalletAuth()` is mounted, but it is probably not the main active cause in the current production shell because `UserDropdown` is not mounted.

4. **Proved for `WalletButton`/`Header` plus other `useAuth` consumers; not proved for `UserDropdown` in production.**
   - All routes mount `Header` through `app/layout.tsx:45-49`; `Header` renders `WalletButton` at `components/layout/Header.tsx:119` and conditionally in the mobile menu at `components/layout/Header.tsx:138`; `WalletButton` calls `useAuth()` at `components/wallet/WalletButton.tsx:12-13`.
   - `/lore/submit` mounts `LoreSubmissionForm` (`app/lore/submit/page.tsx:33`), which calls `useAuth()` (`components/lore/submissions/LoreSubmissionForm.tsx:103-111`).
   - `/lore/submissions` mounts `UserSubmissionsList` (`app/lore/submissions/page.tsx:17`), which calls `useAuth()` (`components/lore/submissions/UserSubmissionsList.tsx:34-35`).
   - `/lore/submissions/[submissionId]` mounts `UserSubmissionDetail` (`app/lore/submissions/[submissionId]/page.tsx:18`), which calls `useAuth()` (`components/lore/submissions/UserSubmissionDetail.tsx:42-43`) and can conditionally mount another `LoreSubmissionForm` (`components/lore/submissions/UserSubmissionDetail.tsx:151-153`).
   - `/searing` mounts `SearingPageClient` (`app/searing/page.tsx:1-5`), which calls `useAuth()` (`components/searing/SearingPageClient.tsx:204-206`).
   - **Conclusion:** several pages can mount two or more local `useAuth()` states at once. `UserDropdown`/`useWalletAuth()` is present in the codebase (`components/wallet/UserDropdown.tsx:44-47`) but not currently wired into the production header.

5. **Proved as an additional, separate signature path; not an automatic mount-time prompt.**
   - `ChatSidebar` imports and calls `useElizaAuth()` (`components/chat/ChatSidebar.tsx:17`, `components/chat/ChatSidebar.tsx:42`). It is mounted through global `ChatDock` when a chat target exists (`components/chat/ChatDock.tsx:7-18`; `components/providers.tsx:42-47`). Character pages can set that target via `openChat()` (`app/characters/[tokenId]/page.tsx:30`, `app/characters/[tokenId]/page.tsx:130`).
   - `useElizaAuth()` first checks `/api/eliza/auth` for an existing token (`hooks/useElizaAuth.ts:95-113`), then, on `NO_TOKEN` or `TOKEN_EXPIRED`, requests an Eliza nonce (`hooks/useElizaAuth.ts:115-132`), signs the Eliza SIWE message (`hooks/useElizaAuth.ts:134-153`), and verifies it (`hooks/useElizaAuth.ts:155-174`).
   - This flow is triggered by `getToken()`, which `ChatSidebar` calls when loading history or sending a message (`components/chat/ChatSidebar.tsx:184-205`) and exposes through the “Load history” button (`components/chat/ChatSidebar.tsx:339-345`).
   - **Conclusion:** Eliza can add another wallet signature request after WAGDIE auth, but it is user/action-triggered rather than auto-signing merely because the wallet is connected.

6. **Plausible/proved as a worsener under local proxy.**
   - Local docs recommend `WAGDIE_API_BASE_URL=https://fateofwagdie.com` for UI-only work (`SETUP.md:38-49`; `README.md:41-58`).
   - With that env var, middleware bypasses local API route handlers and proxies `/api/*` upstream (`middleware.ts:10-18`, `middleware.ts:38-41`).
   - The auth/session cookies are set by the upstream environment with `secure: process.env.NODE_ENV === 'production'` (`lib/auth/session.ts:13-18`; `app/api/auth/nonce/route.ts:11-17`; `app/api/auth/verify/route.ts:78-85`). The proxy does not rewrite `Set-Cookie` attributes before returning the upstream response (`middleware.ts:38-41`).
   - **Conclusion:** if session cookies fail to persist through local HTTP proxying, `/api/auth/me` would keep returning unauthenticated and local-only hooks would repeatedly sign. Even when cookies persist, the local-only client state bug remains.

#### Eliminated or reduced hypotheses
- **Duplicate top-level wallet providers:** not found. `app/layout.tsx:45-49` mounts one `Providers`, and `components/providers.tsx:31-53` contains one `WagmiProvider`, one `QueryClientProvider`, one `RainbowKitProvider`, one `TransactionProvider`, and one `ChatDockProvider`.
- **`useWalletAuth()` as the current production trigger:** reduced. Its implementation is risky, but only `UserDropdown` imports it (`components/wallet/UserDropdown.tsx:5`, `components/wallet/UserDropdown.tsx:47`), and `Header` imports/renders `WalletButton` instead (`components/layout/Header.tsx:9`, `components/layout/Header.tsx:119`, `components/layout/Header.tsx:138`).
- **Eliza auth as the initial wallet-connection loop:** reduced. Eliza signing is triggered through `getToken()` (`hooks/useElizaAuth.ts:79-191`), not by a mount-time address effect; `ChatSidebar` calls it on history/send actions (`components/chat/ChatSidebar.tsx:184-205`).

#### Recommended fixes
1. **Make one canonical WAGDIE auth hook and hydrate it before signing.**
   - Update `hooks/useAuth.ts` to call `api.auth.getSession()` (`lib/api/endpoints.ts:134-135`) or `/api/auth/me` before `authenticate()`, and only sign when there is no valid session or the session address differs from the connected wallet. The auto-auth effect at `hooks/useAuth.ts:46-50` should wait for that hydration result.
   - Retire or wrap `hooks/useWalletAuth.ts` so `UserDropdown` and future wallet UI cannot run a second SIWE implementation (`hooks/useWalletAuth.ts:43-203`).

2. **Lift auth state out of individual component instances.**
   - Add an `AuthProvider` under `components/providers.tsx:31-53` or use React Query with a shared `/api/auth/me` query. `WalletButton`, lore pages, and searing should consume shared auth state instead of each `useAuth()` instance maintaining its own `isAuthenticated` (`hooks/useAuth.ts:41-43`).

3. **Stop auto-signing on every fresh mount.**
   - Replace the mount-time `authenticate()` call in `hooks/useAuth.ts:46-50` and `hooks/useWalletAuth.ts:55-61` with: hydrate session -> mark authenticated if valid -> otherwise show an explicit “Sign in” action. If auto-sign remains desired, gate it with a per-address “already attempted this page load” guard and server-session check.

4. **Make nonce/session flow robust against parallel clients.**
   - If any parallel auth hook remains, add a shared in-flight guard equivalent to `activeAuthentication` (`hooks/useAuth.ts:15`, `hooks/useAuth.ts:60-94`) or move nonce/sign/verify orchestration to the canonical provider. This avoids multiple `/api/auth/nonce` calls racing over the single `siwe-nonce` cookie (`app/api/auth/nonce/route.ts:11-17`; `app/api/auth/verify/route.ts:35-46`).

5. **Handle local proxy cookies deliberately.**
   - In `middleware.ts`, either exclude `/api/auth/*` from remote proxying during local dev or explicitly validate/rewrite `Set-Cookie` behavior for localhost when `WAGDIE_API_BASE_URL` is enabled (`middleware.ts:10-18`, `middleware.ts:38-41`). Document the expected SIWE behavior next to the UI-only setup instructions (`SETUP.md:38-49`).

6. **Clarify Eliza auth UX.**
   - Keep `useElizaAuth()` separate from WAGDIE SIWE, but label it in `ChatSidebar` as a second, chat-specific signature when no Eliza token exists (`components/chat/ChatSidebar.tsx:339-345`; `hooks/useElizaAuth.ts:115-174`).

## Investigation Log

### Phase 1 - Initial Assessment
**Hypothesis:** Repeated signature prompts may be caused by client code invoking SIWE signing in a render/effect loop, unstable callback dependencies, session/auth state not persisting, duplicated wallet providers/hooks, or auth verification failures causing retries.
**Findings:** Preliminary path/content search surfaced wallet hooks/components and SIWE API routes: `hooks/useWallet.ts`, `hooks/useWalletAuth.ts`, `components/wallet/WalletButton.tsx`, `components/wallet-connect-button.tsx`, `app/api/auth/nonce/route.ts`, `app/api/auth/verify/route.ts`, plus Eliza-specific auth routes.
**Evidence:** Search only; detailed evidence pending context builder and pair investigation.
**Conclusion:** Needs investigation.

### Phase 2 - Context Builder Initial Assessment
**Hypothesis:** The signature loop is caused by multiple independent SIWE clients, local-only auth state, and missing `/api/auth/me` hydration before signing.
**Findings:** Context builder selected wallet hooks, wallet UI, providers, auth routes, middleware, Eliza auth, and tests. It identified two base SIWE hooks (`hooks/useAuth.ts` and `hooks/useWalletAuth.ts`) that independently auto-trigger authentication when an address exists, plus a separate Eliza SIWE-like flow.
**Evidence:** Selection seeded with `hooks/useAuth.ts`, `hooks/useWalletAuth.ts`, `hooks/useCurrentUser.ts`, `components/wallet/WalletButton.tsx`, `components/wallet/UserDropdown.tsx`, `app/api/auth/*`, `middleware.ts`, and Eliza auth files.
**Conclusion:** Needs pair verification with exact file:line evidence.

### Phase 4 - Oracle Synthesis
**Hypothesis:** The root cause should be framed as frontend session hydration/state ownership failure, not as a guaranteed backend session reset or a narrow infinite React effect loop.
**Findings:** Oracle agreed the strongest evidence is per-hook in-memory auth state initialized to unauthenticated, missing `/api/auth/me` hydration, global `WalletButton` mounting `useAuth()`, and additional route-level `useAuth()` consumers. It warned against overclaiming `useWalletAuth()`, nonce races, Eliza, or middleware proxy as the active production trigger without runtime evidence.
**Evidence:** Verified code references in `hooks/useAuth.ts:41-50`, `hooks/useWalletAuth.ts:49-61`, `hooks/useCurrentUser.ts:18-29`, `app/api/auth/me/route.ts:10-23`, `components/layout/Header.tsx:119,138`, `components/wallet/WalletButton.tsx:13`, `app/api/auth/verify/route.ts:35-46,63-85`, and `middleware.ts:10-41`.
**Conclusion:** Confirmed primary root cause; secondary hypotheses reduced or marked as environmental/conditional.

## Root Cause
The most defensible root cause is **frontend session hydration/state ownership failure**:

1. `useAuth()` initializes `isAuthenticated` as `false` for every hook instance (`hooks/useAuth.ts:41`) and auto-calls `authenticate()` whenever a wallet address appears (`hooks/useAuth.ts:46-50`).
2. `authenticate()` immediately performs the full nonce → SIWE message → wallet signature → verify flow (`hooks/useAuth.ts:60-91`) instead of first checking whether the existing server session is valid.
3. The backend already exposes that session check: `/api/auth/me` returns a valid session when `session.address` and `session.expires` are present (`app/api/auth/me/route.ts:10-23`), and `useCurrentUser()` fetches `/api/auth/me` (`hooks/useCurrentUser.ts:18-29`), but the signing hooks do not consume that state.
4. `WalletButton` is globally mounted through `Header` (`components/layout/Header.tsx:119,138`) and calls `useAuth()` (`components/wallet/WalletButton.tsx:13`), while lore and searing pages also mount their own `useAuth()` consumers. Those consumers get separate local `isAuthenticated` state, so refreshes, route transitions, mobile-menu mounts, or dev Fast Refresh can cause another signature prompt despite an existing `wagdie_session`.

This is not best described as a single infinite React effect loop: the auto-auth effect depends on address. The repeated prompts are more likely caused by fresh/remounted consumers and local state reset, with no shared provider or session hydration gate.

### Secondary contributors / reduced hypotheses
- `useWalletAuth()` is a real architectural risk because it independently initializes local auth state (`hooks/useWalletAuth.ts:49-61`) and performs its own nonce/sign/verify flow (`hooks/useWalletAuth.ts:77-132`) without sharing `useAuth()`'s module-level `activeAuthentication`. However, current evidence reduces it as the active production trigger because `UserDropdown` is not mounted by the current `Header`.
- Nonce overwrite is credible if `useAuth()` and `useWalletAuth()` both mount: `/api/auth/nonce` uses one `siwe-nonce` cookie and `/api/auth/verify` rejects mismatches (`app/api/auth/verify/route.ts:35-46`). For simultaneous `useAuth()` instances only, `activeAuthentication` reduces this race, but later remounts still re-prompt after the promise clears.
- Eliza auth is a separate signature path, not the initial wallet connect loop. It can add prompts when chat calls `getToken()`, but it is action/token driven rather than triggered merely by wallet connection.
- `middleware.ts` can worsen local development if `WAGDIE_API_BASE_URL` proxies all `/api/*` auth requests to a remote origin (`middleware.ts:10-41`), especially around secure cookies and localhost, but this requires environment/cookie tracing before calling it the root cause.
- Duplicate top-level wallet providers were not found: the app mounts one provider stack in `components/providers.tsx:31-53`.

## Recommendations
1. **P0 — Hydrate before signing in the canonical auth hook.** Update `hooks/useAuth.ts` so address detection first calls `api.auth.getSession()` / `/api/auth/me`; if the returned session address matches the connected wallet, set authenticated and do not request a signature. Only run nonce/sign/verify when no valid matching session exists.
2. **P0 — Centralize auth state.** Add a shared `AuthProvider` under `components/providers.tsx` or use a shared React Query `/api/auth/me` query. `WalletButton`, lore pages, searing, and future consumers should read one auth state instead of each `useAuth()` instance owning `isAuthenticated`.
3. **P0 — Stop unconditional mount-time signing.** Replace the current auto-sign behavior at `hooks/useAuth.ts:46-50` with hydrate-first behavior and ideally an explicit “Sign in” action. If auto-sign remains, gate it by hydration completed, no valid session, no in-flight auth for the address, and no prior user rejection for the current page load.
4. **P1 — Retire or wrap `useWalletAuth()`.** Make `hooks/useWalletAuth.ts` a compatibility wrapper over the canonical auth provider or remove it, so `UserDropdown` and future wallet UI cannot start a second independent SIWE implementation.
5. **P1 — Move single-flight locking into the shared auth layer.** The `activeAuthentication` guard in `hooks/useAuth.ts` should become a provider-level, per-address guard that covers every WAGDIE SIWE consumer and prevents races over the single `siwe-nonce` cookie.
6. **P2 — Validate proxy behavior.** In environments using `WAGDIE_API_BASE_URL=https://fateofwagdie.com`, confirm `/api/auth/nonce`, `/api/auth/verify`, and `/api/auth/me` set/send cookies correctly on localhost. Consider excluding `/api/auth/*` from the remote proxy during local development.
7. **P2 — Clarify Eliza UX and guard token signing.** Label Eliza signing as chat-specific and add a single-flight guard around `useElizaAuth().getToken()` so multiple chat actions do not create multiple Eliza prompts.

## Preventive Measures
- Add regression tests proving a valid `/api/auth/me` session prevents SIWE signing on remount.
- Add tests for multiple mounted auth consumers sharing one auth state and one in-flight auth attempt.
- Add tests ensuring rejected signatures are not auto-retried on remount without explicit user action.
- Add coverage ensuring `useWalletAuth()` cannot launch an independent base SIWE flow if retained.
- Document local proxy auth-cookie expectations in `SETUP.md` if `WAGDIE_API_BASE_URL` remains the UI-only development path.
