# WAGDIE App - Page Wireframes & Feature Documentation

This document provides ASCII wireframes and detailed feature descriptions for each page in the WAGDIE web application.

---

## 1. HOME PAGE (`/`)

### Wireframe

```
┌────────────────────────────────────────────────────────────────────┐
│                          MENU BAR                                  │
│  [About] [Characters] [Gather] [MORE]              [Connect Wallet]│
└────────────────────────────────────────────────────────────────────┘

           ┌─────────────────────────────────────────────┐
           │                                             │
           │    ╦ ╦╔═╗╔═╗╔╦╗╦╔═╗                        │
           │    ║║║╠═╣║ ╦ ║║║╠═╣                        │
           │    ╚╩╝╩ ╩╚═╝═╩╝╩╩ ╩                        │
           │                                             │
           │    WE ARE ALL GOING TO DIE                 │
           │                                             │
           └─────────────────────────────────────────────┘

                ┌─────────────────────────────┐
                │                             │
                │   [▶ INTRO VIDEO]          │
                │   Pixel Art Preview Image   │
                │   (Click to Play)           │
                │                             │
                └─────────────────────────────┘

════════════════════════════════════════════════════════════════════
                       AN EVOLVING STORY
════════════════════════════════════════════════════════════════════

┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  [Artwork Image] │  │  [Artwork Image] │  │  [Artwork Image] │
│                  │  │                  │  │                  │
│  WAGDIE is an    │  │  Players take on │  │  Through their   │
│  interactive     │  │  the role of     │  │  journey they    │
│  narrative based │  │  traveling       │  │  will make       │
│  in dark fantasy │  │  adventurers     │  │  choices that    │
│  played through  │  │  exploring a     │  │  alter the story │
│  Twitter via     │  │  realm shaped by │  │  and change the  │
│  @WAGDIE_ETH     │  │  powerful beings │  │  future forever  │
│                  │  │                  │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘

════════════════════════════════════════════════════════════════════
              WITH RICH, INTERACTIVE ELEMENTS
════════════════════════════════════════════════════════════════════

┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  [Artwork Image] │  │  [Artwork Image] │  │  [Artwork Image] │
│                  │  │                  │  │                  │
│  WAGDIE          │  │  We pioneered    │  │  While a         │
│  encourages      │  │  the use of NFTs │  │  majority of the │
│  active          │  │  as a means of   │  │  narrative is    │
│  participation,  │  │  tracking player │  │  released via    │
│  either through  │  │  actions through │  │  Twitter, it     │
│  reaction and    │  │  ritual on-chain │  │  frequently      │
│  roleplaying or  │  │  sacrifices or   │  │  includes voice  │
│  community-      │  │  burning.        │  │  acting, video,  │
│  driven          │  │                  │  │  and detailed    │
│  initiatives.    │  │                  │  │  pixelart.       │
│                  │  │                  │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘

════════════════════════════════════════════════════════════════════
                     CO-CREATED BY YOU
════════════════════════════════════════════════════════════════════

┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  [Artwork Image] │  │  [Artwork Image] │  │  [Artwork Image] │
│                  │  │                  │  │                  │
│  YOU WILL NOT    │  │  As a Creative   │  │  THE DEATH OF    │
│  SURVIVE is a    │  │  Commons         │  │  KING OFFLING    │
│  Dark Action     │  │  licensed,       │  │  chronicled the  │
│  Roguelike being │  │  community-      │  │  death of a      │
│  created by      │  │  driven project, │  │  community       │
│  members of our  │  │  WAGDIE features │  │  member, and the │
│  community.      │  │  player-shaped   │  │  spread of a new │
│  Fight through   │  │  stories and     │  │  dangerous       │
│  waves of        │  │  assets like     │  │  affliction that │
│  enemies.        │  │  BEASTS.         │  │  mutated.        │
│                  │  │                  │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘

════════════════════════════════════════════════════════════════════
                      START PLAYING NOW
════════════════════════════════════════════════════════════════════

      ┌──────────────────┐        ┌──────────────────┐
      │  [Artwork Image] │        │  [Artwork Image] │
      │                  │        │                  │
      │ ┌──────────────┐ │        │ ┌──────────────┐ │
      │ │ JOIN US ON   │ │        │ │ GET IN       │ │
      │ │   DISCORD    │ │        │ │  CHARACTER   │ │
      │ └──────────────┘ │        │ └──────────────┘ │
      │                  │        │                  │
      └──────────────────┘        └──────────────────┘
```

