# Tasks: Page Wireframes Implementation

**Input**: Design documents from `/specs/003-page-wireframes/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are included based on constitution Principle V (Test-Driven for Critical Paths)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Next.js 15 App Router structure:
- **Pages**: `app/` directory
- **Components**: `components/` directory (organized by feature)
- **Services**: `lib/services/` directory
- **Types**: `types/` directory
- **Hooks**: `hooks/` directory
- **Tests**: Root `__tests__/` or co-located `*.test.tsx` files

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create TypeScript type definitions directory at `types/`
- [ ] T002 [P] Create shared types in `types/character.ts` (Character, CharacterConcord, CharacterFilters interfaces)
- [ ] T003 [P] Create shared types in `types/tweet.ts` (Tweet, TweetFilters interfaces)
- [ ] T004 [P] Create shared types in `types/chat.ts` (ChatMessage, UserPresence, Location interfaces)
- [ ] T005 [P] Create shared types in `types/wallet.ts` (UserSession, TransactionReceipt interfaces)
- [ ] T006 Create services directory at `lib/services/`
- [ ] T007 Create shared components directory at `components/shared/`
- [ ] T008 [P] Install additional dependencies: react-intersection-observer, react-hot-toast (if not present)
- [ ] T009 [P] Configure Firebase credentials in `.env.local` for real-time chat (FIREBASE_*)
- [ ] T010 Create components README at `components/README.md` explaining organization

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database Schema

- [ ] T011 Create Supabase migration for `locations` table in `supabase/migrations/` (location_id, name, description, is_active)
- [ ] T012 Create Supabase migration for `concords` table in `supabase/migrations/` (concord_id, name, description, image_url, is_consumable, effect_type)
- [ ] T013 Create Supabase migration for `character_concords` join table in `supabase/migrations/` (id, token_id, concord_id, quantity, is_seared, seared_at)
- [ ] T014 Update characters table migration to add missing columns: background_story (text), equipment (jsonb), location_id (string FK)
- [ ] T015 Create indexes on characters table: (owner_address), (infection_status), (staking_status), (location_id)
- [ ] T016 Seed initial locations data: the-ruins, crossroads, dark-forest, haven
- [ ] T017 Seed concord #15 (Strange Mushroom) data
- [ ] T018 Regenerate TypeScript types from Supabase schema: `npx supabase gen types typescript > lib/database.types.ts`

### Base Services & Utilities

- [ ] T019 [P] Create character service in `lib/services/character-service.ts` with skeleton functions (getCharacters, getCharacter, updateCharacter, getCharacterConcords)
- [ ] T020 [P] Create chat service in `lib/services/chat-service.ts` with Firebase integration (sendMessage, subscribeToLocation, updatePresence, subscribeToUsers)
- [ ] T021 [P] Create tweet service in `lib/services/tweet-service.ts` with skeleton functions (getTweets with pagination)
- [ ] T022 [P] Create wallet service in `lib/services/wallet-service.ts` with wagmi integration (burnCorpses, spreadInfections, infectWagdie, cureCharacter, searConcord)

### Shared Components

- [ ] T023 [P] Create BannerHeader component in `components/shared/BannerHeader.tsx` (title, subtitle props)
- [ ] T024 [P] Create DialogMask component in `components/shared/DialogMask.tsx` (modal overlay with isOpen, onClose, children)
- [ ] T025 [P] Create InfiniteScroll wrapper in `components/shared/InfiniteScroll.tsx` (hasMore, isLoading, onLoadMore, children)

### Custom Hooks

- [ ] T026 [P] Create useCurrentUser hook in `hooks/useCurrentUser.ts` (fetches session from /api/auth/me)
- [ ] T027 [P] Create useCharacterLocation hook in `hooks/useCharacterLocation.ts` (fetches location for token ID)
- [ ] T028 [P] Create useInfiniteScroll hook in `hooks/useInfiniteScroll.ts` (generic infinite scroll with Intersection Observer)
- [ ] T029 [P] Create useWebSocket hook in `hooks/useWebSocket.ts` (Firebase real-time subscription)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 8 - Navigate Site via Menu System (Priority: P1) 🎯 MVP Foundation

**Goal**: Provide consistent site-wide navigation that works on all pages before implementing individual pages

**Why First**: All other pages depend on having navigation in place. This is a foundational UI component.

**Independent Test**: Navigate to any page and verify menu bar displays with About/Characters/Gather/MORE buttons, clicking MORE opens drawer, all links navigate correctly, mobile shows text labels.

### Tests for User Story 8 (Critical Path)

- [ ] T030 [P] [US8] E2E test for navigation menu in `__tests__/e2e/navigation.spec.ts` (verify menu displays, links work, drawer opens/closes)

### Implementation for User Story 8

- [ ] T031 [US8] Update Header component in `components/layout/Header.tsx` to include dark mode toggle and scroll-to-top on click
- [ ] T032 [US8] Create Navigation (MenuDrawer) component in `components/layout/Navigation.tsx` with isOpen/onClose props, all internal/external links, dark mode toggle
- [ ] T033 [US8] Integrate Navigation into root layout `app/layout.tsx` (add state for drawer open/close)
- [ ] T034 [US8] Add responsive styling to Header: hide icons on mobile, show text labels
- [ ] T035 [US8] Add tooltips to all menu bar icons using Tailwind
- [ ] T036 [US8] Implement body scroll disable when menu drawer is open

**Checkpoint**: Navigation system complete and testable. All subsequent pages will have working navigation.

---

## Phase 4: User Story 7 - Authenticate with Ethereum Wallet (Priority: P1) 🎯 MVP Foundation

**Goal**: Enable wallet connection with SIWE so authenticated features (chat, editing) can work

**Why Second**: Authentication is required for chat (US4) and character editing (US3). Must be in place before those stories.

**Independent Test**: Click Connect Wallet, select provider, sign SIWE message, verify session created and address displayed in menu bar, refresh page and confirm session persists.

### Tests for User Story 7 (Critical Path)

- [ ] T037 [P] [US7] Integration test for SIWE flow in `__tests__/integration/auth.test.ts` (nonce generation, signature verification, session creation)

### Implementation for User Story 7

- [ ] T038 [P] [US7] Create API route `app/api/auth/nonce/route.ts` (generate SIWE nonce, return JSON)
- [ ] T039 [P] [US7] Create API route `app/api/auth/verify/route.ts` (verify SIWE signature, create iron-session, return address)
- [ ] T040 [P] [US7] Create API route `app/api/auth/me/route.ts` (return current session data or 401)
- [ ] T041 [P] [US7] Create API route `app/api/auth/logout/route.ts` (destroy session, return success)
- [ ] T042 [US7] Update WalletButton component in `components/wallet/WalletButton.tsx` to trigger SIWE flow after RainbowKit connection
- [ ] T043 [US7] Update useCurrentUser hook to poll /api/auth/me for session status
- [ ] T044 [US7] Add toast notifications for auth success/failure using react-hot-toast
- [ ] T045 [US7] Implement session persistence across page refreshes (validate on mount)

**Checkpoint**: Wallet authentication complete. Users can connect and maintain sessions.

---

## Phase 5: User Story 1 - View Home Page Landing Experience (Priority: P1) 🎯 MVP Core

**Goal**: Create compelling home page that introduces WAGDIE and guides users to key features

**Independent Test**: Navigate to `/` and verify logo, video player with preview, three content sections (An Evolving Story, Rich Interactive Elements, Co-Created By You), and CTA cards (Join Discord, Get In Character) all display correctly on desktop and mobile.

### Implementation for User Story 1

- [ ] T046 [P] [US1] Create VideoPlayer component in `components/home/VideoPlayer.tsx` (native HTML5 video with poster, videoSrc, posterSrc, autoplay props)
- [ ] T047 [P] [US1] Create HomeCard component in `components/home/HomeCard.tsx` (title, description, imageSrc, href, isExternal props)
- [ ] T048 [P] [US1] Create HomeCardRow component in `components/home/HomeCardRow.tsx` (title, children, className props)
- [ ] T049 [US1] Implement home page in `app/page.tsx` (WAGDIE logo, video section, three card rows, CTA section)
- [ ] T050 [US1] Add responsive Tailwind classes for mobile/tablet/desktop breakpoints
- [ ] T051 [US1] Add static assets: video file (`public/videos/intro.mp4`), preview image (`public/images/video-preview.png`), section images
- [ ] T052 [US1] Update metadata in `app/layout.tsx` for SEO (OpenGraph tags)

**Checkpoint**: Home page complete. Users can discover WAGDIE and navigate to other pages.

---

## Phase 6: User Story 2 - Browse and Filter Character Collection (Priority: P1) 🎯 MVP Core

**Goal**: Enable users to browse all characters with filters (all/owned/infected/cured/staked) and infinite scroll

**Independent Test**: Navigate to `/characters` and verify character grid displays, filters work (all, owned, infected, cured, staked), sort toggle works (asc/desc), infinite scroll loads more characters, clicking a card navigates to `/characters/[tokenId]`.

### Tests for User Story 2 (Critical Path)

- [ ] T053 [P] [US2] Integration test for character fetching in `__tests__/integration/characters.test.ts` (test filters, pagination, sort)

### Implementation for User Story 2

- [ ] T054 [P] [US2] Implement character service getCharacters function in `lib/services/character-service.ts` (Supabase query with filters, pagination, sort)
- [ ] T055 [P] [US2] Create API route `app/api/characters/route.ts` (GET handler with query params: tab, wallet, sort, page, perPage)
- [ ] T056 [P] [US2] Create TokenFilterBar component in `components/characters/TokenFilterBar.tsx` (currentTab, currentSort, onTabChange, onSortChange props)
- [ ] T057 [P] [US2] Create CharacterCard component in `components/characters/CharacterCard.tsx` (character prop with token_id, image_url, infection_status, staking_status, onClick)
- [ ] T058 [P] [US2] Create TokenFeed component in `components/characters/TokenFeed.tsx` (characters array, hasMore, onLoadMore, isLoading props)
- [ ] T059 [US2] Implement characters page in `app/characters/page.tsx` (use useSearchParams for URL state, useInfiniteScroll hook, TokenFilterBar, TokenFeed)
- [ ] T060 [US2] Add URL param handling: read/write tab and sort to search params
- [ ] T061 [US2] Add status badges to CharacterCard (infected/cured/staked indicators)
- [ ] T062 [US2] Implement responsive grid layout (1 col mobile, 2 col tablet, 5 col desktop)

**Checkpoint**: Character browsing complete. Users can explore collection with filters.

---

## Phase 7: User Story 3 - View and Edit Character Details (Priority: P1) 🎯 MVP Core

**Goal**: Show detailed character sheet with stats, equipment, story; allow owners to edit and perform actions

**Independent Test**: Navigate to `/characters/123` and verify character image, stats (STR/DEX/CON/INT/WIS/CHA), HP/AC/Speed, background story, equipment display. For owner: verify Edit button appears, story becomes editable, Save persists changes, Roll New Character generates new stats, Cure/Sear actions work (if infected/has concords).

### Tests for User Story 3 (Critical Path)

- [ ] T063 [P] [US3] Integration test for character detail in `__tests__/integration/character-detail.test.ts` (fetch character, update story, verify ownership check)
- [ ] T064 [P] [US3] E2E test for blockchain actions in `__tests__/e2e/character-actions.spec.ts` (cure character transaction, sear concord transaction - use Sepolia testnet)

### Implementation for User Story 3

- [ ] T065 [P] [US3] Implement character service getCharacter function in `lib/services/character-service.ts` (fetch single character by token_id)
- [ ] T066 [P] [US3] Implement character service updateCharacter function in `lib/services/character-service.ts` (PATCH background_story, equipment)
- [ ] T067 [P] [US3] Implement character service getCharacterConcords function in `lib/services/character-service.ts` (fetch concords for token_id)
- [ ] T068 [P] [US3] Implement wallet service cureCharacter function in `lib/services/wallet-service.ts` (wagmi useContractWrite for cure transaction)
- [ ] T069 [P] [US3] Implement wallet service searConcord function in `lib/services/wallet-service.ts` (wagmi useContractWrite for sear transaction)
- [ ] T070 [P] [US3] Create API route `app/api/characters/[tokenId]/route.ts` (GET single character, PATCH update with ownership validation)
- [ ] T071 [P] [US3] Create API route `app/api/characters/[tokenId]/concords/route.ts` (GET character concords)
- [ ] T072 [P] [US3] Create SheetMenuBar component in `components/characters/SheetMenuBar.tsx` (tokenId, isOwner, isEditMode, onEditToggle, onSave, onRollNew, onBack props)
- [ ] T073 [P] [US3] Create SheetTitleAndAttributes component in `components/characters/SheetTitleAndAttributes.tsx` (character prop, isEditMode prop, display stats with progress bars)
- [ ] T074 [P] [US3] Create SheetBackgroundStory component in `components/characters/SheetBackgroundStory.tsx` (story prop, isEditMode, isOwner, onChange callback)
- [ ] T075 [P] [US3] Create SheetEquipment component in `components/characters/SheetEquipment.tsx` (equipment prop, isEditMode, display weapons/armor/items/gold)
- [ ] T076 [US3] Implement character detail page in `app/characters/[tokenId]/page.tsx` (Server Component, fetch character data, pass to client components)
- [ ] T077 [US3] Add edit mode state management (useState for isEditMode, background_story changes)
- [ ] T078 [US3] Add ownership check: compare session address to character owner_address
- [ ] T079 [US3] Implement "Roll New Character" action (client-side stat regeneration with randomization logic)
- [ ] T080 [US3] Implement "Save" action (call PATCH /api/characters/[tokenId], show toast on success/error)
- [ ] T081 [US3] Implement "Cure Character" action (call wallet service, wait for transaction, show toast)
- [ ] T082 [US3] Implement "Sear Concord" action (show concord selection modal, call wallet service, show toast)
- [ ] T083 [US3] Create animated view placeholder page in `app/characters/[tokenId]/animated/page.tsx` (link from SheetMenuBar)

**Checkpoint**: Character detail page complete with editing and blockchain actions.

---

## Phase 8: User Story 4 - Participate in Location-Based Chat (Priority: P2)

**Goal**: Enable real-time chat between players in the same in-game location

**Independent Test**: Connect wallet, select character, navigate to `/gather`, verify chat interface displays, send message and see it appear in feed with avatar/timestamp, verify other users in same location see message in real-time, verify user list shows online characters with level/class.

### Tests for User Story 4 (Critical Path)

- [ ] T084 [P] [US4] Integration test for chat messaging in `__tests__/integration/chat.test.ts` (send message to Firebase, verify real-time subscription)

### Implementation for User Story 4

- [ ] T085 [P] [US4] Implement chat service sendMessage function in `lib/services/chat-service.ts` (Firebase push to `chat/locations/{locationId}/messages`)
- [ ] T086 [P] [US4] Implement chat service subscribeToLocation function in `lib/services/chat-service.ts` (Firebase onValue listener, return unsubscribe function)
- [ ] T087 [P] [US4] Implement chat service updatePresence function in `lib/services/chat-service.ts` (Firebase set `chat/users/{tokenId}/presence`)
- [ ] T088 [P] [US4] Implement chat service subscribeToUsers function in `lib/services/chat-service.ts` (Firebase onValue for presence)
- [ ] T089 [P] [US4] Create API route `app/api/locations/route.ts` (GET all locations)
- [ ] T090 [P] [US4] Create API route `app/api/locations/[locationId]/users/route.ts` (GET online users in location - optional REST fallback)
- [ ] T091 [P] [US4] Create ChannelSelector component in `components/chat/ChannelSelector.tsx` (currentLocation, selectedCharacter, onShowUsers props)
- [ ] T092 [P] [US4] Create ChatMessages component in `components/chat/ChatMessages.tsx` (messages array, isLoading, display with avatars and timestamps)
- [ ] T093 [P] [US4] Create ChatFooter component in `components/chat/ChatFooter.tsx` (onSendMessage callback, disabled prop if no character)
- [ ] T094 [P] [US4] Create ChatUsers component in `components/chat/ChatUsers.tsx` (users array, isOpen, onClose, mobile modal)
- [ ] T095 [US4] Implement gather page in `app/gather/page.tsx` (use useWebSocket for messages, useCurrentUser for session, get character location)
- [ ] T096 [US4] Add character selection requirement (show message if no character selected)
- [ ] T097 [US4] Implement real-time message subscription on mount (Firebase listener)
- [ ] T098 [US4] Implement presence tracking on mount/unmount (update online status)
- [ ] T099 [US4] Add auto-scroll to latest message when new messages arrive
- [ ] T100 [US4] Add mobile responsive layout (collapsible user panel with DialogMask)
- [ ] T101 [US4] Add message timestamp formatting (human-readable)
- [ ] T102 [US4] Add Firebase onDisconnect handler to auto-update presence to offline

**Checkpoint**: Chat functionality complete. Users can communicate in real-time by location.

---

## Phase 9: User Story 5 - Follow Official Story via Tweet Feed (Priority: P2)

**Goal**: Display paginated feed of official WAGDIE tweets with filters and infinite scroll

**Independent Test**: Navigate to `/lore` and verify tweet feed displays with text/images/videos, filters work (all/text/video), sort toggle works (asc/desc), infinite scroll loads more tweets, videos play inline, translation toggle works.

### Implementation for User Story 5

- [ ] T103 [P] [US5] Implement tweet service getTweets function in `lib/services/tweet-service.ts` (Supabase query with filters, pagination cursor, exclude replies/retweets)
- [ ] T104 [P] [US5] Create API route `app/api/tweets/route.ts` (GET with query params: sort, mediaType, perPage, startAt)
- [ ] T105 [P] [US5] Create TweetFilterBar component in `components/lore/TweetFilterBar.tsx` (currentTab, currentSort, translationEnabled, callbacks)
- [ ] T106 [P] [US5] Create CustomTweet component in `components/lore/CustomTweet.tsx` (tweet prop, translationEnabled, display text/images/video with engagement counts)
- [ ] T107 [US5] Implement lore page in `app/lore/page.tsx` (use useInfiniteScroll, TweetFilterBar, CustomTweet cards)
- [ ] T108 [US5] Add URL param handling for filters (tab, sort)
- [ ] T109 [US5] Implement video player in CustomTweet (native HTML5 video with controls)
- [ ] T110 [US5] Add translation toggle state and placeholder translation logic
- [ ] T111 [US5] Add React Query with 20-second auto-refresh (refetchInterval: 20000)
- [ ] T112 [US5] Add responsive grid layout for tweet cards

**Checkpoint**: Lore feed complete. Users can follow official narrative with rich media.

---

## Phase 10: User Story 6 - Spread Infection via Game Mechanics (Priority: P3)

**Goal**: Allow users to burn corpses for mushrooms, then spread infections or target specific characters

**Independent Test**: Connect wallet with corpse tokens, navigate to `/spread`, verify corpse balance displays, click Touch Corpse and approve transaction, verify mushrooms received, test Release Spores (random spread) and Infect Pilgrim (targeted infection with 0.0025 ETH), verify transactions complete and page updates.

### Tests for User Story 6 (Blockchain - Critical Path)

- [ ] T113 [P] [US6] E2E test for spread mechanics in `__tests__/e2e/spread.spec.ts` (burn corpse transaction, spread infection transaction - use Sepolia testnet)

### Implementation for User Story 6

- [ ] T114 [P] [US6] Implement wallet service burnCorpses function in `lib/services/wallet-service.ts` (ERC1155 approval, burn transaction)
- [ ] T115 [P] [US6] Implement wallet service spreadInfections function in `lib/services/wallet-service.ts` (spread contract call)
- [ ] T116 [P] [US6] Implement wallet service infectWagdie function in `lib/services/wallet-service.ts` (infect contract call with ETH value)
- [ ] T117 [P] [US6] Implement wallet service getCorpseBalance function in `lib/services/wallet-service.ts` (ERC1155 balanceOf read)
- [ ] T118 [P] [US6] Implement wallet service getMushroomBalance function in `lib/services/wallet-service.ts` (Concord #15 balance read)
- [ ] T119 [P] [US6] Implement wallet service getInfectionPrice function in `lib/services/wallet-service.ts` (spread contract read)
- [ ] T120 [P] [US6] Create DialogBurnCorpseApproval component in `components/spread/DialogBurnCorpseApproval.tsx` (isOpen, onClose, onConfirm, availableCorpses props)
- [ ] T121 [P] [US6] Create DialogSpreadingApproval component in `components/spread/DialogSpreadingApproval.tsx` (isOpen, onClose, onApprove, contractAddress props)
- [ ] T122 [P] [US6] Create SpreadInfect component in `components/spread/SpreadInfect.tsx` (mushroomBalance, corpseBalance, mode, onSpread, onInfect, infectionPrice props)
- [ ] T123 [US6] Implement spread page in `app/spread/page.tsx` (use wagmi hooks for contract reads/writes, show burn/spread interfaces)
- [ ] T124 [US6] Add ERC1155 approval flow for corpse contract (check isApprovedForAll, show approval modal if needed)
- [ ] T125 [US6] Add animated video playback during burn transaction processing
- [ ] T126 [US6] Add success imagery after successful corpse burn
- [ ] T127 [US6] Add validation for target token ID (1-6666 range)
- [ ] T128 [US6] Add transaction status toasts (pending, success, error with transaction link)
- [ ] T129 [US6] Add page reload on successful transaction completion

**Checkpoint**: Spread infection mechanics complete. Users can participate in game mechanics.

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T130 [P] Add loading skeletons for all pages (character cards, tweet cards, chat messages)
- [ ] T131 [P] Add error boundaries for each major page in `app/error.tsx` (with reset button)
- [ ] T132 [P] Add 404 page in `app/not-found.tsx` (styled with navigation back home)
- [ ] T133 [P] Optimize images: add Next.js Image component to all image displays (CharacterCard, CustomTweet, HomeCard)
- [ ] T134 [P] Add metadata to all pages (title, description, OpenGraph tags)
- [ ] T135 [P] Create ADR document in `specs/003-page-wireframes/adr-firebase-supabase-hybrid.md` explaining dual database choice
- [ ] T136 [P] Add inline comments to all complex components explaining purpose and data flow
- [ ] T137 [P] Performance audit: check bundle size, add dynamic imports for heavy components (VideoPlayer, CustomTweet with video)
- [ ] T138 [P] Accessibility audit: verify all interactive elements have proper ARIA labels, keyboard navigation works
- [ ] T139 [P] Mobile testing: verify all pages work on iOS Safari and Android Chrome
- [ ] T140 [P] Add rate limiting to API routes (5 requests/minute for chat, 10 requests/minute for transactions)
- [ ] T141 Run validation against quickstart.md scenarios: verify all examples work
- [ ] T142 Update CLAUDE.md with completion notes for this feature

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 8 - Navigation (Phase 3)**: Depends on Foundational - BLOCKS all page implementations (provides UI framework)
- **User Story 7 - Auth (Phase 4)**: Depends on Foundational and US8 - BLOCKS US3 (editing), US4 (chat), US6 (spread)
- **User Story 1 - Home (Phase 5)**: Depends on Foundational and US8 - Independent (MVP Core)
- **User Story 2 - Characters Browse (Phase 6)**: Depends on Foundational and US8 - Independent (MVP Core)
- **User Story 3 - Character Detail (Phase 7)**: Depends on Foundational, US8, US7, US2 - Requires auth and browse
- **User Story 4 - Chat (Phase 8)**: Depends on Foundational, US8, US7, US2 - Requires auth and character selection
- **User Story 5 - Lore (Phase 9)**: Depends on Foundational and US8 - Independent
- **User Story 6 - Spread (Phase 10)**: Depends on Foundational, US8, US7 - Requires auth
- **Polish (Phase 11)**: Depends on desired user stories being complete

### User Story Dependencies

**MVP Foundation** (must complete first):
1. **User Story 8 (Navigation)**: No dependencies on other stories - provides UI framework
2. **User Story 7 (Auth)**: Depends on US8 - blocks authenticated features

**MVP Core** (can start after foundation):
3. **User Story 1 (Home)**: Depends on US8 only - independent
4. **User Story 2 (Characters Browse)**: Depends on US8 only - independent
5. **User Story 3 (Character Detail)**: Depends on US8, US7, US2 - needs auth + browse

**Enhanced Features** (can be added incrementally):
6. **User Story 4 (Chat)**: Depends on US8, US7, US2 - needs auth + character selection
7. **User Story 5 (Lore)**: Depends on US8 only - independent
8. **User Story 6 (Spread)**: Depends on US8, US7 - needs auth for transactions

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Components marked [P] can be built in parallel
- Services marked [P] can be built in parallel
- API routes marked [P] can be built in parallel
- Page implementation requires components/services to be complete
- Story complete before moving to next priority

### Parallel Opportunities

- **Setup (Phase 1)**: All tasks marked [P] can run in parallel (T002-T005, T008-T009)
- **Foundational (Phase 2)**:
  - Database migrations (T011-T017) can run in parallel
  - Services (T019-T022) can run in parallel after schema
  - Shared components (T023-T025) can run in parallel
  - Hooks (T026-T029) can run in parallel
- **Within Each User Story**: All tasks marked [P] can run in parallel
- **Cross-Story Parallelism**: After Foundational + US8 + US7 complete:
  - US1, US2, US5 can be developed in parallel (independent)
  - US3 can start after US2 completes
  - US4, US6 can start in parallel after US7 completes

---

## Parallel Example: User Story 2 (Characters Browse)

```bash
# Launch all parallel components for User Story 2 together:
Task: "Implement character service getCharacters function in lib/services/character-service.ts"
Task: "Create API route app/api/characters/route.ts"
Task: "Create TokenFilterBar component in components/characters/TokenFilterBar.tsx"
Task: "Create CharacterCard component in components/characters/CharacterCard.tsx"
Task: "Create TokenFeed component in components/characters/TokenFeed.tsx"

