# Research: Page Wireframes Implementation

**Feature**: 003-page-wireframes
**Date**: 2025-10-28
**Purpose**: Resolve technical unknowns and establish best practices for implementing all page wireframes

## Research Questions

### 1. Testing Web3 Transactions (from Constitution Check)

**Question**: What is the best practice for testing blockchain transactions (cure, sear, spread, infect) without using mainnet?

**Decision**: Use wagmi/viem test utilities with mock blockchain for unit tests + Sepolia testnet for E2E tests

**Rationale**:
- **Mock blockchain** (via wagmi `createTestClient`): Fast, deterministic, no gas costs, perfect for CI/CD
- **Sepolia testnet**: Real blockchain behavior for integration tests, catches network-related issues
- **No mainnet testing**: Too expensive, too risky, violates Simplicity First principle

**Implementation approach**:
- Unit tests: Mock contract calls using `vi.mock()` with wagmi hooks
- Integration tests: Use Playwright + Sepolia testnet with test wallet
- Test wallet: Dedicated address with test ETH, no real value

**Alternatives considered**:
- **Hardhat local node**: Rejected - adds Docker/complex infrastructure (violates constitution)
- **Fork mainnet**: Rejected - requires Alchemy/Infura config, too complex for community contributors
- **Only manual testing**: Rejected - violates Test-Driven principle for critical paths

**References**:
- wagmi testing docs: https://wagmi.sh/react/guides/testing
- viem test client: https://viem.sh/docs/clients/test.html

---

### 2. Firebase vs Supabase for Real-Time Chat

**Question**: Why use Firebase Realtime Database for chat when the rest of the app uses Supabase?

**Decision**: Use Firebase Realtime Database for chat, Supabase for everything else

**Rationale**:
- **Firebase**: Optimized for real-time messaging, <1s latency guaranteed, built-in presence system
- **Supabase**: Better for structured data (characters, tweets), excellent PostgreSQL features
- **Hybrid approach justified**: Chat has unique requirements (real-time, ephemeral), different from other data

**Implementation approach**:
- Chat messages: Firebase Realtime Database (`chat/locations/{locationId}/messages`)
- User presence: Firebase Realtime Database (`chat/users/{userId}/status`)
- Character data: Supabase PostgreSQL (persistent, relational)
- Tweet data: Supabase PostgreSQL (structured, filterable)

**Alternatives considered**:
- **Supabase Realtime only**: Rejected - higher latency, less mature presence detection
- **Firebase only**: Rejected - PostgreSQL features needed for characters/tweets
- **WebSocket custom solution**: Rejected - violates Simplicity First (too much to maintain)

**ADR required**: Yes - document this architectural decision

**References**:
- Firebase Realtime Database: https://firebase.google.com/docs/database
- Supabase Realtime: https://supabase.com/docs/guides/realtime

---

### 3. Infinite Scroll Implementation Pattern

**Question**: What is the best practice for implementing infinite scroll in Next.js 15 with React Server Components?

**Decision**: Use `react-intersection-observer` + client-side pagination with Server Actions for data fetching

**Rationale**:
- **Intersection Observer**: Native browser API, performant, widely supported
- **Client-side pagination**: Maintains scroll position, smooth UX
- **Server Actions**: Next.js 15 best practice for client-server data flow
- **No external library**: Avoids dependencies like `react-infinite-scroll-component`

**Implementation approach**:
```typescript
// Server Action
export async function getCharacters(page: number, filters: Filters) {
  'use server'
  // Query Supabase with pagination
  return { characters, hasMore }
}

// Client Component
const { ref, inView } = useInView()
useEffect(() => {
  if (inView && hasMore) loadMore()
}, [inView])
```

**Alternatives considered**:
- **react-infinite-scroll-component**: Rejected - adds dependency, less control
- **Manual scroll event**: Rejected - less performant than Intersection Observer
- **Virtualized list**: Rejected - overkill for 6666 characters, adds complexity

**References**:
- Intersection Observer: https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
- Next.js Server Actions: https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations

---

### 4. Video Player for Home Page

**Question**: What library/approach should be used for the intro video player with pixel art preview?

**Decision**: Use native HTML5 `<video>` element with poster attribute, no external library

**Rationale**:
- **Native video**: Zero dependencies, works everywhere, accessible out of the box
- **Poster attribute**: Built-in support for preview images
- **Simplicity**: Aligns with constitution, no need for react-player or similar

**Implementation approach**:
```tsx
<video
  poster="/images/video-preview.png"
  controls
  className="w-full rounded-lg"
  preload="metadata"
>
  <source src="/videos/intro.mp4" type="video/mp4" />
  <source src="/videos/intro.webm" type="video/webm" />
  Your browser does not support the video tag.
</video>
```

**Alternatives considered**:
- **react-player**: Rejected - adds 100kb+ dependency for basic functionality
- **YouTube embed**: Rejected - requires external hosting, privacy concerns
- **Custom controls**: Rejected - native controls are accessible and familiar

**References**:
- MDN video element: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video

---

### 5. Character Filter State Management

**Question**: How should filter/sort state be managed for the characters page (URL params vs React state)?

**Decision**: Use URL search params for filter/sort state with Next.js `useSearchParams`

**Rationale**:
- **Shareable URLs**: Users can share links to filtered views (e.g., /characters?tab=owned&sort=desc)
- **Browser history**: Back/forward buttons work correctly
- **Server-side compatible**: Can pre-render based on URL params
- **No state library needed**: Aligns with Simplicity First