### Features

**Components:**
- `MenuBar` (src/components/MenuBar.tsx:22): Top navigation bar with About, Characters, Gather links and Connect Wallet button
- `VideoPlayer` (components/VideoPlayer): Embedded intro video with pixel art preview thumbnails
- `HomeCard` (features/home): Clickable card components with images and descriptions
- `HomeCardRow` (features/home): Container for organizing cards in rows with titles
- `HomeTextBox` (features/home): Text content containers

**Functionality:**
- Logo image display
- Video player with multiple random preview images
- Clickable cards linking to:
  - External: Twitter, OpenSea, Discord, Conclave, Snapshot, Wiki, Itch.io
  - Internal: `/characters` page
- Responsive layout (mobile/desktop)
- Dark fantasy theme with custom Fraktur fonts

**Page Props:**
- Server-side rendered with `bodyClass: 'home'` for special styling
- Static site generation

---

## 2. LOGIN PAGE (`/login`)

### Wireframe

```
┌────────────────────────────────────────────────────────────────────┐
│                          MENU BAR                                  │
│  [About] [Characters] [Gather] [MORE]              [Connect Wallet]│
└────────────────────────────────────────────────────────────────────┘


                    ┌──────────────────────────┐
                    │                          │
                    │   SIGN IN WITH ETHEREUM  │
                    │                          │
                    │  ┌────────────────────┐  │
                    │  │                    │  │
                    │  │  Connect your      │  │
                    │  │  wallet to sign in │  │
                    │  │                    │  │
                    │  │  [MetaMask]        │  │
                    │  │  [WalletConnect]   │  │
                    │  │  [Coinbase Wallet] │  │
                    │  │                    │  │
                    │  └────────────────────┘  │
                    │                          │
                    └──────────────────────────┘

```

### Features

**Components:**
- `MenuBar` (src/components/MenuBar.tsx:22): Top navigation
- `ConnectionDialog` (features/siwe): Sign-In With Ethereum (SIWE) modal

**Functionality:**
- Web3 wallet connection via wagmi
- SIWE authentication flow
- Supports multiple wallet providers:
  - MetaMask
  - WalletConnect
  - Coinbase Wallet
- Generates nonce via `/api/auth/nonce`
- Verifies signature via `/api/auth/verify`
- Creates secure session using iron-session

---

## 3. CHARACTERS PAGE (`/characters`)

### Wireframe

```
┌────────────────────────────────────────────────────────────────────┐
│                          MENU BAR                                  │
│  [About] [Characters] [Gather] [MORE]    [Dark Mode] [Connect]    │
└────────────────────────────────────────────────────────────────────┘

                    ┏━━━━━━━━━━━━━━━━━━━━┓
                    ┃   CHARACTERS       ┃
                    ┗━━━━━━━━━━━━━━━━━━━━┛

┌────────────────────────────────────────────────────────────────────┐
│ FILTER BAR                                                         │
│                                                                    │
│  [All] [Owned] [Infected] [Cured] [Staked]   [Sort ▲▼]  [Wallet] │
└────────────────────────────────────────────────────────────────────┘

┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ ╔══════╗ │ │ ╔══════╗ │ │ ╔══════╗ │ │ ╔══════╗ │ │ ╔══════╗ │
│ ║      ║ │ │ ║      ║ │ │ ║      ║ │ │ ║      ║ │ │ ║      ║ │
│ ║ IMG  ║ │ │ ║ IMG  ║ │ │ ║ IMG  ║ │ │ ║ IMG  ║ │ │ ║ IMG  ║ │
│ ║      ║ │ │ ║      ║ │ │ ║      ║ │ │ ║      ║ │ │ ║      ║ │
│ ╚══════╝ │ │ ╚══════╝ │ │ ╚══════╝ │ │ ╚══════╝ │ │ ╚══════╝ │
│ #123     │ │ #456     │ │ #789     │ │ #012     │ │ #345     │
│ [Status] │ │ [Status] │ │ [Status] │ │ [Status] │ │ [Status] │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘

┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ ╔══════╗ │ │ ╔══════╗ │ │ ╔══════╗ │ │ ╔══════╗ │ │ ╔══════╗ │
│ ║      ║ │ │ ║      ║ │ │ ║      ║ │ │ ║      ║ │ │ ║      ║ │
│ ║ IMG  ║ │ │ ║ IMG  ║ │ │ ║ IMG  ║ │ │ ║ IMG  ║ │ │ ║ IMG  ║ │
│ ║      ║ │ │ ║      ║ │ │ ║      ║ │ │ ║      ║ │ │ ║      ║ │
│ ╚══════╝ │ │ ╚══════╝ │ │ ╚══════╝ │ │ ╚══════╝ │ │ ╚══════╝ │
│ #678     │ │ #901     │ │ #234     │ │ #567     │ │ #890     │
│ [Status] │ │ [Status] │ │ [Status] │ │ [Status] │ │ [Status] │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘

                      [Loading more...]
```

