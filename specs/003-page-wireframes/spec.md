# Feature Specification: Page Wireframes Implementation

**Feature Branch**: `003-page-wireframes`
**Created**: 2025-10-28
**Status**: Draft
**Input**: User description: "build out all page wireframes based off PAGE_WIREFRAMES.md"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Home Page Landing Experience (Priority: P1)

Users visit the WAGDIE website to discover what the game is about, view introductory content, and understand how to get started. The home page serves as the primary entry point to the application.

**Why this priority**: This is the most critical page as it's the first impression for all users and must effectively communicate the game's value proposition and guide users to next steps.

**Independent Test**: Can be fully tested by navigating to the root URL and verifying all content sections display correctly, the intro video plays, and navigation links work.

**Acceptance Scenarios**:

1. **Given** a user visits the home page, **When** the page loads, **Then** the WAGDIE logo, menu bar, and intro video preview are displayed
2. **Given** a user is on the home page, **When** they click the intro video preview, **Then** the video plays
3. **Given** a user is on the home page, **When** they scroll down, **Then** they see three content sections: "An Evolving Story", "With Rich, Interactive Elements", and "Co-Created By You"
4. **Given** a user is on the home page, **When** they reach the bottom, **Then** they see call-to-action cards for "Join Discord" and "Get In Character"
5. **Given** a user clicks any navigation link, **When** the link is clicked, **Then** they are directed to the appropriate page (internal or external)

---

### User Story 2 - Browse and Filter Character Collection (Priority: P1)

Users want to view all characters in the WAGDIE collection, filter by ownership status, infection state, and staking location. This allows users to explore the character universe and find specific characters.

**Why this priority**: Character browsing is core to the game experience, allowing users to view the collection and their owned characters.

**Independent Test**: Can be fully tested by navigating to /characters and verifying the grid displays, filters work correctly, and clicking a character card navigates to the detail page.

**Acceptance Scenarios**:

1. **Given** a user visits the characters page, **When** the page loads, **Then** a grid of character cards is displayed with token IDs and status badges
2. **Given** a user is on the characters page, **When** they click the "Owned" filter, **Then** only characters owned by their connected wallet are displayed
3. **Given** a user is on the characters page, **When** they click the "Infected" filter, **Then** only infected characters are displayed
4. **Given** a user is on the characters page, **When** they click the "Staked" filter, **Then** only staked characters are displayed
5. **Given** a user is on the characters page, **When** they toggle the sort order, **Then** characters are sorted ascending or descending by token ID
6. **Given** a user is viewing filtered characters, **When** they scroll to the bottom, **Then** additional characters load automatically
7. **Given** a user clicks a character card, **When** the click occurs, **Then** they navigate to the character detail page

---

### User Story 3 - View and Edit Character Details (Priority: P1)

Users want to view detailed information about a specific character including stats, equipment, background story, and concords. Character owners should be able to edit the background story and perform character actions.

**Why this priority**: Character sheets are essential for player engagement and character customization.

**Independent Test**: Can be fully tested by navigating to /characters/[tokenId] and verifying all character information displays, edit mode works for owners, and character actions are available.

**Acceptance Scenarios**:

1. **Given** a user visits a character detail page, **When** the page loads, **Then** the character image, name, level, stats (STR, DEX, CON, INT, WIS, CHA), HP, AC, and Speed are displayed
2. **Given** a user views a character sheet, **When** they scroll down, **Then** they see the background story section and equipment section
3. **Given** a character owner views their character, **When** they click the "Edit" button, **Then** the background story becomes editable
4. **Given** a character owner edits the background story, **When** they click "Save", **Then** the changes are persisted and a success message is shown
5. **Given** a character owner views their character, **When** they click "Roll New Character", **Then** new stats are generated and displayed
6. **Given** a character owner views their infected character, **When** they click "Cure Character", **Then** a transaction is initiated to remove the infection
7. **Given** a character owner with concords views their character, **When** they click "Sear Concord", **Then** they can select a concord to burn for permanent effects
8. **Given** any user views a character, **When** they click "Animated View", **Then** they navigate to the animated character page

---

### User Story 4 - Participate in Location-Based Chat (Priority: P2)

Users want to communicate with other players in real-time based on their character's location. This enables community interaction and role-playing within the game world.

**Why this priority**: Chat functionality enhances community engagement but is secondary to viewing characters and content.

**Independent Test**: Can be fully tested by connecting a wallet, selecting a character, navigating to /gather, and sending messages that appear for other users in the same location.

**Acceptance Scenarios**:

