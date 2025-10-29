# Data Model: Page Wireframes Implementation

**Feature**: 003-page-wireframes
**Date**: 2025-10-28
**Purpose**: Define data structures and relationships for all page entities

## Entity Definitions

### 1. Character

**Description**: Represents a WAGDIE NFT with game attributes, stats, and metadata

**Storage**: Supabase PostgreSQL table `characters`

**Fields**:

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `token_id` | integer | Yes | Unique token ID (1-6666) | Primary key, 1-6666 |
| `owner_address` | string | Yes | Ethereum address of owner | Valid hex address |
| `name` | string | No | Character name | Max 100 chars |
| `class` | string | No | Character class (Warrior, Mage, Rogue, Cleric) | Enum |
| `level` | integer | Yes | Character level | 1-20 |
| `experience` | integer | Yes | Experience points | >= 0 |
| `str` | integer | Yes | Strength attribute | 1-20 |
| `dex` | integer | Yes | Dexterity attribute | 1-20 |
| `con` | integer | Yes | Constitution attribute | 1-20 |
| `int` | integer | Yes | Intelligence attribute | 1-20 |
| `wis` | integer | Yes | Wisdom attribute | 1-20 |
| `cha` | integer | Yes | Charisma attribute | 1-20 |
| `hp` | integer | Yes | Hit points | > 0 |
| `max_hp` | integer | Yes | Maximum hit points | >= hp |
| `ac` | integer | Yes | Armor class | 10-25 |
| `speed` | integer | Yes | Movement speed | 10-50 |
| `background_story` | text | No | Editable story text | Max 5000 chars |
| `equipment` | jsonb | No | Weapons, armor, items | JSON object |
| `location_id` | string | No | Current in-game location | Foreign key |
| `infection_status` | string | Yes | Infection state | Enum: healthy, infected, cured |
| `staking_status` | string | Yes | Staking state | Enum: unstaked, staked |
| `image_url` | string | Yes | Character image URL | Valid URL |
| `created_at` | timestamp | Yes | Record creation time | Auto-generated |
| `updated_at` | timestamp | Yes | Last update time | Auto-updated |

**Relationships**:
- **Has many** Concords (via `character_concords` join table)
- **Belongs to** Location (via `location_id`)
- **Has many** ChatMessages (via `sender_token_id`)

**Indexes**:
- Primary: `token_id`
- Secondary: `owner_address` (for "my characters" filter)
- Secondary: `infection_status` (for infection filter)
- Secondary: `staking_status` (for staking filter)

**State Transitions**:
```
infection_status:
  healthy -> infected (via spread transaction)
  infected -> cured (via cure transaction)
  (no reverse: cured -> infected)

staking_status:
  unstaked <-> staked (via staking contract)
```

---

### 2. Concord

**Description**: Special items/powers that can be owned by characters or seared for permanent effects

**Storage**: Supabase PostgreSQL table `concords`

**Fields**:

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `concord_id` | integer | Yes | Unique concord identifier | Primary key |
| `name` | string | Yes | Concord name | Max 100 chars |
| `description` | text | Yes | Effect description | Max 1000 chars |
| `image_url` | string | Yes | Concord image | Valid URL |
| `is_consumable` | boolean | Yes | Can be seared (burned) | Default true |
| `effect_type` | string | Yes | Effect category | Enum: stat_boost, ability, passive |
| `created_at` | timestamp | Yes | Record creation time | Auto-generated |

**Relationships**:
- **Belongs to many** Characters (via `character_concords`)

**Special Cases**:
- Concord #15 = "Strange Mushroom" (from burning corpses)

---

### 3. CharacterConcord (Join Table)

**Description**: Links characters to their owned concords

**Storage**: Supabase PostgreSQL table `character_concords`

**Fields**:

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `id` | uuid | Yes | Unique record ID | Primary key |
| `token_id` | integer | Yes | Character token ID | Foreign key to characters |
| `concord_id` | integer | Yes | Concord ID | Foreign key to concords |
| `quantity` | integer | Yes | Number owned | >= 1 |
| `is_seared` | boolean | Yes | Has been burned | Default false |
| `seared_at` | timestamp | No | When seared | Nullable |
| `created_at` | timestamp | Yes | Record creation time | Auto-generated |

**Composite Indexes**:
- Unique: `(token_id, concord_id)` - prevent duplicates
- Index: `token_id` - fast character lookup

---

### 4. Location

**Description**: In-game location where characters can be present, used for chat channels

**Storage**: Supabase PostgreSQL table `locations`

**Fields**:

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `location_id` | string | Yes | Unique location identifier | Primary key, kebab-case |
| `name` | string | Yes | Display name | Max 100 chars |
| `description` | text | No | Location flavor text | Max 500 chars |
| `is_active` | boolean | Yes | Can be visited | Default true |
| `created_at` | timestamp | Yes | Record creation time | Auto-generated |

**Relationships**:
- **Has many** Characters (via `location_id` foreign key)
- **Has many** ChatMessages (via Firebase path)

**Examples**:
- `the-ruins`, `crossroads`, `dark-forest`, `haven`

---

### 5. Tweet