### Features

**Components:**
- `MenuBar` (src/components/MenuBar.tsx:22): Top navigation
- `BannerHeader` (components/BannerHeader): "Characters" title
- `TokenFilterBar` (features/characters): Filter controls
- `TokenFeed` (features/characters): Grid of character cards

**Functionality:**
- **Filtering System:**
  - All characters
  - Owned by connected wallet
  - Owned by specific wallet (via query param `?wallet=0x...`)
  - Filter by infection status
  - Filter by location/staking
- **Sorting:** Ascending/Descending by token ID
- **Character Cards:**
  - Token ID display
  - Character image
  - Status badges (infected, cured, staked)
  - Click to view character sheet
- **URL State Management:** Filter and sort state persisted in URL query params (`?tab=owned`)
- **Server-Side Props:** Loads concord searing data

**API Integration:**
- Queries Firestore for character metadata
- Integrates with GraphQL for token ownership
- Real-time data via React Query

---

## 4. CHARACTER DETAIL PAGE (`/characters/[tokenId]`)

### Wireframe

```
┌────────────────────────────────────────────────────────────────────┐
│                    CHARACTER SHEET MENU BAR                        │
│  [← Back] [Edit] [Save] [Roll New Character]    [Animated View]   │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│  ┌─────────────┐                                                   │
│  │             │   ╔═══════════════════════════════════════════╗  │
│  │             │   ║  CHARACTER NAME (#123)                    ║  │
│  │  Character  │   ║  Class: Warrior | Level: 5 | XP: 1250    ║  │
│  │    Image    │   ╠═══════════════════════════════════════════╣  │
│  │  (512x512)  │   ║  ATTRIBUTES                               ║  │
│  │             │   ║  ▓▓▓▓▓▓░░░░ STR: 12                      ║  │
│  │             │   ║  ▓▓▓▓▓░░░░░ DEX: 10                      ║  │
│  │             │   ║  ▓▓▓▓▓▓▓░░░ CON: 14                      ║  │
│  └─────────────┘   ║  ▓▓▓▓░░░░░░ INT: 8                       ║  │
│                    ║  ▓▓▓▓▓▓▓▓░░ WIS: 16                      ║  │
│  Location:         ║  ▓▓▓▓▓▓░░░░ CHA: 13                      ║  │
│  [The Ruins]       ║                                           ║  │
│                    ║  HP: 45/45  AC: 16  Speed: 30ft          ║  │
│  Concords:         ╚═══════════════════════════════════════════╝  │
│  ┌──┐ ┌──┐ ┌──┐                                                   │
│  │🔮│ │⚔️│ │🛡️│   ┌──────────────────────────┐                   │
│  └──┘ └──┘ └──┘   │  [Sear Concord]          │                   │
│                    │  [Cure Character]         │                   │
│                    └──────────────────────────┘                   │
└────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────┐  ┌────────────────────────────────┐
│ ╔══════════════════════════╗ │  │ ╔════════════════════════════╗ │
│ ║  BACKGROUND STORY        ║ │  │ ║  EQUIPMENT                 ║ │
│ ╠══════════════════════════╣ │  │ ╠════════════════════════════╣ │
│ ║                          ║ │  │ ║  Weapon: Longsword +1      ║ │
│ ║  [Editable Text Area]    ║ │  │ ║  Armor: Chain Mail         ║ │
│ ║                          ║ │  │ ║  Shield: Steel Shield      ║ │
│ ║  Born in the village of  ║ │  │ ║                            ║ │
│ ║  Thornhaven, this        ║ │  │ ║  Items:                    ║ │
│ ║  character faced many    ║ │  │ ║  - Healing Potion x3       ║ │
│ ║  trials before setting   ║ │  │ ║  - Rope (50ft)             ║ │
│ ║  out on their adventure. ║ │  │ ║  - Torch x5                ║ │
│ ║                          ║ │  │ ║  - Rations x10             ║ │
│ ║  [Edit Mode: Formik]     ║ │  │ ║                            ║ │
│ ║                          ║ │  │ ║  Gold: 245 gp              ║ │
│ ║                          ║ │  │ ╚════════════════════════════╝ │
│ ╚══════════════════════════╝ │  │                                │
└──────────────────────────────┘  └────────────────────────────────┘
```

