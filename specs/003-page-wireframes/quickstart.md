# Quickstart Guide: Page Wireframes Implementation

**Feature**: 003-page-wireframes
**Branch**: `003-page-wireframes`
**Last Updated**: 2025-10-28

## Overview

This quickstart guide helps you understand and navigate the Page Wireframes implementation. It covers the 8 major pages, their components, data flow, and how to extend or modify them.

## Prerequisites

Before working with this feature, ensure you have:

1. **Development environment** set up (see root `README.md`)
2. **Supabase project** configured with `.env.local`
3. **Firebase project** (optional, for chat) configured
4. **Test wallet** with Sepolia test ETH (for blockchain features)
5. **Node.js 18+** and npm installed

## Project Structure

### Pages (Next.js App Router)

```
app/
├── page.tsx                  # Home page (/)
├── characters/
│   ├── page.tsx              # Character browse (/characters)
│   └── [tokenId]/
│       ├── page.tsx          # Character detail (/characters/123)
│       └── animated/page.tsx # Animated view (/characters/123/animated)
├── gather/page.tsx           # Chat (/gather)
├── lore/page.tsx             # Tweet feed (/lore)
├── spread/page.tsx           # Infection mechanics (/spread)
└── api/                      # API routes (see contracts/api-routes.yaml)
    ├── auth/...
    ├── characters/...
    └── tweets/...
```

### Components by Feature

```
components/
├── layout/          # Site-wide (Header, Footer, Navigation)
├── home/            # Home page components
├── characters/      # Character browse & detail
├── chat/            # Real-time chat
├── lore/            # Tweet feed
├── spread/          # Infection mechanics
└── shared/          # Reusable UI (BannerHeader, DialogMask, InfiniteScroll)
```

### Services (Business Logic)

```
lib/services/
├── character-service.ts    # Character CRUD, filters
├── chat-service.ts         # Firebase real-time chat
├── tweet-service.ts        # Tweet fetching, filters
└── wallet-service.ts       # Blockchain interactions
```

## Quick Reference: 8 Pages

### 1. Home Page (`/`)

**File**: `app/page.tsx`
**Components**: `VideoPlayer`, `HomeCard`, `HomeCardRow`
**Data**: Static content, no API calls
**Key Feature**: Intro video with pixel art preview

**Quickstart**:
```tsx
// app/page.tsx
import { VideoPlayer } from '@/components/home/VideoPlayer'
import { HomeCard } from '@/components/home/HomeCard'

export default function HomePage() {
  return (
    <div>
      <VideoPlayer videoSrc="/videos/intro.mp4" posterSrc="/images/preview.png" />
      <HomeCard title="An Evolving Story" description="..." imageSrc="..." />
      {/* More cards */}
    </div>
  )
}
```

### 2. Characters Browse (`/characters`)

**File**: `app/characters/page.tsx`
**Components**: `TokenFilterBar`, `TokenFeed`, `CharacterCard`
**Data**: `GET /api/characters?tab=owned&sort=desc`
**Key Features**: Filters (all/owned/infected/cured/staked), infinite scroll

**Quickstart**:
```tsx
// app/characters/page.tsx
'use client'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { TokenFeed } from '@/components/characters/TokenFeed'

export default function CharactersPage() {
  const { data, hasMore, loadMore } = useInfiniteScroll(
    (page) => fetch(`/api/characters?page=${page}`).then(r => r.json())
  )

  return (
    <div>
      <TokenFilterBar {...filterProps} />
      <TokenFeed characters={data} hasMore={hasMore} onLoadMore={loadMore} />
    </div>
  )
}
```

**Adding a filter**:
1. Update `TokenFilterBar` to accept new filter prop
2. Add query param to URL via `useSearchParams`
3. Update API route `/api/characters/route.ts` to handle new param
4. Add filter logic in `lib/services/character-service.ts`

### 3. Character Detail (`/characters/[tokenId]`)