1. **Given** a user connects their wallet and selects a character, **When** they visit the gather page, **Then** they see the chat interface for their character's location
2. **Given** a user is in a location chat, **When** they type a message and click send, **Then** the message appears in the chat feed with their character avatar and timestamp
3. **Given** multiple users are in the same location chat, **When** one user sends a message, **Then** all other users see the message in real-time
4. **Given** a user is viewing the chat, **When** new messages arrive, **Then** the chat automatically scrolls to show the latest messages
5. **Given** a user is in a chat channel, **When** they view the users panel, **Then** they see all online characters in that location with their level and class
6. **Given** a mobile user opens the chat, **When** they tap the user list icon, **Then** the user list expands in a modal overlay

---

### User Story 5 - Follow Official Story via Tweet Feed (Priority: P2)

Users want to follow the unfolding narrative of WAGDIE through curated official tweets that include text, images, videos, and interactive elements.

**Why this priority**: The lore feed is important for engaged players but not critical for initial exploration.

**Independent Test**: Can be fully tested by navigating to /lore and verifying tweets display with media, filters work, and infinite scroll loads more content.

**Acceptance Scenarios**:

1. **Given** a user visits the lore page, **When** the page loads, **Then** a feed of official WAGDIE tweets is displayed with text, images, and videos
2. **Given** a user is viewing the lore feed, **When** they click the "Video" filter, **Then** only tweets containing videos are displayed
3. **Given** a user is viewing the lore feed, **When** they click the "Text" filter, **Then** only text-based tweets without media are displayed
4. **Given** a user is viewing the lore feed, **When** they toggle the sort order, **Then** tweets are sorted oldest-first or newest-first
5. **Given** a user is viewing the lore feed, **When** they scroll to the bottom, **Then** additional tweets are loaded automatically
6. **Given** a user clicks a video tweet, **When** they click the play button, **Then** the video plays inline
7. **Given** a user enables translation, **When** they toggle it on, **Then** dark fantasy text/runes are translated to readable text

---

### User Story 6 - Spread Infection via Game Mechanics (Priority: P3)

Users with corpse tokens want to participate in the infection mechanics by burning corpses to receive mushrooms, then either spreading infections randomly or targeting specific characters.

**Why this priority**: This is an advanced game mechanic for engaged players who already own specific tokens.

**Independent Test**: Can be fully tested by connecting a wallet with corpse tokens, navigating to /spread, and completing the burn/spread workflow with transaction confirmations.

**Acceptance Scenarios**:

1. **Given** a user with corpse tokens visits the spread page, **When** the page loads, **Then** they see the number of corpses they own
2. **Given** a user with corpse tokens is on the spread page, **When** they click "Touch Corpse" and select a quantity, **Then** they are prompted to approve the transaction
3. **Given** a user approves the corpse burn transaction, **When** the transaction completes, **Then** they receive Strange Mushroom concords and see a success animation
4. **Given** a user owns mushrooms, **When** they select "Release Spores" and choose a quantity, **Then** a transaction is initiated to spread random infections
5. **Given** a user owns mushrooms, **When** they enter a specific WAGDIE token ID and click "Infect Pilgrim", **Then** a transaction is initiated to infect that specific character with a 0.0025 ETH cost
6. **Given** a user completes any infection transaction, **When** it succeeds, **Then** the page updates to reflect the new state

---

### User Story 7 - Authenticate with Ethereum Wallet (Priority: P1)

Users need to connect their Web3 wallet to access authenticated features like chat, character editing, and infection mechanics.

**Why this priority**: Wallet connection is foundational for all authenticated interactions in the application.

**Independent Test**: Can be fully tested by clicking "Connect Wallet", selecting a wallet provider, signing the SIWE message, and verifying the session is established.

**Acceptance Scenarios**:

1. **Given** a user visits any page, **When** they click "Connect Wallet", **Then** a modal appears with wallet options (MetaMask, WalletConnect, Coinbase Wallet)
2. **Given** the wallet connection modal is open, **When** the user selects a wallet provider, **Then** the wallet extension/app prompts for connection approval
3. **Given** the wallet is connected, **When** the user approves the connection, **Then** they are prompted to sign a SIWE message
4. **Given** the user signs the SIWE message, **When** the signature is verified, **Then** a session is created and the wallet address is displayed in the menu bar
5. **Given** a user has an active session, **When** they return to the site, **Then** their wallet remains connected

---

### User Story 8 - Navigate Site via Menu System (Priority: P1)

Users need to navigate between different sections of the application using a consistent menu bar and expanded menu drawer.

**Why this priority**: Navigation is fundamental to the user experience and must work on all pages.

**Independent Test**: Can be fully tested by clicking each menu item and verifying navigation to the correct pages, plus testing mobile responsiveness.

**Acceptance Scenarios**:

1. **Given** a user is on any page, **When** they view the top of the page, **Then** they see a menu bar with About, Characters, Gather, and MORE buttons
2. **Given** a user clicks "About", **When** the click occurs, **Then** they navigate to the home page
3. **Given** a user clicks "Characters", **When** the click occurs, **Then** they navigate to the characters page
4. **Given** a user clicks "Gather", **When** the click occurs, **Then** they navigate to the gather/chat page
5. **Given** a user clicks "MORE", **When** the click occurs, **Then** a full-screen menu drawer opens showing all navigation options and external links
6. **Given** the menu drawer is open, **When** the user clicks a navigation item, **Then** they navigate to that destination and the drawer closes
7. **Given** the menu drawer is open, **When** the user clicks the backdrop or close button, **Then** the drawer closes
8. **Given** a user clicks anywhere on the menu bar, **When** the click occurs, **Then** the page scrolls to the top
9. **Given** a mobile user views the menu bar, **When** the page loads, **Then** icons are replaced with text labels for better mobile UX

---

### Edge Cases

- What happens when a user tries to access /gather without connecting their wallet?
- What happens when a user tries to edit a character they don't own?
- How does the system handle network errors during transaction signing?
- What happens when a user's wallet connection is lost during an active session?
- How does the chat handle messages sent while offline?
- What happens when a user tries to filter characters but owns none?
- How does infinite scroll handle the end of available content?
- What happens when a user tries to burn corpses they don't own?
- How does the system handle video playback failures in the lore feed?
- What happens when a character sheet has missing or invalid data?

## Requirements *(mandatory)*

### Functional Requirements

#### Home Page
- **FR-001**: System MUST display a menu bar with navigation links (About, Characters, Gather, MORE) and a Connect Wallet button
- **FR-002**: System MUST display the WAGDIE logo and tagline on the home page
- **FR-003**: System MUST display an intro video player with a pixel art preview image
- **FR-004**: System MUST display three content sections: "An Evolving Story", "With Rich, Interactive Elements", and "Co-Created By You" with descriptive cards
- **FR-005**: System MUST display call-to-action cards for "Join Discord" and "Get In Character" at the bottom
- **FR-006**: System MUST support responsive layouts for mobile and desktop viewports

#### Characters Page
- **FR-007**: System MUST display a grid of character cards showing token ID, image, and status badges
- **FR-008**: System MUST provide filter options: All, Owned, Infected, Cured, Staked
- **FR-009**: System MUST allow users to filter characters by a specific wallet address via query parameter
- **FR-010**: System MUST provide ascending/descending sort by token ID
- **FR-011**: System MUST implement infinite scroll to load additional characters
- **FR-012**: System MUST display status badges indicating infection, cure, and staking states
- **FR-013**: System MUST navigate to character detail page when a card is clicked

#### Character Detail Page
- **FR-014**: System MUST display character image, name, token ID, level, and experience points
- **FR-015**: System MUST display attribute bars for STR, DEX, CON, INT, WIS, CHA with visual indicators
- **FR-016**: System MUST display HP, AC, and Speed stats
- **FR-017**: System MUST display character location and owned concords
- **FR-018**: System MUST display background story in a readable text area
- **FR-019**: System MUST display equipment including weapons, armor, items, and gold
- **FR-020**: System MUST allow character owners to toggle edit mode for the background story
- **FR-021**: System MUST persist background story changes to the database when saved
- **FR-022**: System MUST provide a "Roll New Character" action that generates new stats
- **FR-023**: System MUST provide a "Cure Character" action for infected characters that initiates a blockchain transaction
- **FR-024**: System MUST provide a "Sear Concord" action that allows burning concords for permanent effects
- **FR-025**: System MUST link to an animated character view page

#### Gather (Chat) Page
- **FR-026**: System MUST display a chat interface with message feed and input field
- **FR-027**: System MUST organize chat into location-based channels determined by character location
- **FR-028**: System MUST display messages in real-time from all users in the same location
- **FR-029**: System MUST show message timestamps and character avatars
- **FR-030**: System MUST display a list of online users with character name, level, class, and online status
- **FR-031**: System MUST auto-scroll to the latest message when new messages arrive
- **FR-032**: System MUST allow users to send messages when a character is selected
- **FR-033**: System MUST provide a collapsible user panel for mobile devices
- **FR-034**: System MUST require wallet connection and character selection to participate in chat

#### Lore (Tweet Feed) Page
- **FR-035**: System MUST display a feed of official WAGDIE tweets from @WAGDIE_ETH
- **FR-036**: System MUST support embedded video players with play controls
- **FR-037**: System MUST display embedded images and pixel art
- **FR-038**: System MUST show tweet metadata including date, comments, retweets, and likes
- **FR-039**: System MUST provide filter options: All, Text, Video
- **FR-040**: System MUST provide ascending/descending sort by date
- **FR-041**: System MUST provide a translation toggle for dark fantasy text
- **FR-042**: System MUST implement infinite scroll loading 25 tweets per page
- **FR-043**: System MUST poll for new tweets every 20 seconds
- **FR-044**: System MUST filter out retweets and reply tweets