### Features

**Components:**
- `SheetMenuBar` (features/characters): Navigation and actions
- `SheetTitleAndAttributes` (features/characters): Character header, stats, level, XP
- `SheetBackgroundStory` (features/characters): Editable story field
- `SheetEquipment` (features/characters): Inventory and items
- `SheetInteractiveMap` (features/characters): Map location (currently disabled)

**Functionality:**
- **Edit Mode:** Toggle editing with Formik form management
- **Character Stats:**
  - STR, DEX, CON, INT, WIS, CHA attributes
  - HP, AC, Speed
  - Level and Experience Points
- **Background Story:**
  - Editable text area
  - Persists to Firestore via `/api/characters/[tokenId]`
- **Equipment Display:**
  - Weapons, armor, items
  - Based on character class and rolls
- **Concord Integration:**
  - Display owned concords (special items/powers)
  - Searing action (burn concord for permanent effect)
- **Character Actions:**
  - Roll new character (client-side re-roll)
  - Save character (persist to API)
  - Cure character (remove infection via smart contract)
- **Animated View:** Link to `/characters/[tokenId]/animated` page
- **Server-Side Rendering:** Pre-loads character data and concord searing maps

**API Integration:**
- `tokenQuery` (features/characters/api/token-query): Fetches character from Firestore
- `POST /api/characters/[tokenId]`: Saves character sheet
- `POST /api/characters/cure/[tokenId]`: Cures infection
- `POST /api/characters/sear/[tokenId]`: Sears concord

---

## 5. GATHER PAGE (`/gather`) - Chat

### Wireframe

```
┌────────────────────────────────────────────────────────────────────┐
│                          MENU BAR                                  │
│  [About] [Characters] [Gather] [MORE]    [Dark Mode] [Connect]    │
└────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────┬──────────────────────────────┐
│ ┌─────────────────────────────────┐ │  PRESENT CHARACTERS          │
│ │ 📍 Channel: The Ruins           │ │                              │
│ │ Selected: Character #123        │ │  👤 Character #123 (You)     │
│ │ [Show Users →]                  │ │  ├─ Level 5 Warrior          │
│ └─────────────────────────────────┘ │  └─ Online                   │
│                                     │                              │
│ ┌─────────────────────────────────┐ │  👤 Character #456           │
│ │ CHAT MESSAGES                   │ │  ├─ Level 3 Mage             │
│ │                                 │ │  └─ Online                   │
│ │ [Avatar] Character #456         │ │                              │
│ │ 10:23 AM                        │ │  👤 Character #789           │
│ │ Hello travelers! Anyone seen    │ │  ├─ Level 7 Rogue            │
│ │ the cursed artifact?            │ │  └─ Away                     │
│ │                                 │ │                              │
│ │ [Avatar] Character #123 (You)   │ │  👤 Character #012           │
│ │ 10:24 AM                        │ │  ├─ Level 2 Cleric           │
│ │ Not yet, still searching the    │ │  └─ Online                   │
│ │ northern ruins.                 │ │                              │
│ │                                 │ │                              │
│ │ [Avatar] Character #789         │ │  [Mobile: Tap to expand]     │
│ │ 10:25 AM                        │ │                              │
│ │ Be careful! The infected roam   │ │                              │
│ │ those areas at night.           │ │                              │
│ │                                 │ │                              │
│ │ [Scrollable Area]               │ │                              │
│ │                                 │ │                              │
│ └─────────────────────────────────┘ │                              │
│                                     │                              │
│ ┌─────────────────────────────────┐ │                              │
│ │ [Type a message...]        [📤] │ │                              │
│ └─────────────────────────────────┘ │                              │
└─────────────────────────────────────┴──────────────────────────────┘
```

