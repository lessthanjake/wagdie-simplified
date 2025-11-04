---

description: "Task list for Native Map Integration - Replace iframe with Leaflet implementation"
---

# Tasks: Native Map Integration

**Input**: Design documents from `/specs/007-native-map-integration/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**User Stories**:
- US1: Native Map Display (P1) - Replace iframe with Leaflet
- US2: Interactive Markers (P2) - Markers with tooltips and popups
- US3: Layer Controls (P3) - Toggle layers on/off
- US4: Asset Integration (P4) - WAGDIE fonts, icons, branding
- US5: Character Location Display (P5) - Show character positions
- US6: Responsive Design (P6) - Mobile, tablet, desktop support

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependencies, and asset preparation

- [ ] T001 [P] Copy WAGDIE assets from wagdie-map to wagdie-simplified
  - `public/fonts/Wagdie_Fraktur_21.otf`
  - `public/fonts/EskapadeFraktur-Black.ttf`
  - `public/images/wagdiemap.png` (optimize from 9.3MB)
  - `public/images/map-icons/` (all marker icons)
- [ ] T002 Install Leaflet dependencies
  - `npm install leaflet react-leaflet @types/leaflet`
- [ ] T003 [P] Configure Tailwind CSS with WAGDIE fonts
  - Update `tailwind.config.js` fontFamily configuration
- [ ] T004 [P] Import Leaflet CSS in global styles
  - Add `@import 'leaflet/dist/leaflet.css'` to `styles/globals.css`

**Checkpoint**: All dependencies installed and assets ready

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure for map functionality - MUST be complete before any user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 [P] Create TypeScript type definitions in `lib/types/map.ts`
  - `Location` interface with metadata
  - `CharacterLocation` interface
  - `MapMarker`, `LayerVisibility`, `MapBounds` types
- [ ] T006 [P] Implement LocationRepository in `lib/repositories/locationRepository.ts`
  - `getAll()`, `getById()` methods with Supabase
- [ ] T007 [P] Implement CharacterLocationRepository in `lib/repositories/characterLocationRepository.ts`
  - `getByWalletAddress()`, `getConfirmed()`, `getAll()` methods
- [ ] T008 [P] Implement LocationService in `lib/services/map/locationService.ts`
  - `getAvailableLocations()`, business logic
- [ ] T009 [P] Implement CharacterLocationService in `lib/services/map/characterLocationService.ts`
  - `getCharacterLocation()`, `getWalletCharacters()` methods
- [ ] T010 [P] Create custom hooks in `hooks/map/useLocations.ts`
  - React Query integration for location data
- [ ] T011 [P] Create custom hooks in `hooks/map/useCharacterLocations.ts`
  - React Query integration for character position data

**Checkpoint**: Foundation complete - all data access and services ready

---

## Phase 3: User Story 1 - Native Map Display (Priority: P1) 🎯 MVP

**Goal**: Replace iframe with native Leaflet map displaying WAGDIE world image

**Independent Test**: Navigate to `/map` - see native Leaflet map with wagdiemap.png overlay

### Implementation for User Story 1

- [ ] T012 [P] [US1] Create error boundary component in `components/shared/ErrorBoundary.tsx`
- [ ] T013 [P] [US1] Create MapPopup component in `components/map/MapPopup.tsx`
- [ ] T014 [P] [US1] Create MapTooltip component in `components/map/MapTooltip.tsx`
- [ ] T015 [US1] Create MapMarker component in `components/map/MapMarker.tsx`
  - React.memo for performance
  - Custom icons support
  - Tooltip integration
- [ ] T016 [US1] Create LayerControls component in `components/map/LayerControls.tsx`
  - Toggle buttons for each layer type
  - State management for layer visibility
- [ ] T017 [US1] Create main NativeMap component in `components/map/NativeMap.tsx`
  - Dynamic import with SSR disabled
  - MapContainer with wagdiemap.png ImageOverlay
  - Marker rendering based on active layers
  - Event handlers for marker interactions
- [ ] T018 [US1] Update app/map/page.tsx to use NativeMap component
  - Remove iframe implementation
  - Add loading state
  - Add error boundary wrapper

**Checkpoint**: Native map renders without iframe, shows wagdiemap.png background

---

## Phase 4: User Story 2 - Interactive Markers (Priority: P2)

**Goal**: Markers display with hover tooltips and click popups

**Independent Test**: Hover over markers → see tooltips; Click markers → see popups

### Implementation for User Story 2

- [ ] T019 [P] [US2] Integrate tooltips in MapMarker component
  - Hover state handling
  - Tooltip positioning
  - Dynamic content based on marker type
- [ ] T020 [P] [US2] Integrate popups in NativeMap component
  - Click event handlers
  - Popup content rendering
  - Popup state management
- [ ] T021 [US2] Implement location markers in `components/map/LocationMarkers.tsx`
  - Fetch and render location markers from Supabase
  - Layer visibility toggle
  - Location popup content
- [ ] T022 [US2] Implement character markers in `components/map/CharacterMarkers.tsx`
  - Fetch and render character positions
  - Show ownership highlighting
  - Character popup with staking options
- [ ] T023 [US2] Add custom marker icons
  - Location: `icon_location.png`
  - Character: custom icon
  - Configure in NativeMap component

**Checkpoint**: All markers show tooltips on hover and popups on click

---

## Phase 5: User Story 3 - Layer Controls (Priority: P3)

**Goal**: Users can toggle layer visibility (locations, characters, burns, deaths, fights)

**Independent Test**: Click layer toggles → markers appear/disappear

### Implementation for User Story 3

- [ ] T024 [P] [US3] Create useLayerVisibility hook in `hooks/map/useLayerVisibility.ts`
  - State management for active layers
  - Toggle functions
  - Persistence (optional)
- [ ] T025 [P] [US3] Integrate layer state in NativeMap component
  - Pass layer visibility to marker components
  - Conditional rendering based on active layers
- [ ] T026 [US3] Add legend icons to LayerControls
  - Show layer toggle icons from `legendicons/` directory
  - Active/inactive states
  - Hover labels
- [ ] T027 [US3] Implement burn/death/fight marker components (optional for Phase 1)
  - Create components for additional marker types
  - Connect to wagdie.wiki data if available
  - OR stub with sample data for future integration

**Checkpoint**: Layer toggles successfully show/hide marker categories

---

## Phase 6: User Story 4 - Asset Integration (Priority: P4)

**Goal**: WAGDIE fonts, icons, and branding integrated throughout map

**Independent Test**: Inspect map UI → see WAGDIE fonts, consistent iconography

### Implementation for User Story 4

- [ ] T028 [P] [US4] Apply WAGDIE fonts to map UI elements
  - Use 'wagdie' font family in LayerControls component
  - Apply to popup content
  - Apply to tooltip text
- [ ] T029 [P] [US4] Integrate WAGDIE icon set for markers
  - Update MapMarker to use custom icons
  - Apply to layer toggle buttons
  - Ensure consistent styling
- [ ] T030 [US4] Add fire animation to UI (optional)
  - Use `fire.gif` for loading states or interactions
  - Add to character staking workflow
- [ ] T031 [US4] Update app/layout.tsx to include WAGDIE fonts globally
  - Load fonts in document head
  - Ensure font-display: swap for performance

**Checkpoint**: Map interface uses WAGDIE fonts and consistent iconography

---

## Phase 7: User Story 5 - Character Location Display (Priority: P5)

**Goal**: Authenticated users see their characters on map

**Independent Test**: Connect wallet with characters → see character markers at locations

### Implementation for User Story 5

- [ ] T032 [P] [US5] Create useWalletCharacters hook in `hooks/map/useWalletCharacters.ts`
  - Fetch user's character locations
  - Integrate with wallet connection
  - React Query caching
- [ ] T033 [P] [US5] Enhance CharacterMarkers component
  - Filter by user's wallet address
  - Show ownership badge
  - Highlight user's characters differently
- [ ] T034 [US5] Add character list sidebar (optional)
  - Display user's characters with locations
  - Click to focus map on character
  - Show "Enter the Forsaken Lands" for unstaked characters
- [ ] T035 [US5] Integrate with existing authentication
  - Connect to SIWE session
  - Show character list for authenticated users only
  - Prompt to connect wallet if not authenticated

**Checkpoint**: Users see their owned characters on the map

---

## Phase 8: User Story 6 - Responsive Design (Priority: P6)

**Goal**: Map works on mobile, tablet, and desktop

**Independent Test**: Resize browser or view on different devices → map remains functional

### Implementation for User Story 6

- [ ] T036 [P] [US6] Make NativeMap component responsive
  - Set container height: 100vh or calc(100vh - header)
  - Ensure map resizes with viewport
- [ ] T037 [P] [US6] Optimize LayerControls for mobile
  - Stack buttons vertically on small screens
  - Increase touch target sizes
  - Add slide-out drawer for mobile (optional)
- [ ] T038 [P] [US6] Optimize popups for touch
  - Larger touch targets
  - Mobile-friendly popup sizing
  - Close button accessibility
- [ ] T039 [US6] Test on various screen sizes
  - Mobile portrait: 375px width
  - Mobile landscape: 667px width
  - Tablet: 768px width
  - Desktop: 1024px+ width

**Checkpoint**: Map is fully functional on all device sizes

---

## Phase 9: Performance & Polish

**Purpose**: Optimization and final touches

- [ ] T040 [P] Optimize wagdiemap.png for web
  - Compress from 9.3MB to ~3MB
  - Convert to WebP if quality acceptable
- [ ] T041 [P] Add React.memo to all marker components
  - Prevent unnecessary re-renders
  - Optimize with useMemo for expensive calculations
- [ ] T042 [P] Add loading states throughout
  - Map loading spinner
  - Data fetching states
  - Asset loading feedback
- [ ] T043 [P] Implement error handling
  - Handle missing assets
  - API error boundaries
  - Fallback UI states
- [ ] T044 [P] Add marker clustering (if needed)
  - Install react-leaflet-markercluster
  - Cluster markers when >50 displayed
  - Performance testing
- [ ] T045 [P] Create comprehensive tests
  - Unit tests for services and hooks
  - Component tests for map components
  - Integration tests for user flows
- [ ] T046 [P] Update documentation
  - Map feature README in app/map/README.md
  - Inline code comments
  - Architecture decisions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - can start immediately
- **Phase 2 (Foundational)**: Depends on Setup completion - BLOCKS all user stories
- **Phase 3-8 (User Stories)**: All depend on Foundational (Phase 2) completion
  - User stories can proceed in priority order P1 → P2 → P3 → P4 → P5 → P6
  - Or in parallel if team capacity allows
- **Phase 9 (Polish)**: Depends on all user stories being complete

### Within Each User Story

- Tests (if included) → Models/Types → Services/Repos → UI Components → Integration
- Each user story must be independently testable before proceeding
- Verify requirements from spec.md are met

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T001, T002, T003, T004)
- All Foundational tasks marked [P] can run in parallel (T005, T006, T007, T008, T009, T010, T011)
- Component creation within user stories marked [P] can run in parallel
- Different user stories can be worked on in parallel by different developers

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Native Map Display)
4. **STOP and VALIDATE**: Test native map renders without iframe
5. Deploy/demo if ready for MVP

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test → Deploy/Demo (MVP!)
3. Add User Story 2 → Test → Deploy/Demo
4. Add User Story 3 → Test → Deploy/Demo
5. Continue with P4, P5, P6
6. Add Phase 9 Polish → Final deployment

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (P1)
   - Developer B: User Story 2 (P2)
   - Developer C: User Story 3 (P3)
3. Complete in priority order
4. Polish phase together

---

## Notes

- [P] tasks = different files, no dependencies
- [US#] label maps task to specific user story for traceability
- Each user story independently completable and testable
- Asset optimization is critical (9.3MB → ~3MB)
- SSR disabled for Leaflet components (dynamic import required)
- Test on real devices for responsive design
- Performance testing with 50+ markers
- Clean Architecture maintained throughout (UI/Service/Data layers)