**Description**: Official lore content from @WAGDIE_ETH Twitter account

**Storage**: Supabase PostgreSQL table `tweets`

**Fields**:

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `tweet_id` | string | Yes | Twitter tweet ID | Primary key |
| `text` | text | Yes | Tweet content | Max 5000 chars |
| `author_username` | string | Yes | Twitter username | Default 'WAGDIE_ETH' |
| `created_at` | timestamp | Yes | Tweet timestamp | From Twitter API |
| `media_type` | string | No | Media category | Enum: none, image, video |
| `media_url` | string | No | Media URL | Valid URL or null |
| `video_url` | string | No | Video player URL | Valid URL or null |
| `engagement_count` | jsonb | No | Likes, retweets, replies | `{likes, retweets, replies}` |
| `is_reply` | boolean | Yes | Is a reply tweet | Default false |
| `is_retweet` | boolean | Yes | Is a retweet | Default false |
| `fetched_at` | timestamp | Yes | When synced | Auto-generated |

**Relationships**: None (standalone entity)

**Indexes**:
- Primary: `tweet_id`
- Secondary: `created_at DESC` (for chronological feed)
- Secondary: `media_type` (for filter by media)

**Filtering Logic**:
- Filter out: `is_reply = true` OR `is_retweet = true`
- Sort by: `created_at` DESC (newest first) or ASC (oldest first)

---

### 6. ChatMessage

**Description**: User messages in location-based chat

**Storage**: Firebase Realtime Database path `chat/locations/{locationId}/messages/{messageId}`

**Schema** (JSON):

```json
{
  "message_id": "uuid-v4",
  "sender_token_id": 123,
  "sender_name": "Character Name",
  "sender_class": "Warrior",
  "sender_level": 5,
  "text": "Message content",
  "timestamp": 1698765432000,
  "location_id": "the-ruins"
}
```

**Fields**:

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `message_id` | string | Yes | Unique message ID | UUID v4 |
| `sender_token_id` | integer | Yes | Character token ID | 1-6666 |
| `sender_name` | string | Yes | Character name | Max 100 chars |
| `sender_class` | string | Yes | Character class | Enum |
| `sender_level` | integer | Yes | Character level | 1-20 |
| `text` | string | Yes | Message content | Max 1000 chars |
| `timestamp` | number | Yes | Unix timestamp (ms) | Auto-generated |
| `location_id` | string | Yes | Location key | Matches Location entity |

**Relationships**:
- **Belongs to** Character (via `sender_token_id`)
- **Belongs to** Location (via `location_id`)

**Retention**: Messages older than 30 days are automatically purged (Firebase TTL)

---

### 7. UserPresence

**Description**: Tracks online/away status for chat users

**Storage**: Firebase Realtime Database path `chat/users/{tokenId}/presence`

**Schema** (JSON):

```json
{
  "token_id": 123,
  "status": "online",
  "location_id": "the-ruins",
  "last_active": 1698765432000
}
```

**Fields**:

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `token_id` | integer | Yes | Character token ID | 1-6666 |
| `status` | string | Yes | User status | Enum: online, away, offline |
| `location_id` | string | No | Current location | Nullable |
| `last_active` | number | Yes | Last activity timestamp | Unix ms |

**State Transitions**:
```
online -> away (after 5 min idle)
away -> offline (after 30 min idle)
offline -> online (user reconnects)
```

**Firebase Presence**: Uses Firebase `onDisconnect()` to auto-update on connection loss

---

### 8. User (Session)

**Description**: Authenticated user session (wallet-based)

**Storage**: Server-side session (iron-session), no database table

**Session Data**:

```typescript
{
  address: string          // Ethereum address (checksummed)
  siwe: {
    message: string        // SIWE message
    signature: string      // Signature
    nonce: string          // Used nonce
  }
  expires: number          // Session expiration (Unix timestamp)
  selectedCharacter?: number  // Currently selected token ID
}
```

**Relationships**: Logical link to Characters via `address` -> `owner_address`

**Session Duration**: 7 days, renewable on activity

---

### 9. Corpse

**Description**: ERC1155 token (on-chain) that can be burned for mushrooms

**Storage**: Ethereum blockchain (ERC1155 contract)

**On-Chain Data**:
- Token ID: `1` (fixed)
- Balance: Tracked per address in smart contract
- Metadata: IPFS URI

**Off-Chain Tracking**: Not stored in database (read-only from blockchain)

**Relationships**: Logical link to User via Ethereum address

---

### 10. StrangeMushroom

**Description**: Concord #15, awarded from burning corpses

**Storage**: Represented in `character_concords` table as `concord_id = 15`

**Special Properties**:
- Consumable: Can be used in spread/infect transactions
- Quantity: Multiple can be owned per character
- Not seared: Used in transactions, not burned for permanent effects

---

## Relationships Diagram