### Features

**Components:**
- `MenuBar` (src/components/MenuBar.tsx:22): Top navigation
- `ChannelSelector` (features/chat): Location/channel picker
- `ChatMessages` (features/chat): Scrollable message feed
- `ChatFooter` (features/chat): Message input and send
- `ChatUsers` (features/chat): Online users list
- `DialogMask` (components/DialogMask): Mobile modal overlay

**Functionality:**
- **Location-Based Channels:**
  - Chat channels based on character location
  - Automatically selects channel from selected character
  - Default channel if no character selected
- **Real-Time Messaging:**
  - Firebase Realtime Database
  - Live message updates
  - User presence tracking
- **User Management:**
  - Display online/away status
  - Show character details (name, level, class)
  - Character token ID selection
- **Mobile Optimization:**
  - Collapsible user panel
  - Expandable via tap interaction
  - Dialog mask for full-screen user list
- **Features:**
  - Message timestamps
  - Character avatars
  - Auto-scroll to latest
  - Disable body scroll when chat active
- **Session Management:**
  - `useCurrentUser` hook tracks current user
  - `useCharacterLocation` hook fetches character location
  - Channel path: `chat/locations/{locationId}`

**API Integration:**
- Firebase Realtime Database for messages
- Firestore for character data
- `/api/auth/me` for session validation

---

## 6. LORE PAGE (`/lore`) - Tweet Feed

### Wireframe

```
┌────────────────────────────────────────────────────────────────────┐
│                          MENU BAR                                  │
│  [About] [Characters] [Gather] [MORE]    [Dark Mode] [Connect]    │
└────────────────────────────────────────────────────────────────────┘

                    ┏━━━━━━━━━━━━━━━━━━━━┓
                    ┃   OFFICIAL LORE    ┃
                    ┗━━━━━━━━━━━━━━━━━━━━┛

┌────────────────────────────────────────────────────────────────────┐
│ FILTER BAR                                                         │
│                                                                    │
│  [All] [Text] [Video]       [Sort ▲▼]      [Translate: OFF]      │
└────────────────────────────────────────────────────────────────────┘

        ┌────────────────────────────────────────────┐
        │  @WAGDIE_ETH                  [Twitter]    │
        │  ──────────────────────────────────────    │
        │                                            │
        │  The pilgrims gather at the crossroads,   │
        │  whispers of the Headless spreading       │
        │  through the camp. Some speak of          │
        │  salvation, others of doom.               │
        │                                            │
        │  [Embedded Video Player]                  │
        │  ┌──────────────────────────────────┐     │
        │  │  ▶️ Dark Fantasy Cinematic       │     │
        │  │  Voice Acting: Professional      │     │
        │  └──────────────────────────────────┘     │
        │                                            │
        │  📅 Jan 15, 2024  💬 45  🔁 23  ❤️ 156  │
        └────────────────────────────────────────────┘

        ┌────────────────────────────────────────────┐
        │  @WAGDIE_ETH                  [Twitter]    │
        │  ──────────────────────────────────────    │
        │                                            │
        │  A new threat emerges from the depths.    │
        │  The infected grow stronger with each     │
        │  passing moon.                             │
        │                                            │
        │  [Pixel Art Image]                        │
        │                                            │
        │  📅 Jan 14, 2024  💬 32  🔁 18  ❤️ 124  │
        └────────────────────────────────────────────┘

        ┌────────────────────────────────────────────┐
        │  @WAGDIE_ETH                  [Twitter]    │
        │  ──────────────────────────────────────    │
        │                                            │
        │  🎭 The play begins...                    │
        │                                            │
        │  Tonight, the fate of the realm hangs     │
        │  in the balance. Choose wisely.           │
        │                                            │
        │  [Poll or Interactive Element]            │
        │                                            │
        │  📅 Jan 13, 2024  💬 67  🔁 34  ❤️ 289  │
        └────────────────────────────────────────────┘

                     [🔄 Loading more...]

        [Infinite Scroll - Auto-loads on scroll]
```