# Then sequentially:
Task: "Implement characters page in app/characters/page.tsx"  # Uses all above
Task: "Add URL param handling"  # Enhances page
Task: "Add status badges to CharacterCard"  # Enhances component
Task: "Implement responsive grid layout"  # Final polish
```

---

## Implementation Strategy

### MVP First (Foundation + Core Pages)

**Goal**: Ship working product with essential features

1. **Complete Phase 1**: Setup (T001-T010)
2. **Complete Phase 2**: Foundational (T011-T029) - CRITICAL - blocks everything
3. **Complete Phase 3**: User Story 8 - Navigation (T030-T036)
4. **Complete Phase 4**: User Story 7 - Auth (T037-T045)
5. **Complete Phase 5**: User Story 1 - Home (T046-T052)
6. **Complete Phase 6**: User Story 2 - Characters Browse (T053-T062)
7. **STOP and VALIDATE**: Test all stories independently
8. **Deploy MVP**: Home + Characters browse + Navigation + Auth

**MVP Delivers**:
- ✅ Compelling home page introducing WAGDIE
- ✅ Character browsing with filters
- ✅ Wallet authentication
- ✅ Site-wide navigation
- ✅ Fully functional without breaking existing features

### Incremental Delivery (Add Features One by One)

After MVP validation:

1. **Add User Story 3**: Character Detail (T063-T083) → Test independently → Deploy
2. **Add User Story 5**: Lore Feed (T103-T112) → Test independently → Deploy
3. **Add User Story 4**: Chat (T084-T102) → Test independently → Deploy
4. **Add User Story 6**: Spread (T113-T129) → Test independently → Deploy
5. **Polish (Phase 11)**: Cross-cutting improvements (T130-T142) → Deploy final

Each increment adds value without breaking previous stories.

### Parallel Team Strategy

With multiple developers:

**Phase 1**: Team completes Setup together (1-2 hours)
**Phase 2**: Team completes Foundational together (1-2 days)
**Phase 3**: Team completes Navigation together (0.5 day)
**Phase 4**: Team completes Auth together (0.5 day)

**Then split (after T045)**:
- **Developer A**: User Story 1 (Home) - Independent
- **Developer B**: User Story 2 (Characters Browse) - Independent
- **Developer C**: User Story 5 (Lore) - Independent

**After US2 completes**:
- **Developer A**: User Story 3 (Character Detail) - Depends on US2

**After US7 completes**:
- **Developer B**: User Story 4 (Chat) - Depends on US7
- **Developer C**: User Story 6 (Spread) - Depends on US7

---

## Notes

- **[P] tasks**: Different files, no dependencies, safe to parallelize
- **[Story] label**: Maps task to specific user story for traceability
- **Each user story**: Should be independently completable and testable
- **Tests first**: Verify tests fail before implementing (if tests included)
- **Commit often**: After each task or logical group
- **Checkpoints**: Stop at any checkpoint to validate story independently
- **Avoid**: Vague tasks, same file conflicts, cross-story dependencies that break independence
- **Types first**: Complete Phase 1 types before starting Phase 2 services
- **Services before pages**: Complete service layer before page implementation
- **Components in parallel**: Build UI components concurrently when possible

---

## Summary

- **Total Tasks**: 142
- **Setup Tasks**: 10 (T001-T010)
- **Foundational Tasks**: 19 (T011-T029)
- **User Story 8 (Navigation)**: 7 tasks (T030-T036)
- **User Story 7 (Auth)**: 9 tasks (T037-T045)
- **User Story 1 (Home)**: 7 tasks (T046-T052)
- **User Story 2 (Characters Browse)**: 10 tasks (T053-T062)
- **User Story 3 (Character Detail)**: 19 tasks (T063-T083)
- **User Story 4 (Chat)**: 19 tasks (T084-T102)
- **User Story 5 (Lore)**: 10 tasks (T103-T112)
- **User Story 6 (Spread)**: 17 tasks (T113-T129)
- **Polish Tasks**: 13 (T130-T142)

**Parallel Opportunities**: 89 tasks marked [P] can run in parallel within their phase

**Independent Test Criteria**:
- ✅ US8: Navigate and verify menu works on all pages
- ✅ US7: Connect wallet and verify session persists
- ✅ US1: View home page and verify all sections display
- ✅ US2: Browse characters with filters and infinite scroll
- ✅ US3: View character detail and test editing (if owner)
- ✅ US4: Send chat message and see real-time updates
- ✅ US5: View lore feed with filters and infinite scroll
- ✅ US6: Burn corpses and spread/infect transactions

**Suggested MVP Scope**: Foundation (US8 + US7) + Core Pages (US1 + US2) = 42 tasks (T001-T045, T046-T052, T053-T062)

**Format Validation**: ✅ All 142 tasks follow checklist format: `- [ ] [ID] [P?] [Story?] Description with file path`
