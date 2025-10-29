# Implementation Plan: Page Wireframes Implementation

**Branch**: `003-page-wireframes` | **Date**: 2025-10-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-page-wireframes/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

This feature implements the complete UI wireframe structure for the WAGDIE web application, including 8 major pages: Home, Characters (browse/detail), Gather (chat), Lore (tweets), Spread (infection mechanics), Login (wallet auth), and navigation system. The implementation uses Next.js 15 App Router with React Server Components where appropriate, RainbowKit for wallet connections, and follows clean architecture principles with clear UI/Service/Data layer separation.

## Technical Context

**Language/Version**: TypeScript 5+, Node.js 18+
**Primary Dependencies**: Next.js 15 (App Router), React 18, RainbowKit 2.2+, wagmi 2.0, viem 2.0, Tailwind CSS 3.4
**Storage**: Supabase PostgreSQL (characters, chat, tweets), Firebase Realtime Database (chat real-time sync), Browser localStorage (wallet persistence)
**Testing**: Next.js testing (Jest + React Testing Library), Playwright for E2E critical paths
**Target Platform**: Web (Chrome, Safari, Firefox, mobile browsers)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: <3s initial page load, <1s navigation, <2s filter updates, 1000 concurrent users
**Constraints**: <200ms API response p95, real-time chat <1s latency, mobile-responsive all viewports
**Scale/Scope**: 8 major pages, 72 functional requirements, ~50 React components

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Simplicity First ✅ PASS

- **No Docker/complex infrastructure**: Uses Vercel deployment (zero-config)
- **No GraphQL code generation**: Direct Supabase queries and REST APIs
- **Managed services only**: Supabase (database), Vercel (hosting), Firebase (real-time chat)
- **Direct queries**: Database access through Supabase client, no abstraction layers

**Justification**: This feature adds UI complexity but maintains infrastructure simplicity. All components are standard Next.js patterns.

### Principle II: Community Accessibility ✅ PASS

- **Standard patterns**: React components follow Next.js 15 conventions
- **Clear structure**: UI components organized by feature (home/, characters/, chat/, lore/, spread/)
- **No clever abstractions**: Props drilling preferred over context where clear
- **Documentation required**: Each page component requires inline comments explaining structure

**Justification**: All patterns are well-documented Next.js/React standards that mid-level developers can understand.

### Principle III: Clean Architecture ✅ PASS

**Layer separation planned**:
- **UI Layer**: `app/` (pages), `components/` (presentational components)
- **Service Layer**: `lib/services/` (business logic for characters, chat, tweets, wallet)
- **Data Layer**: `lib/supabase.ts` (database client), `lib/database.types.ts` (type definitions)
- **Auth Layer**: `lib/auth/siwe.ts` (wallet authentication), `lib/wagmi.ts` (Web3 config)

**Rules compliance**:
- UI components call services only, never direct database
- Services return typed data, no database leakage
- Data access isolated to `lib/` directory
- Unidirectional dependencies enforced

### Principle IV: Type Safety & Contract Clarity ✅ PASS

- **TypeScript strict mode**: All components have explicit prop interfaces
- **No `any` types**: Database types auto-generated from Supabase schema
- **API contracts**: Will be defined in Phase 1 contracts/ directory
- **Shared types**: Located in `types/` directory (e.g., Character, Tweet, ChatMessage)

### Principle V: Test-Driven for Critical Paths ⚠️ REQUIRES ATTENTION

**Required tests** (must be added):
- ✅ Wallet authentication flow (SIWE)
- ✅ Character data fetching and display
- ✅ Chat real-time message sending/receiving
- ⚠️ Blockchain transaction flows (cure, sear, spread, infect) - NEEDS CLARIFICATION on mocking strategy

**Optional tests** (encouraged):
- Character filter/sort UI
- Video player interactions
- Menu navigation

**Action required in Phase 0**: Research best practices for testing Web3 transactions (mock blockchain vs testnet)

### Principle VI: Documentation as Code ✅ PASS

**Documentation plan**:
- Each page component file starts with purpose comment
- Complex Web3 interactions (spread mechanics) require step-by-step comments
- README in `components/` explaining organization
- ADR for Firebase vs Supabase choice for chat (dual database rationale)