### Features

**Components:**
- `MenuBar` (src/components/MenuBar.tsx:22): Top navigation
- `BannerHeader` (components/BannerHeader): "Official Lore" title
- `TweetFilterBar` (features/tweets): Filter and sort controls
- `CustomTweet` (features/tweets): Enhanced tweet cards
- `InfiniteScroll` (react-infinite-scroller): Pagination

**Functionality:**
- **Tweet Filtering:**
  - All tweets
  - Text-only (no media)
  - Video tweets
- **Sorting:**
  - Ascending (oldest first)
  - Descending (newest first)
- **Translation Toggle:**
  - Enable/disable text translation
  - For dark fantasy text/runes
- **Infinite Scroll:**
  - Loads 25 tweets per page
  - Auto-fetches on scroll
  - Pagination via timestamps
- **Tweet Features:**
  - Embedded videos with react-player
  - Images and media
  - Twitter metadata (date, engagement)
  - Professional voice acting in videos
  - Pixel art illustrations
- **Auto-Refresh:** Polls server every 20 seconds for new tweets
- **Filters RTs and Replies:** Hides retweets and @mentions

**API Integration:**
- `GET /api/tweets?sort=desc&perPage=25&startAt={timestamp}`
- React Query for caching and real-time updates
- Firestore backend

**URL State:** Filter selection persisted in `?tab=video`

---

## 7. SPREAD PAGE (`/spread`) - Infection Mechanics

### Wireframe

```
┌────────────────────────────────────────────────────────────────────┐
│                          MENU BAR                                  │
│  [About] [Characters] [Gather] [MORE]    [Dark Mode] [Connect]    │
└────────────────────────────────────────────────────────────────────┘

                    ┏━━━━━━━━━━━━━━━━━━━━┓
                    ┃      SPREAD        ┃
                    ┗━━━━━━━━━━━━━━━━━━━━┛

┌────────────────────────────────────────────────────────────────────┐
│                     CORPSE INTERACTION                             │
│                                                                    │
│            [Touch Corpse]  [Select: 1 ▼] Corpses Owned           │
│                                                                    │
│  Touch... the spore... The Headless calls...                      │
│  Be wary, your corpse will be destroyed.                          │
│                                                                    │
│                  ┌─────────────────────┐                          │
│                  │                     │                          │
│                  │   [Mysterious      │                          │
│                  │    Corpse Image]    │                          │
│                  │                     │                          │
│                  │    Pixel Art        │                          │
│                  │    600x600          │                          │
│                  │                     │                          │
│                  └─────────────────────┘                          │
│                                                                    │
│  [When processing: Animated Video Plays]                          │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│                   DISCOVERED MUSHROOMS                             │
│                                                                    │
│  Discovered:  [🍄 x3]  [🍄 x5]  [🍄 x2]                          │
│                                                                    │
│               ◉ Spread    ○ Infect                                │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  How many spores do you want to spread pilgrim?           │   │
│  │                                                            │   │
│  │     [Release Spores]  [Select: 1-10 ▼] Shrooms           │   │
│  │                                                            │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  OR: Who do you wish to infect pilgrim?                   │   │
│  │  Sacrifice 0.0025 ether                                    │   │
│  │                                                            │   │
│  │     [WAGDIE ID: _____]  [Infect Pilgrim]                  │   │
│  │                                                            │   │
│  └────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────┘
```

### Features

**Components:**
- `MenuBar` (src/components/MenuBar.tsx:22): Top navigation
- `BannerHeader` (components/BannerHeader): "Spread" title
- `DialogSpreadingApproval` (features/characters): ERC1155 approval modal
- `DialogBurnCorpseApproval` (features/characters): Corpse burn approval
- `DialogMask` (components/DialogMask): Modal overlays
- `SpreadInfect` (inline component in spread.tsx:23): Infection interface

