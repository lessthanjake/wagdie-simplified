# Investigation: Staking / Unstaking Failure

## Summary
Staking/unstaking is unreliable because the app conflates DB location IDs (`locations.id` / `wagdie_characters.location_id`, slug text such as `concord_searing`) with on-chain location IDs (`chain_location_id` / contract `uint64`). This can block staking before a transaction, prevent successful chain transactions from syncing back to DB/UI state, and make DB-backed staking status parsing fail.

## Symptoms
- User reports: "Staking / unstaking doesn't work why??"
- Exact UI/API error is not yet known.

## Background / Prior Research
No external research performed initially; first pass treats this as an in-workspace Next.js/React/blockchain flow issue.

## Investigator Findings
<!-- Pair investigator will append structured analysis here: file:line refs, evidence, conclusions. -->

### Pair Investigator Findings - 2026-05-06

#### Executive conclusion
The primary Context Builder hypothesis is **confirmed**. The map staking path, chain-to-DB sync path, and DB-backed staking-status path do not consistently distinguish:

- **DB location ID**: `locations.id` / `wagdie_characters.location_id`, typically a string slug/UUID used for joins and map display.
- **On-chain location ID**: numeric `chain_location_id` / contract `uint64 locationId`.

This explains both "can't stake" symptoms and "transaction succeeded but UI still looks wrong" symptoms, depending on the specific location data present.

#### Root-cause candidates ranked

1. **P0 - Map staking derives the contract `locationId` from `location.id`, not `chain_location_id` - CONFIRMED**
   - `Location` explicitly has both `id: string` and optional `chain_location_id?: number | string` (`lib/types/map.ts:23-29`). The Phaser event payload also carries both `id` and `chain_location_id` (`game/EventBus.ts:23-29`).
   - Map page sends the full `locations` array to Phaser unchanged via `EventBus.emit(MapEvents.UPDATE_LOCATIONS, locations)` (`hooks/map/useMapPageEventBridge.ts:35-39`), and marker creation stores the original location object as marker `data` (`game/scenes/map/marker-manager.ts:69-84`).
   - `toLocation()` preserves `chain_location_id` (`lib/utils/mapOrchestration.ts:59-64`), but `getStakingLocationSelection()` then calls `parseChainLocationId(location.id)` (`lib/utils/mapOrchestration.ts:76-77`) instead of parsing `location.chain_location_id`.
   - The warning message says the location has no valid `chain_location_id` (`lib/utils/mapOrchestration.ts:79-80`), which further shows the code intended chain-ID validation but validates the DB ID instead.
   - The parsed value becomes `selectedLocation.locationId` (`lib/utils/mapOrchestration.ts:88-91`) and is passed directly to the contract stake call (`hooks/map/useMapStakingPanel.ts:262-269`).
   - `parseChainLocationId()` rejects non-numeric strings such as slugs (`lib/utils/chainIds.ts:28-38`). Existing schema/docs define `locations.id` as slug-format text, e.g. `concord_searing` / `forsaken_lands` (`docs/database-schema.md:317-345`) and migrations seed string IDs (`supabase/migrations/20251028000000_page_wireframes_schema.sql:254-258`, `supabase/migrations/20251103000000_add_map_tables.sql:80-86`).
   - **Conclusion:** if `locations.id` is a slug, staking is blocked with "This location is not registered on-chain" even when `chain_location_id` exists. If `locations.id` happens to be numeric but differs from the chain ID, the wrong `uint64 locationId` is sent to `stakeWagdies`.

2. **P0 - Chain-to-DB staking sync maps chain `locationId` against `locations.id`, not `locations.chain_location_id` / metadata - CONFIRMED**
   - Chain read obtains `wagdieIdToInfo.locationIdCur` and stores it as `chainLocationIdString` (`lib/services/sync/staking-state-sync.ts:376-389`).
   - `fetchLocationIdMap()` queries only `locations.id` with `.select('id').in('id', unique)` (`lib/services/sync/staking-state-sync.ts:183-190`) and builds `map.set(row.id, row.id)` (`lib/services/sync/staking-state-sync.ts:200-204`). It does not select or compare `chain_location_id`, nor `metadata->>chain_location_id`.
   - For staked tokens, a missing mapping marks the result failed and does not write DB state (`lib/services/sync/staking-state-sync.ts:431-438`, `lib/services/sync/staking-state-sync.ts:463-472`).
   - Location normalization already anticipates `chain_location_id` either as a column-like field or metadata value (`lib/repositories/locationRepository.ts:73-82`), and a separate notifier uses metadata fallback semantics (`scripts/discord/notifier.ts:258-263`), but staking sync does not.
   - **Conclusion:** successful chain stakes cannot update `wagdie_characters.location_id` unless the DB primary key string exactly equals the on-chain numeric ID. With slug/UUID location IDs, `/api/sync/staking` returns `success: false, error: 'No location mapping for chain_location_id'`, leaving DB and map UI stale.