**File**: `app/characters/[tokenId]/page.tsx`
**Components**: `SheetMenuBar`, `SheetTitleAndAttributes`, `SheetBackgroundStory`, `SheetEquipment`
**Data**: `GET /api/characters/{tokenId}`
**Key Features**: View stats, edit story (owners only), blockchain actions

**Quickstart**:
```tsx
// app/characters/[tokenId]/page.tsx
import { getCharacter } from '@/lib/services/character-service'

export default async function CharacterPage({ params }: { params: { tokenId: string } }) {
  const character = await getCharacter(parseInt(params.tokenId))

  return (
    <div>
      <SheetMenuBar tokenId={character.token_id} isOwner={...} />
      <SheetTitleAndAttributes character={character} />
      <SheetBackgroundStory story={character.background_story} />
      <SheetEquipment equipment={character.equipment} />
    </div>
  )
}
```

**Making it editable**:
- Use `useState` for edit mode
- On save, call `PATCH /api/characters/{tokenId}` with updated data
- See `SheetBackgroundStory` for example

### 4. Chat (`/gather`)

**File**: `app/gather/page.tsx`
**Components**: `ChannelSelector`, `ChatMessages`, `ChatFooter`, `ChatUsers`
**Data**: Firebase Realtime Database (`chat/locations/{locationId}/messages`)
**Key Features**: Real-time messages, user presence, location-based channels

**Quickstart**:
```tsx
// app/gather/page.tsx
'use client'
import { useWebSocket } from '@/hooks/useWebSocket'
import { ChatMessages } from '@/components/chat/ChatMessages'

export default function GatherPage() {
  const locationId = 'the-ruins'
  const { data: messages } = useWebSocket<ChatMessage[]>(
    `chat/locations/${locationId}/messages`
  )

  const handleSend = async (text: string) => {
    await chatService.sendMessage(locationId, {
      sender_token_id: selectedCharacter,
      text,
      // ... other fields
    })
  }

  return (
    <div>
      <ChannelSelector currentLocation={locationId} />
      <ChatMessages messages={messages || []} />
      <ChatFooter onSendMessage={handleSend} />
    </div>
  )
}
```

**Adding a new location**:
1. Insert into `locations` table: `INSERT INTO locations (location_id, name) VALUES ('new-place', 'New Place')`
2. Firebase path automatically created: `chat/locations/new-place/messages`
3. Update character `location_id` to place them there

### 5. Lore Feed (`/lore`)

**File**: `app/lore/page.tsx`
**Components**: `TweetFilterBar`, `CustomTweet`, `InfiniteScroll`
**Data**: `GET /api/tweets?sort=desc&perPage=25`
**Key Features**: Tweet feed, filters (all/text/video), auto-refresh every 20s

**Quickstart**:
```tsx
// app/lore/page.tsx
'use client'
import { useQuery } from '@tanstack/react-query'
import { CustomTweet } from '@/components/lore/CustomTweet'

export default function LorePage() {
  const { data } = useQuery({
    queryKey: ['tweets'],
    queryFn: () => fetch('/api/tweets').then(r => r.json()),
    refetchInterval: 20000, // Auto-refresh
  })

  return (
    <div>
      <TweetFilterBar {...filterProps} />
      {data?.tweets.map(tweet => (
        <CustomTweet key={tweet.tweet_id} tweet={tweet} />
      ))}
    </div>
  )
}
```