**Functionality:**

### Phase 1: Touch Corpse
- **Burn Corpse Mechanic:**
  - Display owned corpses (ERC1155 token ID 1)
  - Select quantity to burn (1-N)
  - Requires ERC1155 approval for Shroom contract
  - Calls `shroomContract.burnCorpse(amount)`
  - Plays animated video during transaction
  - Reveals "Stench of the Spore" image on success
  - Awards Strange Mushrooms (Concord #15)

### Phase 2: Spread or Infect
- **Spread Spores (Option 1):**
  - Use owned mushrooms (Concord #15)
  - Select quantity (1 to owned amount)
  - Calls `spreadContract.spreadInfections(amount)`
  - Randomly infects characters in the game

- **Infect Specific Character (Option 2):**
  - Input target WAGDIE token ID (1-6666)
  - Pay infection price (0.0025 ETH via smart contract)
  - Calls `spreadContract.infectWagdie(tokenId)`
  - Directly infects chosen character

**Smart Contract Integration:**
- `corpseContract`: ERC1155 (Corpse tokens)
  - `balanceOf(address, tokenId)`: Check corpse ownership
  - `isApprovedForAll()`: Check approval status
- `shroomContract`: Burn corpses for mushrooms
  - `burnCorpse(amount)`: Burns corpses, mints mushrooms
- `spreadContract`: Infection mechanics
  - `spreadInfections(amount)`: Random infection spread
  - `infectWagdie(tokenId)`: Targeted infection
  - `infectionPrice()`: Get current infection cost

**Wagmi Hooks Used:**
- `useContractReads`: Read contract state
- `usePrepareContractWrite`: Prepare transaction
- `useContractWrite`: Execute transaction
- `useWaitForTransaction`: Monitor transaction status
- `useAccount`: Get connected wallet

**UX Flow:**
1. Connect wallet
2. Own corpses (from previous game events)
3. Approve corpse contract → shroom contract
4. Burn corpses → receive mushrooms
5. Choose spread method:
   - Random spread (use mushrooms)
   - Targeted infect (pay ETH)
6. Transaction confirmation
7. Page reload on success

---

## 8. MENU DRAWER (Modal)

### Wireframe

```
┌────────────────────────────────────────────────────────────────────┐
│                         [✕ Close]                                  │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                        MENU                                  │ │
│  │                                                              │ │
│  │  🏠  About / Home                                           │ │
│  │  💀  Characters                                             │ │
│  │  🗨️   Gather (Chat)                                         │ │
│  │  📜  Lore (Twitter Feed)                                    │ │
│  │  🍄  Spread (Infection)                                     │ │
│  │                                                              │ │
│  │  ──────────────────────────────────────────                 │ │
│  │                                                              │ │
│  │  🐦  Twitter (@WAGDIE_ETH)                                  │ │
│  │  💬  Discord                                                │ │
│  │  🏛️   Conclave (Forum)                                      │ │
│  │  📚  Wiki                                                    │ │
│  │  🖼️   OpenSea (Marketplace)                                 │ │
│  │  🗳️   Snapshot (Governance)                                 │ │
│  │                                                              │ │
│  │  ──────────────────────────────────────────                 │ │
│  │                                                              │ │
│  │  🎮  You Will Not Survive (Game)                           │ │
│  │  🏰  King Offling Funeral                                   │ │
│  │                                                              │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  [🌙 Dark Mode Toggle]                                            │
│                                                                    │
│  [Connect Wallet / 0x1234...5678]                                 │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Features

**Component:**
- `MenuDrawer` (components/MenuDrawer): Full-screen modal menu

**Functionality:**
- Accessible from "MORE" button in MenuBar
- Full navigation links (internal and external)
- Dark mode toggle
- Connect wallet button
- Disables body scroll when open
- Closes on backdrop click
- Mobile-optimized (full screen on mobile)

---

## SHARED COMPONENTS

### MenuBar (Global Header)
**Location:** src/components/MenuBar.tsx:22
**Features:**
- About (bird skull icon) → `/`
- Characters (skull icon) → `/characters`
- Gather (chat icon) → `/gather`
- MORE button → Opens MenuDrawer
- Scroll to top (click anywhere on bar)
- Dark mode toggle
- Connect Wallet button (MenuBarConnectButton)
- Hover zoom effects
- Responsive (hides icons on mobile, shows "MENU")
- Tooltips on all icons

### Connect Wallet Flow
**Components:**
- `MenuBarConnectButton` (components/MenuBarConnectButton)
- `ConnectionDialog` (features/siwe)

**Functionality:**
1. Click "Connect Wallet"
2. Modal shows wallet options (MetaMask, WalletConnect, Coinbase)
3. Select wallet → wagmi connection
4. Sign SIWE message
5. API validates signature
6. Session created (iron-session)
7. Button shows truncated address "0x1234...5678"

### Theme & Styling
**Location:** src/ui/theme.ts
**Features:**
- Dark theme default
- Custom Fraktur fonts:
  - Eskapade Fraktur (primary)
  - UnifrakturMaguntia (fallback)
- Chakra UI components
- Emotion for CSS-in-JS
- Pixel art aesthetic
- Dark fantasy color palette

---

## API ROUTES SUMMARY

### Authentication
- `POST /api/auth/nonce` - Get SIWE nonce
- `POST /api/auth/verify` - Verify SIWE signature
- `POST /api/auth/me` - Get session
- `POST /api/auth/logout` - Logout

### Characters
- `GET /api/characters` - List with filters
- `GET /api/characters/[tokenId]` - Single character
- `POST /api/characters/[tokenId]` - Update character
- `GET /api/characters/metadata/[tokenId]` - ERC721 metadata
- `POST /api/characters/cure/[tokenId]` - Cure infection
- `POST /api/characters/sear/[tokenId]` - Sear concord

### Tweets
- `GET /api/tweets?sort=desc&perPage=25&startAt={timestamp}` - Paginated feed

### Jobs (Background Tasks)
- `POST /api/jobs/sync-tokens` - Sync token data
- `POST /api/jobs/sync-tweets` - Sync tweets
- `POST /api/jobs/backup-firestore` - Backup DB
- `POST /api/jobs/refresh-os-metadata` - Refresh metadata

---

## TECHNOLOGY STACK SUMMARY

**Frontend:**
- Next.js 13 (Pages Router)
- React 18
- TypeScript
- Chakra UI v2
- Emotion (CSS-in-JS)
- Formik (forms)
- Framer Motion (animations)

**Web3:**
- wagmi v0.6.4 (wallet connection)
- ethers.js (contract interaction)
- SIWE (Sign-In With Ethereum)
- Alchemy SDK

**State & Data:**
- TanStack React Query v4 (data fetching)
- Firebase Realtime Database (chat)
- Firestore (character data)
- iron-session (session management)

**Backend:**
- Next.js API routes
- GraphQL (via graphql-request)
- Sentry (error tracking)

---

## KEY USER FLOWS

### 1. View Characters
```
Home → Characters → Character Grid → Click Card → Character Sheet
```

### 2. Chat in Game
```
Connect Wallet → Gather → Select Character → Join Location Chat → Send Messages
```

### 3. Spread Infection
```
Connect Wallet → Spread → Touch Corpse → Receive Mushrooms →
Choose: Spread Random OR Infect Specific → Approve → Confirm Transaction
```

### 4. Follow Story
```
Home → Lore → Filter (All/Text/Video) → Scroll Feed → Click External Links
```

### 5. Edit Character
```
Characters → Select Character → Character Sheet → Edit Button →
Modify Background/Stats → Save → Persisted to API
```

---

## DEPLOYMENT NOTES

**Build Config:**
- Output: `dist/` directory
- SWC minification enabled
- Sentry source maps (hidden)
- External directory support for monorepo

**Environment:**
- Ethereum Mainnet (primary)
- Goerli Testnet (testing)

**Analytics:**
- Sentry error tracking
- Test route: `/sentry_sample_error`

---

**Document Generated:** 2024
**Framework:** Next.js
**Application Type:** Web3 Interactive Story/Game Platform