#### Spread (Infection) Page
- **FR-045**: System MUST display the number of corpse tokens owned by the connected wallet
- **FR-046**: System MUST allow users to select a quantity of corpses to burn (1 to owned amount)
- **FR-047**: System MUST initiate an ERC1155 approval transaction for the corpse contract
- **FR-048**: System MUST initiate a burn transaction that destroys corpses and mints Strange Mushroom concords
- **FR-049**: System MUST play an animated video during the burn transaction processing
- **FR-050**: System MUST display success imagery after successful corpse burn
- **FR-051**: System MUST display the number of Strange Mushroom concords owned
- **FR-052**: System MUST provide a "Release Spores" option that spreads random infections using mushrooms
- **FR-053**: System MUST provide an "Infect Pilgrim" option that targets a specific WAGDIE token ID
- **FR-054**: System MUST display the infection price (0.0025 ETH) for targeted infections
- **FR-055**: System MUST validate that the target token ID is within valid range (1-6666)
- **FR-056**: System MUST reload the page after successful infection transactions

#### Authentication
- **FR-057**: System MUST provide wallet connection via MetaMask, WalletConnect, and Coinbase Wallet
- **FR-058**: System MUST implement Sign-In With Ethereum (SIWE) authentication flow
- **FR-059**: System MUST generate a unique nonce for each authentication attempt
- **FR-060**: System MUST verify signed SIWE messages via backend API
- **FR-061**: System MUST create a secure session using iron-session after successful authentication
- **FR-062**: System MUST display truncated wallet address (0x1234...5678) in menu bar when connected
- **FR-063**: System MUST persist wallet connection across page refreshes using browser storage

#### Navigation
- **FR-064**: System MUST provide a menu bar visible on all pages with consistent navigation
- **FR-065**: System MUST provide a menu drawer accessible via the "MORE" button
- **FR-066**: System MUST display all internal and external links in the menu drawer
- **FR-067**: System MUST include dark mode toggle in the menu bar and menu drawer
- **FR-068**: System MUST scroll to top when user clicks on the menu bar
- **FR-069**: System MUST disable body scroll when menu drawer is open
- **FR-070**: System MUST close menu drawer when backdrop is clicked or navigation occurs
- **FR-071**: System MUST display tooltips on menu bar icons
- **FR-072**: System MUST adapt menu bar for mobile devices by showing text labels instead of icons

### Key Entities

- **Character**: Represents a WAGDIE NFT with attributes including token ID, name, class, level, experience, stats (STR, DEX, CON, INT, WIS, CHA), HP, AC, Speed, background story, equipment, location, infection status, and staking status
- **Concord**: Special items/powers owned by characters that can be displayed or seared (burned) for permanent effects, identified by concord ID
- **Tweet**: Official lore content from @WAGDIE_ETH including text content, media (images, videos), timestamp, and engagement metrics
- **ChatMessage**: User messages in location-based chat including sender character ID, text content, timestamp, and location/channel
- **User**: Connected wallet with Ethereum address, owned characters, owned corpses, owned mushrooms, and authentication session
- **Location**: In-game location where characters can be present and chat channels are organized
- **Corpse**: ERC1155 token (token ID 1) that can be burned to receive Strange Mushrooms
- **Strange Mushroom**: Concord #15 received from burning corpses, used for spreading infections

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can navigate from home page to character detail page in under 5 clicks
- **SC-002**: Character grid displays and filters update within 2 seconds of user interaction
- **SC-003**: Chat messages appear for all users in the same location within 1 second of sending
- **SC-004**: Infinite scroll on characters and lore pages loads next batch within 3 seconds
- **SC-005**: Wallet connection and SIWE authentication completes within 30 seconds for users with wallets installed
- **SC-006**: Video content on home page and lore page plays without buffering on standard broadband connections
- **SC-007**: Character sheet data loads and displays within 2 seconds on page navigation
- **SC-008**: Blockchain transactions (cure, sear, spread, infect) provide clear status updates and complete within 60 seconds on average network conditions
- **SC-009**: Page layouts adapt responsively to mobile, tablet, and desktop viewports without horizontal scrolling
- **SC-010**: 90% of users successfully complete wallet connection on first attempt
- **SC-011**: Users can find and view specific characters using filters within 3 actions
- **SC-012**: Menu navigation works consistently across all pages with no broken links