### Principle VII: Web3 Pragmatism ✅ PASS

- **Smooth wallet connection**: RainbowKit provides polished UX out of the box
- **Clear error messages**: Toast notifications for transaction failures
- **Loading states**: All blockchain calls show loading indicators
- **Read-only mode**: Home, Characters (browse), and Lore pages work without wallet
- **Gas-free where possible**: Chat and character metadata stored off-chain in Supabase

## Project Structure

### Documentation (this feature)

```text
specs/003-page-wireframes/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── api-routes.yaml  # OpenAPI spec for API routes
│   └── components.yaml  # Component prop interfaces
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
app/                          # Next.js 15 App Router
├── api/                      # API routes
│   ├── auth/                 # Authentication endpoints
│   │   ├── nonce/route.ts    # Generate SIWE nonce
│   │   └── verify/route.ts   # Verify SIWE signature
│   ├── characters/           # Character endpoints
│   │   ├── route.ts          # List characters (filters, pagination)
│   │   └── [tokenId]/        # Single character CRUD
│   ├── chat/                 # Chat endpoints (if needed for REST fallback)
│   └── tweets/               # Tweet feed endpoints
├── page.tsx                  # Home page
├── characters/               # Characters pages
│   ├── page.tsx              # Browse page
│   └── [tokenId]/            # Character detail pages
│       ├── page.tsx          # Character sheet
│       └── animated/page.tsx # Animated view
├── gather/                   # Chat page
│   └── page.tsx
├── lore/                     # Tweet feed page
│   └── page.tsx
├── spread/                   # Infection mechanics page
│   └── page.tsx
├── layout.tsx                # Root layout (existing)
└── globals.css               # Global styles (existing)

components/                   # React components
├── layout/                   # Layout components
│   ├── Header.tsx            # MenuBar (existing)
│   ├── Footer.tsx            # Footer (existing)
│   └── Navigation.tsx        # MenuDrawer
├── wallet/                   # Wallet components (existing)
│   ├── WalletButton.tsx      # Connect button (existing)
│   └── UserDropdown.tsx      # User menu (existing)
├── home/                     # Home page components
│   ├── VideoPlayer.tsx       # Intro video
│   ├── HomeCard.tsx          # Content cards
│   └── HomeCardRow.tsx       # Card container
├── characters/               # Character components
│   ├── TokenFilterBar.tsx    # Filter controls
│   ├── TokenFeed.tsx         # Character grid
│   ├── CharacterCard.tsx     # Single card
│   ├── SheetMenuBar.tsx      # Character sheet header
│   ├── SheetTitleAndAttributes.tsx  # Stats display
│   ├── SheetBackgroundStory.tsx     # Editable story
│   └── SheetEquipment.tsx    # Equipment display
├── chat/                     # Chat components
│   ├── ChannelSelector.tsx   # Location/channel picker
│   ├── ChatMessages.tsx      # Message feed
│   ├── ChatFooter.tsx        # Message input
│   └── ChatUsers.tsx         # Online users list
├── lore/                     # Lore page components
│   ├── TweetFilterBar.tsx    # Tweet filters
│   └── CustomTweet.tsx       # Tweet card
├── spread/                   # Spread page components
│   ├── DialogSpreadingApproval.tsx   # ERC1155 approval modal
│   ├── DialogBurnCorpseApproval.tsx  # Burn approval modal
│   └── SpreadInfect.tsx      # Infection interface
├── shared/                   # Shared UI components
│   ├── BannerHeader.tsx      # Page titles
│   ├── DialogMask.tsx        # Modal overlay
│   └── InfiniteScroll.tsx    # Pagination wrapper
└── providers.tsx             # React providers (existing)

lib/                          # Core business logic
├── auth/                     # Authentication
│   └── siwe.ts               # SIWE implementation (existing)
├── services/                 # Business logic services
│   ├── character-service.ts  # Character operations
│   ├── chat-service.ts       # Chat operations
│   ├── tweet-service.ts      # Tweet operations
│   └── wallet-service.ts     # Web3 interactions
├── supabase.ts               # Supabase client (existing)
├── database.types.ts         # DB types (existing)
└── wagmi.ts                  # wagmi config (existing)

hooks/                        # Custom React hooks
├── useCurrentUser.ts         # User session hook
├── useCharacterLocation.ts   # Character location hook
├── useInfiniteScroll.ts      # Infinite scroll hook
└── useWebSocket.ts           # Firebase real-time hook

types/                        # Shared TypeScript types
├── character.ts              # Character entity types
├── tweet.ts                  # Tweet entity types
├── chat.ts                   # Chat message types
└── wallet.ts                 # Wallet/Web3 types

supabase/                     # Database migrations (existing)
└── migrations/               # SQL migration files
```