3. **P1 - DB staking status returns DB `location_id`, while the client parses it as `BigInt` - CONFIRMED when DB IDs are non-numeric**
   - DB status repository selects `token_id, location_id` from the characters table (`lib/repositories/activity-repository.ts:181-185`).
   - The API default path is documented/commented as database status from `location_id` (`app/api/characters/staking-status/route.ts:101-128`) and returns it as `locationId`.
   - `useStakingStatuses()` defaults to `source: 'db'` (`hooks/useStakingStatuses.ts:73`) and unconditionally converts any non-null API `locationId` with `BigInt(status.locationId)` (`hooks/useStakingStatuses.ts:29-40`).
   - If the DB value is `concord_searing`, `forsaken_lands`, a UUID, or any other non-numeric ID, that conversion throws. The hook catches it as a fetch/status error and clears the status map (`hooks/useStakingStatuses.ts:126-142`).
   - **Conclusion:** this can make already-staked characters appear unstaked or make the staking panel show stale/error state even when DB data exists. Tests currently mock numeric DB `location_id` (`tests/api/characters-staking-status-route.test.ts:74-87`), so they do not cover real slug/UUID semantics.

4. **P1 - Post-transaction sync failures are not propagated to staking callers; this can make successful chain txs look stale/failed in the UI - CONFIRMED with nuance**
   - After confirmed contract success, `useStaking` calls `syncStakingStateToDb()` (`hooks/useStaking.ts:232-236`).
   - If `/api/sync/staking` returns non-OK or per-token `success: false`, the helper logs and shows a "Staking Sync Failed" toast but then returns without throwing (`hooks/useStaking.ts:105-123`). Its catch path also logs/toasts and does not rethrow (`hooks/useStaking.ts:132-143`).
   - The map panel then refetches DB-backed statuses and characters regardless (`hooks/map/useMapStakingPanel.ts:267-270`, `hooks/map/useMapStakingPanel.ts:282-285`). If DB sync failed because of the chain/DB location mapping bug, those refetches still read stale DB state.
   - `source=chain` status mode also suppresses per-token sync errors: it calls `syncStakingState()`, stores only `chainLocationId`, and derives `isStaked` from that field without surfacing `success`/`error` (`app/api/characters/staking-status/route.ts:73-97`).
   - **Conclusion:** the chain transaction itself is not falsely marked failed by `txStatus`; it can show success. But the user can receive a sync-failed toast and then see stale DB-backed UI, which reasonably looks like staking/unstaking "did not work."

5. **P2 - Unstake lacks the chain/network gate that stake has - CONFIRMED**
   - Map panel computes mainnet gate (`STAKING_CHAIN_ID = 1`, `isCorrectChain`, `chainError`) (`hooks/map/useMapStakingPanel.ts:78`, `hooks/map/useMapStakingPanel.ts:123-128`).
   - Stake button uses `canStakeNow`, which requires `isCorrectChain` (`hooks/map/useMapStakingPanel.ts:293-300`; `components/map/staking-sidebar/CharacterStakeList.tsx:104-111`).
   - Unstake buttons are disabled only for row busy / unstaking / status loading, not wrong chain (`components/map/staking-sidebar/CharacterStakeList.tsx:94-100`, `components/map/staking-sidebar/StakedHereList.tsx:88-96`).
   - `handleUnstake()` calls `unstakeWagdie()` without a chain check (`hooks/map/useMapStakingPanel.ts:278-290`), and `useStaking.unstakeWagdie()` lacks stake's `isStakingEnabled()`/network-style preflight (`hooks/useStaking.ts:455-484` vs stake checks at `hooks/useStaking.ts:380-434`).
   - **Conclusion:** unstake can be attempted on the wrong chain. Unsupported chains will fail during contract address/service initialization; Sepolia has a `wagdieWorld` address configured, so the behavior may be especially confusing when the UI says mainnet is required for staking.

#### Alternate causes ruled out or downgraded