```
┌─────────────┐
│  Character  │───────┐
│  (1-6666)   │       │
└──────┬──────┘       │
       │              │
       │ has many     │ belongs to
       │              │
       v              v
┌──────────────────────────┐        ┌────────────┐
│  CharacterConcord        │───────>│  Concord   │
│  (join table)            │ refs   │  (#1-N)    │
└──────────────────────────┘        └────────────┘
       │
       │ belongs to
       v
┌──────────────┐
│   Location   │<─────────┐
│   (places)   │          │
└──────┬───────┘          │
       │                  │
       │ has channel      │ location_id
       v                  │
┌──────────────┐          │
│ ChatMessage  │──────────┘
│  (Firebase)  │
└──────────────┘

┌──────────────┐     ┌──────────────┐
│    Tweet     │     │     User     │
│  (isolated)  │     │  (session)   │
└──────────────┘     └──────────────┘
                            │
                            │ owns (on-chain)
                            v
                     ┌──────────────┐
                     │    Corpse    │
                     │  (ERC1155)   │
                     └──────────────┘
```

## Data Flow Patterns

### Pattern 1: Character Browsing
```
User Request
  → API Route: GET /api/characters?tab=owned&sort=desc
  → Service Layer: character-service.ts
  → Data Layer: Supabase query
  → Response: Character[] with pagination

Filters applied:
- owner_address (if tab=owned)
- infection_status (if tab=infected)
- staking_status (if tab=staked)
```

### Pattern 2: Real-Time Chat
```
User sends message
  → Client: chat-service.ts
  → Firebase: chat/locations/{locationId}/messages/push()
  → Real-time listeners: All users in location
  → UI Update: Message appears in ChatMessages component

Presence tracking:
  → Firebase: chat/users/{tokenId}/presence
  → onDisconnect() handler: Auto-update to offline
```

### Pattern 3: Blockchain Transaction
```
User burns corpse
  → Client: wallet-service.ts
  → wagmi: usePrepareContractWrite()
  → Wallet: User signs transaction
  → Blockchain: Transaction submitted
  → Confirmation: Wait for receipt
  → UI Update: Refresh balances from contract
```

## Validation Rules Summary

### Character Validation
- `token_id`: Must be unique, 1-6666
- `owner_address`: Must be valid Ethereum address (checksummed)
- All stats (str, dex, etc.): 1-20
- `hp` <= `max_hp`
- `level`: 1-20
- `experience`: >= 0
- `background_story`: Max 5000 characters
- `infection_status`: One of [healthy, infected, cured]

### Tweet Validation
- `tweet_id`: Must be unique
- `text`: Required, max 5000 characters
- Filter out: `is_reply = true` OR `is_retweet = true`
- `media_type`: One of [none, image, video]

### ChatMessage Validation
- `text`: Required, max 1000 characters
- `sender_token_id`: Must exist in characters table
- `location_id`: Must exist in locations table
- `timestamp`: Auto-generated, immutable

### Session Validation
- `address`: Must be valid Ethereum address
- `siwe.signature`: Must be valid SIWE signature
- `expires`: Must be in future

## Migration Considerations

### Existing Tables
Based on PAGE_WIREFRAMES.md references, these tables likely exist:
- `characters` (with token ID, owner, stats)
- `tweets` (synced from Twitter)

### New Tables Required
- `concords` (if not exists)
- `character_concords` (if not exists)
- `locations` (if not exists)

### Schema Updates Needed
- Add `background_story` column to `characters` (if missing)
- Add indexes for `infection_status`, `staking_status`
- Add `equipment` jsonb column (if missing)

### Data Seeding Required
- **Locations**: Seed initial locations (the-ruins, crossroads, etc.)
- **Concords**: Seed concord #15 (Strange Mushroom) and others
- **Characters**: May need to backfill `location_id` for existing records

## TypeScript Type Definitions

See `types/` directory for generated interfaces:
- `types/character.ts` - Character entity
- `types/tweet.ts` - Tweet entity
- `types/chat.ts` - ChatMessage, UserPresence
- `types/wallet.ts` - User session types

These types are auto-generated from Supabase schema using:
```bash
npx supabase gen types typescript --project-id <PROJECT_ID> > lib/database.types.ts
```

## Performance Considerations

### Indexes for Fast Queries
- `characters.owner_address` - "My characters" filter
- `characters.infection_status` - Infection filter
- `characters.staking_status` - Staking filter
- `tweets.created_at DESC` - Chronological feed
- `character_concords(token_id)` - Character concords lookup

### Pagination Strategy
- Characters: 50 per page (infinite scroll)
- Tweets: 25 per page (infinite scroll)
- Chat: Last 100 messages, auto-purge >30 days

### Caching Strategy
- Characters: Cache in React Query, 5-minute stale time
- Tweets: Cache in React Query, 20-second stale time (matches polling)
- Chat: No caching (real-time Firebase)

## Security Considerations

### Access Control
- Character editing: Must own token (verify `owner_address` matches session)
- Chat posting: Must have selected character
- Transaction actions: Wallet signature required

### Input Validation
- Sanitize `background_story` for XSS
- Validate `tweet_id` to prevent injection
- Limit `chat.text` to 1000 characters
- Rate limit: Chat messages (5/minute), transactions (10/minute)

### Data Privacy
- Wallet addresses: Public (on-chain)
- Chat messages: Public (per location)
- Session data: Server-side only, never exposed to client
