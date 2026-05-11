# Wallet Signature Loop Fix — Plan Critique

**Reviewed:** `docs/plans/wallet-signature-loop-fix-2026-05-11.md`
**Date:** 2026-05-11
**Scope:** Under-specified seams, contradictions, over-planning, ordering questions.

## 1. Top 3 under-specified seams

1. **Per-address rejection guard storage (Work Item 4).** Plan says "record user signature rejection per normalized address for the current page load" but never says *where* it lives. Module-level `Map`, React ref inside the provider, and provider state behave very differently across `hooks/useAuth.ts:46-50`-style remounts, App Router client navigations, and StrictMode double-invocation. Pick one before writing tests, otherwise the "no-auto-retry" assertion in Work Item 7 is unprovable. Today's analog is the module-global `let activeAuthentication` at `hooks/useAuth.ts:16` — explicitly say whether the new guard follows the same lifetime or the provider's.

2. **Hydration state machine (Work Item 3).** "After hydration completes" branches into matching / mismatch / 401 / network error, but the plan never names the states or transitions. Two cases will bite:
   - `useWallet()` briefly emits `address: undefined → defined` on reconnect (Wagmi behavior). Without an explicit `idle → hydrating → hydrated:{matched|none|mismatch} → error` machine, the gate in step 3 ("no auth in flight for that address") is easy to mis-implement.
   - `/api/auth/me` resolving for a *prior* address after a wallet switch — Work Item 1 mentions "track by normalized address" but doesn't say whether the result is discarded or used to clear state.

3. **Relationship to `hooks/useCurrentUser.ts:18-60`.** The investigation cites this as the existing `/api/auth/me` consumer, but the plan has the new provider call `api.auth.getSession()` directly. If `useCurrentUser` already owns a React Query key for the session, the provider should consume *that* key (or vice versa); otherwise two cache lines for the same endpoint will drift. This is the single biggest missing dependency.

## 2. Contradictions / missing dependencies

- **`useWalletAuth` fate is filed under Decisions, not Open Questions.** "Convert `useWalletAuth()` into a compatibility wrapper **or** remove its independent SIWE flow entirely" is still an open choice — it changes Work Item 5 and 6 (`UserDropdown` consumer choice). Resolve before kicking off implementation.
- **Disconnect path is silent on the new guards.** `api.auth.logout()` is called in current `useAuth.ts:121`, but the plan never says whether disconnect clears the per-address rejection guard or the in-flight promise. The "disconnect → reconnect same address" UX is undefined.
- **`chainId: 1` hardcode** appears in both `hooks/useAuth.ts:74` and `hooks/useWalletAuth.ts:99`. Plan moves signing into the provider but doesn't say whether chainId stays hardcoded or becomes a prop. Minor, but a one-line decision now avoids a second refactor.

## 3. Over-planning — cut or collapse

- **Work Item 8 (Storybook mocks)** — pure tooling polish; gate behind successful manual validation or drop from this plan.
- **Work Item 10 (Optional follow-ups)** — already labeled optional; delete from this plan, file as separate tickets so the base scope reads cleanly.
- **Work Item 7's six-scenario test list and Work Item 9's four manual scenarios** read like `tasks.md` items. Collapse each to one sentence ("regression tests cover hydration-no-sign, multi-consumer single-flight, rejection no-retry"); save the enumeration for the test file or the PR description.
- **Work Item 6's per-component breakdown** lists components that are explicitly "keep behavior stable" — those don't need plan entries.

Net effect: roughly half the plan body can be cut without losing engineering signal.

## 4. Questions whose answers change implementation order

1. **Keep `useWalletAuth` as a wrapper, or delete it?** Wrapper → must land in the same PR as the provider; deletion → `UserDropdown` (`components/wallet/UserDropdown.tsx:47`) migrates to `useAuth` *first*, then the provider goes in. Different first commit.
2. **Does the rejection guard survive route navigation?** Provider-scoped state survives client navigations but is wiped on full reload; module-scoped state survives both until the tab closes. Pick before writing the provider — the data structure differs.
3. **Reuse `useCurrentUser`'s session query, or duplicate?** If reused, the provider becomes a thin coordinator around an existing React Query cache and Work Item 1 shrinks; if duplicated, you need cache-invalidation rules after `verify`.
4. **Is the goal "one signature ever per session" or "one signature per page load until rejected"?** The Decisions section implies the former, but Work Item 4 implies the latter. Confirming this changes whether the post-verify `/api/auth/me` refresh in Work Item 3 is required or merely defensive.

---

**Recommendation:** Resolve the four ordering questions, name the hydration state machine, decide where the rejection guard lives, then trim Work Items 6–10 by ~50%. The remaining plan is one page and directly implementable.