- **Wrong ABI/function names/parameter order - downgraded.** ABI defines `stakeWagdies`, `unstakeWagdies`, and `changeWagdieLocations` with expected tuple fields/order (`lib/contracts/abis/wagdie-world.ts:8-36`, `lib/contracts/abis/wagdie-world.ts:38-56`). Types match that order (`types/contracts.ts:24-38`). Service calls the same functions with tuple arrays (`lib/services/blockchain/staking.ts:236-254`, `lib/services/blockchain/staking.ts:266-284`).
- **Wrong contract addresses/env selection - downgraded.** Mainnet and Sepolia addresses are present (`lib/contracts/addresses.ts:26-37`), env overrides are validated (`lib/contracts/addresses.ts:47-79`), and service initialization selects by current chain (`lib/services/blockchain/staking.ts:18-25`). Unsupported chains throw explicitly (`lib/contracts/addresses.ts:83-95`).
- **Approval flow - downgraded.** Stake requires approval before submitting (`hooks/useStaking.ts:415-434`), approval check tries operator approval first and token approval fallback when token ID is provided (`hooks/useStaking.ts:292-315`), and service uses ERC721 `getApproved`/`isApprovedForAll` plus `approve`/`setApprovalForAll` (`lib/services/blockchain/staking.ts:151-222`). Minor UX issue: approval banner uses operator-only approval checks, but the approve action sets operator approval, so this is not the main failure.
- **UI disable logic - partial contributing issue, not primary.** Stake is correctly disabled on wrong chain through `canStakeNow` (`hooks/map/useMapStakingPanel.ts:293-300`), but unstake is not chain-gated as noted above. Status fetch failures from DB-ID `BigInt` parsing can also make UI show incorrect stake/unstake buttons.
- **API validation - downgraded.** `staking-status` validates source and token IDs (`app/api/characters/staking-status/route.ts:31-70`); `/api/sync/staking` validates JSON and token ID arrays (`app/api/sync/staking/route.ts:18-39`). These paths are not the primary blocker.
- **Ownership/staker filtering - downgraded.** Owned-character queries include both `owner_address` and `staker_address` for owned tab (`lib/repositories/character/character-query-repository.ts:65-72`), and the client defensively filters both fields (`hooks/useOwnedCharacters.ts:138-146`). Staked-here UI also compares `staker_address ?? owner_address` to the connected wallet before showing Unstake (`components/map/staking-sidebar/StakedHereList.tsx:42-46`, `components/map/staking-sidebar/StakedHereList.tsx:87-96`).

#### Recommended fixes

1. **Fix map contract ID derivation.** In `lib/utils/mapOrchestration.ts`, change `getStakingLocationSelection()` to parse/require `location.chain_location_id`, not `location.id`. Use `requireChainLocationId(location.id, location.chain_location_id)` or equivalent. Add a unit test with `id: 'concord_searing', chain_location_id: '7'` proving `selectedLocation.locationId === 7n`.
2. **Fix chain-to-DB location mapping.** In `lib/services/sync/staking-state-sync.ts`, change `fetchLocationIdMap()` to map on-chain IDs to DB IDs using `locations.chain_location_id` if a column exists, or `metadata->>chain_location_id` if metadata is canonical. Return `Map<chainLocationIdString, dbLocationId>`, then write DB `location_id` with the DB ID. If no durable column exists, add a migration/index for `locations.chain_location_id` or a metadata expression index.
3. **Separate DB and chain IDs in status APIs/types.** `app/api/characters/staking-status/route.ts` should not return DB `location_id` under a name the client treats as contract `locationId`. Options: return `{ dbLocationId, chainLocationId }`, or make `useStakingStatuses()` keep DB IDs as strings and only `BigInt` parse chain-sourced IDs. Add tests with slug DB IDs.
4. **Surface sync failures without making chain success ambiguous.** Have `syncStakingStateToDb()` return a success/error result to `stakeWagdie`/`unstakeWagdie` callers. Update UI copy to distinguish "transaction confirmed, DB sync failed" from contract failure, and consider refetching `source=chain` after sync failure while exposing per-token errors from `source=chain`.
5. **Gate unstake and approval on the intended chain.** Add `isCorrectChain` gating to unstake buttons and to `handleUnstake()`/`handleApprove()` or add hook-level chain checks in `useStaking` so direct callers cannot submit on unintended networks.
6. **Backfill tests.** Add tests for: slug DB `locations.id` + numeric `chain_location_id`; `/api/sync/staking` maps chain ID to DB slug; `/api/characters/staking-status` with DB slug does not throw in `useStakingStatuses`; unstake disabled on wrong chain.

## Investigation Log

### Phase 2 - Context Builder Initial Assessment
**Hypothesis:** Staking/unstaking failures may stem from mixing DB location identifiers with on-chain location identifiers.
**Findings:** Context Builder identified high-risk paths where `location.id`, `location_id`, and `chain_location_id` appear to be conflated in UI staking selection, sync mapping, and staking-status parsing.
**Evidence:** Initial assessment points to `lib/utils/mapOrchestration.ts`, `lib/services/sync/staking-state-sync.ts`, `app/api/characters/staking-status/route.ts`, `hooks/useStakingStatuses.ts`, and `hooks/map/useMapStakingPanel.ts` for verification.
**Conclusion:** Needs pair investigator verification with exact file:line evidence and alternate hypotheses ruled out.