**Implementation approach**:
```typescript
// Client Component
const searchParams = useSearchParams()
const tab = searchParams.get('tab') ?? 'all'

function setTab(newTab: string) {
  const params = new URLSearchParams(searchParams)
  params.set('tab', newTab)
  router.push(`/characters?${params.toString()}`)
}
```

**Alternatives considered**:
- **React state only**: Rejected - loses state on refresh, not shareable
- **localStorage**: Rejected - not shareable, harder to reason about
- **Zustand/Redux**: Rejected - violates Simplicity First, overkill for filters

**References**:
- Next.js useSearchParams: https://nextjs.org/docs/app/api-reference/functions/use-search-params

---

### 6. Responsive Layout Strategy

**Question**: What CSS approach should be used for responsive layouts (Tailwind breakpoints vs CSS Grid)?

**Decision**: Use Tailwind CSS breakpoints with mobile-first approach

**Rationale**:
- **Tailwind already in use**: Consistent with existing codebase
- **Mobile-first**: Best practice for modern web, aligns with performance goals
- **No custom CSS needed**: Utility classes handle 95% of cases
- **Community friendly**: Most React developers know Tailwind

**Implementation approach**:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
  {/* Character cards */}
</div>
```

**Breakpoints**:
- `sm: 640px` - Small tablets
- `md: 768px` - Tablets
- `lg: 1024px` - Desktops
- `xl: 1280px` - Large desktops

**Alternatives considered**:
- **CSS Grid/Flexbox only**: Rejected - less maintainable, reinventing Tailwind
- **CSS Modules**: Rejected - adds complexity, less community-friendly
- **Styled-components**: Rejected - not in current stack

**References**:
- Tailwind responsive design: https://tailwindcss.com/docs/responsive-design

---

### 7. Error Handling Strategy

**Question**: How should errors be handled across pages (toast notifications vs error boundaries)?

**Decision**: Use react-hot-toast for user-facing errors + error boundaries for component crashes

**Rationale**:
- **Toast notifications**: Non-blocking, dismissible, good UX for expected errors (network, transaction)
- **Error boundaries**: Catch unexpected crashes, prevent white screen
- **Already in stack**: react-hot-toast is in package.json
- **Dual strategy**: Handles both expected and unexpected errors

**Implementation approach**:
```typescript
// Expected errors (user-facing)
try {
  await burnCorpse(amount)
  toast.success('Corpses burned successfully!')
} catch (error) {
  toast.error(`Failed to burn corpses: ${error.message}`)
}

// Unexpected errors (crashes)
<ErrorBoundary fallback={<ErrorPage />}>
  <CharacterSheet />
</ErrorBoundary>
```

**Error categories**:
- **Network errors**: Toast with retry button
- **Wallet errors**: Toast with clear instructions
- **Transaction errors**: Toast with transaction link
- **Component crashes**: Error boundary with reset button

**Alternatives considered**:
- **Only error boundaries**: Rejected - too aggressive, poor UX for recoverable errors
- **Only toasts**: Rejected - doesn't handle component crashes
- **Custom modal system**: Rejected - reinventing the wheel

**References**:
- react-hot-toast: https://react-hot-toast.com/
- React Error Boundaries: https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary

---

### 8. Component Organization Best Practices

**Question**: How should components be organized within feature directories (flat vs nested)?

**Decision**: Use flat structure within feature directories, group by page, not by type

**Rationale**:
- **Easier navigation**: All components for a feature in one place
- **Clear ownership**: components/characters/ owns all character UI
- **No deep nesting**: Max 2 levels deep (feature/component.tsx)
- **Co-location**: Related components stay together

**Structure example**:
```
components/
├── home/               # Home page components
│   ├── VideoPlayer.tsx
│   ├── HomeCard.tsx
│   └── HomeCardRow.tsx
├── characters/         # All character components
│   ├── TokenFilterBar.tsx
│   ├── TokenFeed.tsx
│   ├── CharacterCard.tsx
│   └── [sheet components]
└── shared/             # Truly shared across features
    ├── BannerHeader.tsx
    └── DialogMask.tsx
```

**Alternatives considered**:
- **Group by type**: Rejected - components/cards/, components/filters/ (hard to find)
- **Deep nesting**: Rejected - components/characters/filters/TokenFilterBar.tsx (overkill)
- **All flat**: Rejected - components/ with 50+ files (overwhelming)

**References**:
- React project structure: https://react.dev/learn/thinking-in-react#step-1-break-the-ui-into-a-component-hierarchy

---

## Summary of Decisions

| Topic | Decision | Impact |
|-------|----------|--------|
| Web3 Testing | Mock blockchain + Sepolia testnet | Enables fast CI/CD + real integration tests |
| Chat Database | Firebase Realtime for chat, Supabase for rest | Optimizes for real-time vs structured data |
| Infinite Scroll | Intersection Observer + Server Actions | Native API, no deps, Next.js best practice |
| Video Player | Native HTML5 `<video>` | Zero dependencies, works everywhere |
| Filter State | URL search params | Shareable, bookmarkable, history-friendly |
| Responsive CSS | Tailwind breakpoints mobile-first | Consistent with codebase, community-friendly |
| Error Handling | Toasts + error boundaries | Covers expected and unexpected errors |
| Component Organization | Flat feature directories | Easy navigation, clear ownership |

## Open Questions

None - all research questions resolved. Ready to proceed to Phase 1 (data model + contracts).