**Structure Decision**: This is a Next.js 15 App Router web application following the constitution's Clean Architecture mandate. The structure separates UI (app/ + components/), business logic (lib/services/), and data access (lib/supabase.ts). This aligns with the existing codebase structure and maintains simplicity by using standard Next.js conventions.

## Complexity Tracking

> **No violations** - All constitution principles pass. Feature maintains project simplicity while adding necessary UI complexity.

## Phase 1 Completion: Re-evaluation of Constitution Check

After completing Phase 1 (research, data model, contracts), we re-evaluate the Constitution Check against actual design decisions:

### Principle I: Simplicity First ✅ PASS (Confirmed)

**Design decisions**:
- Native HTML5 `<video>` (no react-player library)
- URL search params for filters (no state management library)
- Intersection Observer API (no infinite scroll library)
- Standard Next.js patterns (no custom abstractions)

**Conclusion**: All research decisions favor simplicity. No new complexity introduced.

### Principle II: Community Accessibility ✅ PASS (Confirmed)

**Design decisions**:
- Flat component organization by feature
- Clear service layer separation
- Documented in quickstart.md with examples
- TypeScript interfaces in contracts/components.yaml

**Conclusion**: Structure is approachable. Documentation provides clear guidance.

### Principle III: Clean Architecture ✅ PASS (Confirmed)

**Design decisions**:
- UI Layer: `app/` pages, `components/` presentational
- Service Layer: `lib/services/` (character, chat, tweet, wallet)
- Data Layer: `lib/supabase.ts`, `lib/database.types.ts`
- Auth Layer: `lib/auth/siwe.ts`, `lib/wagmi.ts`

**Conclusion**: Layer separation maintained. No cross-layer violations in design.

### Principle IV: Type Safety & Contract Clarity ✅ PASS (Confirmed)

**Design decisions**:
- OpenAPI spec for API routes (contracts/api-routes.yaml)
- TypeScript interfaces for all components (contracts/components.yaml)
- Zod validation schemas for runtime checks
- No `any` types in contracts

**Conclusion**: Strong type safety enforced. All public interfaces documented.

### Principle V: Test-Driven for Critical Paths ✅ PASS (Confirmed)

**Design decisions**:
- Mock blockchain + Sepolia testnet strategy (research.md #1)
- wagmi test utilities for unit tests
- Playwright for E2E tests
- Critical paths identified: auth, character data, chat, blockchain

**Conclusion**: Testing strategy defined. Critical paths covered.

### Principle VI: Documentation as Code ✅ PASS (Confirmed)

**Artifacts created**:
- research.md (8 technical decisions documented)
- data-model.md (10 entities with validation rules)
- quickstart.md (developer guide with examples)
- contracts/*.yaml (API and component specs)

**Conclusion**: Extensive documentation created. Rationale for all decisions recorded.

### Principle VII: Web3 Pragmatism ✅ PASS (Confirmed)

**Design decisions**:
- RainbowKit for smooth wallet UX
- Read-only mode for unauthenticated users
- Off-chain storage for chat and character metadata
- react-hot-toast for transaction feedback
- Clear error messages in all blockchain interactions

**Conclusion**: Web3 interactions prioritize UX. No unnecessary blockchain calls.

### Final Verdict: ✅ ALL PRINCIPLES PASS

No constitution violations. Ready to proceed to Phase 2 (task generation via `/speckit.tasks`).