**Video player integration**:
- Uses native HTML5 `<video>` element in `CustomTweet`
- No external library needed (see research.md #4)

### 6. Spread Page (`/spread`)

**File**: `app/spread/page.tsx`
**Components**: `DialogBurnCorpseApproval`, `DialogSpreadingApproval`, `SpreadInfect`
**Data**: Read from blockchain (corpse balance, mushroom balance)
**Key Features**: Burn corpses, spread infections, infect specific character

**Quickstart**:
```tsx
// app/spread/page.tsx
'use client'
import { useContractRead, useContractWrite } from 'wagmi'
import { SpreadInfect } from '@/components/spread/SpreadInfect'

export default function SpreadPage() {
  const { data: corpseBalance } = useContractRead({
    address: CORPSE_CONTRACT,
    abi: ERC1155_ABI,
    functionName: 'balanceOf',
    args: [userAddress, 1], // Token ID 1 = Corpse
  })

  const { writeAsync: burnCorpse } = useContractWrite({
    address: SHROOM_CONTRACT,
    abi: SHROOM_ABI,
    functionName: 'burnCorpse',
  })

  return (
    <SpreadInfect
      corpseBalance={corpseBalance}
      onSpread={async (amount) => {
        await burnCorpse({ args: [amount] })
      }}
    />
  )
}
```

**Testing blockchain interactions**:
- Use mock blockchain for unit tests (see research.md #1)
- Use Sepolia testnet for E2E tests

### 7. Wallet Auth (Modal)

**File**: `components/wallet/WalletButton.tsx` (existing)
**Components**: RainbowKit `ConnectButton`
**Data**: SIWE via `/api/auth/nonce` and `/api/auth/verify`
**Key Features**: Multi-wallet support, session management

**Already implemented** - just use `<WalletButton />` in your page.

### 8. Navigation (MenuBar + Drawer)

**Files**: `components/layout/Header.tsx`, `components/layout/Navigation.tsx`
**Key Features**: Site-wide nav, mobile drawer, dark mode toggle

**Already implemented** - available on all pages via root layout.

## Common Tasks

### Task 1: Add a New Page

1. Create page file: `app/new-page/page.tsx`
2. Add to navigation: Update `components/layout/Navigation.tsx`
3. Create components: `components/new-page/MyComponent.tsx`
4. Add API route if needed: `app/api/new-page/route.ts`
5. Document in this quickstart

### Task 2: Add a New Filter to Characters

1. **Update UI**: Add button to `TokenFilterBar`
2. **Update URL**: Modify `useSearchParams` logic
3. **Update API**: Add param handling in `/api/characters/route.ts`
4. **Update service**: Add filter logic in `character-service.ts`
5. **Update types**: Add to `CharacterFilters` interface

Example:
```typescript
// lib/services/character-service.ts
export async function getCharacters(filters: CharacterFilters) {
  let query = supabase.from('characters').select('*')

  if (filters.tab === 'my-custom-filter') {
    query = query.eq('custom_field', 'custom_value')
  }

  // ... rest of filters
}
```

### Task 3: Add Real-Time Feature (Like Chat)

1. **Firebase setup**: Create path structure (e.g., `realtime/feature/{id}`)
2. **Hook**: Use `useWebSocket` hook
3. **Subscribe**: Listen to Firebase path changes
4. **Publish**: Write to Firebase on user action
5. **Presence**: Add presence tracking if needed

Example:
```typescript
const { data } = useWebSocket<MyData[]>('realtime/feature/123')
```

### Task 4: Add Blockchain Action

1. **Contract ABI**: Add to `lib/contracts/`
2. **Hook setup**: Use wagmi `useContractWrite`
3. **Approval flow**: Add approval dialog if ERC20/ERC1155
4. **Transaction**: Call contract function
5. **Confirmation**: Wait for receipt, show toast

Example:
```typescript
const { writeAsync } = useContractWrite({
  address: CONTRACT_ADDRESS,
  abi: CONTRACT_ABI,
  functionName: 'myFunction',
})

await writeAsync({ args: [param1, param2] })
```

### Task 5: Update Character Schema

1. **Database**: Add migration in `supabase/migrations/`
2. **Types**: Regenerate types: `npx supabase gen types typescript`
3. **Data model**: Update `specs/003-page-wireframes/data-model.md`
4. **Components**: Update `Character` interface consumers
5. **API**: Update validation in API routes

## Data Flow Patterns

### Pattern 1: Server Component (SSR)
```tsx
// app/characters/[tokenId]/page.tsx
export default async function Page() {
  const data = await fetch('...').then(r => r.json())
  return <Component data={data} />
}
```

**When to use**: Initial page load, SEO-important content

### Pattern 2: Client Component + React Query
```tsx
'use client'
export default function Page() {
  const { data } = useQuery({
    queryKey: ['key'],
    queryFn: () => fetch('...').then(r => r.json()),
  })
  return <Component data={data} />
}
```

**When to use**: Interactive features, real-time updates, filters

### Pattern 3: Firebase Real-Time
```tsx
'use client'
export default function Page() {
  const { data } = useWebSocket<T>('firebase/path')
  return <Component data={data} />
}
```

**When to use**: Chat, presence, collaborative features

### Pattern 4: Blockchain Read
```tsx
'use client'
export default function Page() {
  const { data } = useContractRead({
    address: '0x...',
    abi: ABI,
    functionName: 'balanceOf',
  })
  return <Component balance={data} />
}
```

**When to use**: NFT balances, contract state

## Testing

### Unit Tests (Components)
```bash
npm test components/characters/CharacterCard.test.tsx
```

### Integration Tests (API Routes)
```bash
npm test app/api/characters/route.test.ts
```

### E2E Tests (Playwright)
```bash
npm run test:e2e
```

**Critical paths to test** (per constitution):
- ✅ Wallet auth (SIWE flow)
- ✅ Character data fetching
- ✅ Chat messaging
- ⚠️ Blockchain transactions (see research.md #1)

## Debugging

### Common Issues

**Issue**: "Character not found"
- Check token_id is between 1-6666
- Verify character exists in database
- Check user has permission (for edit actions)

**Issue**: Chat messages not appearing
- Verify Firebase credentials in `.env.local`
- Check Firebase path structure
- Ensure character location matches channel

**Issue**: Wallet connection fails
- Check wagmi config in `lib/wagmi.ts`
- Verify RainbowKit project ID
- Test with different wallet (MetaMask, WalletConnect)

**Issue**: Infinite scroll not loading
- Check `hasMore` flag logic
- Verify pagination cursor
- Test with network throttling

### Debug Tools

1. **React DevTools**: Component hierarchy, props
2. **Next.js DevTools**: Server/client boundary, cache
3. **wagmi DevTools**: Blockchain state, transactions
4. **Firebase Console**: Real-time data, rules
5. **Supabase Studio**: Database queries, logs

## Performance Optimization

### Image Optimization
```tsx
import Image from 'next/image'

<Image src={character.image_url} width={512} height={512} alt="Character" />
```

### Route Caching
```tsx
export const revalidate = 60 // Revalidate every 60 seconds
```

### React Query Caching
```tsx
const { data } = useQuery({
  queryKey: ['characters'],
  queryFn: fetchCharacters,
  staleTime: 5 * 60 * 1000, // 5 minutes
})
```

## Deployment

### Vercel (Recommended)
```bash
git push origin 003-page-wireframes
# Vercel auto-deploys preview
```

### Environment Variables
Ensure these are set in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
- `FIREBASE_*` (if using chat)

## Next Steps

After completing this feature:
1. Run `/speckit.tasks` to generate implementation tasks
2. Review `tasks.md` for step-by-step implementation plan
3. Start with P1 tasks (Home, Characters, Wallet Auth, Navigation)
4. Test critical paths (auth, character data, chat)
5. Deploy to Vercel for preview

## Resources

- **Spec**: [spec.md](./spec.md) - Feature requirements
- **Data Model**: [data-model.md](./data-model.md) - Database schema
- **API Contracts**: [contracts/api-routes.yaml](./contracts/api-routes.yaml) - API spec
- **Component Contracts**: [contracts/components.yaml](./contracts/components.yaml) - TypeScript interfaces
- **Research**: [research.md](./research.md) - Technical decisions

## Questions?

See [research.md](./research.md) for technical decisions and alternatives considered. For implementation tasks, run `/speckit.tasks` to generate the detailed task list.