### Phase 1 - Initial Assessment
**Hypothesis:** The failure may be in the staking UI, hook, API route, contract configuration, backend sync/status state, or mismatch among these layers.
**Findings:** Report created and investigation scoped to in-repo staking/unstaking paths.
**Evidence:** Repo contains obvious staking-related areas: `hooks/useStaking.ts`, `components/map/staking-sidebar/`, `app/api/characters/[tokenId]/staking`, `app/api/sync/staking`, `lib/contracts`, and `specs/020-map-staking-fixes`.
**Conclusion:** Proceed to Context Builder to seed relevant file selection before pair investigation.

## Root Cause
The root cause is a cross-layer identifier mismatch between DB location IDs and on-chain location IDs.

1. **Map staking derives contract `locationId` from the DB ID.** `lib/utils/mapOrchestration.ts:58-91` preserves `chain_location_id` in `toLocation()`, but `getStakingLocationSelection()` calls `parseChainLocationId(location.id)`. `lib/utils/chainIds.ts:1-38` explicitly documents that the contract uses numeric `uint64` IDs while DB locations use slugs/UUIDs, and rejects non-numeric strings. The DB schema confirms `locations.id` is slug text such as `concord_searing` / `forsaken_lands` (`docs/database-schema.md:312-346`, `supabase/migrations/20251103000000_add_map_tables.sql:80-87`). Result: staking can be blocked as "not registered on-chain" or submit the wrong numeric location if a DB ID happens to parse.
2. **Chain-to-DB sync maps chain IDs against `locations.id`.** `lib/services/sync/staking-state-sync.ts:182-204` receives on-chain location IDs, queries `.from('locations').select('id').in('id', unique)`, and maps `row.id -> row.id`. Later, `lib/services/sync/staking-state-sync.ts:378-438` marks staked tokens failed with `No location mapping for chain_location_id` when the numeric chain ID does not match the DB slug. Result: a transaction can succeed on-chain while DB `location_id` / `staker_address` remains stale.
3. **DB staking status returns DB `location_id` as `locationId`, but the client treats it as a chain ID.** `app/api/characters/staking-status/route.ts:100-128` returns DB `location_id` under `locationId`; `hooks/useStakingStatuses.ts:29-40,73` defaults to DB source and runs `BigInt(status.locationId)`. Slug values throw and clear the status map, causing stale/wrong stake and unstake affordances.
4. **Post-transaction sync failure is visible only as a toast/log, not as caller state.** `hooks/useStaking.ts:105-143,224-236` logs/toasts sync failure without throwing; `hooks/map/useMapStakingPanel.ts:262-285` then refetches DB-backed state. Result: users may see a confirmed transaction followed by unchanged UI.
5. **Unstake lacks the same chain gate as stake.** `hooks/map/useMapStakingPanel.ts:293-300` gates stake with `isCorrectChain`; `components/map/staking-sidebar/CharacterStakeList.tsx:94-100`, `components/map/staking-sidebar/StakedHereList.tsx:88-96`, and `hooks/map/useMapStakingPanel.ts:278-290` allow unstake attempts without that gate.

Alternate hypotheses were downgraded: ABI/function names and tuple order match the service calls; mainnet/Sepolia addresses are configured; approval logic exists before staking; API validation is not the semantic blocker; ownership/staker filtering includes both owner and staker paths.

## Recommendations
1. In `lib/utils/mapOrchestration.ts`, parse `location.chain_location_id` for staking contract calls, using `location.id` only as an explicit legacy fallback if desired.
2. In `lib/services/sync/staking-state-sync.ts`, map `chainLocationId -> locations.id` using a durable `locations.chain_location_id` field or `metadata->>chain_location_id`, then continue writing DB `wagdie_characters.location_id` as the DB slug/id.
3. In `app/api/characters/staking-status/route.ts` and `hooks/useStakingStatuses.ts`, separate DB and chain identifiers (`dbLocationId` vs `chainLocationId`) or only `BigInt` parse chain-sourced IDs.
4. Make `syncStakingStateToDb()` return a success/error result to callers; distinguish "transaction confirmed, DB sync failed" from actual contract failure, and consider chain-source status refresh after tx success/sync failure.
5. Add `canUnstakeNow` / wrong-chain guards to unstake UI and handler paths.
6. Add tests covering slug DB location IDs with numeric chain IDs, sync mapping from chain ID to DB slug, DB status parsing with slug IDs, and unstake disabled on wrong chain.

## Preventive Measures
- Maintain explicit naming for location identifiers: `dbLocationId` for DB joins and `chainLocationId` for contract calls.
- Add type-level/API contracts that do not reuse `locationId` for both DB and chain IDs.
- Include fixture data with realistic slug IDs plus numeric chain IDs in tests; avoid numeric-only mocks for DB IDs.
- Surface post-transaction sync failures as a first-class state so UI cannot silently present stale DB data as final truth.
