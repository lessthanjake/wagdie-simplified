# Feature Specification: Root Folder Cleanup

**Feature Branch**: `015-root-cleanup`
**Created**: 2025-12-03
**Status**: Draft
**Input**: User description: "Clean up root folder"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Developer Navigates Clean Project Root (Priority: P1)

A developer opening the project for the first time can quickly understand the project structure by seeing only essential configuration files and directories in the root folder. Temporary files, old reports, and debug outputs are moved or removed.

**Why this priority**: A clean root folder is the primary goal - it directly improves developer experience and reduces cognitive load when navigating the project.

**Independent Test**: Can be fully tested by listing the root directory contents and verifying only essential files remain. Delivers immediate clarity for any developer working on the project.

**Acceptance Scenarios**:

1. **Given** the project root folder, **When** a developer lists the contents, **Then** they see only essential configuration files (package.json, tsconfig.json, next.config.js, etc.) and standard directories (app/, components/, lib/, etc.)
2. **Given** the project root folder, **When** a developer searches for temporary/debug files, **Then** no tsc_output*.txt or similar debug artifacts exist in root
3. **Given** the cleanup has been performed, **When** the project builds, **Then** the build succeeds without errors

---

### User Story 2 - Historical Documentation Preserved (Priority: P2)

Old implementation reports and fix documentation are preserved in an organized archive location rather than deleted, allowing developers to reference historical decisions if needed.

**Why this priority**: While cleaning is important, preserving institutional knowledge prevents loss of context about past decisions and fixes.

**Independent Test**: Can be tested by verifying archived files exist in a designated location and are accessible when needed.

**Acceptance Scenarios**:

1. **Given** old documentation files exist in root, **When** cleanup runs, **Then** files are moved to an archive location (e.g., `docs/archive/`)
2. **Given** archived documentation, **When** a developer needs historical context, **Then** they can find relevant files in the archive with clear naming

---

### User Story 3 - Gitignore Updated for Future Cleanliness (Priority: P3)

The .gitignore file is updated to prevent temporary and generated files from being committed in the future, maintaining root folder cleanliness over time.

**Why this priority**: Prevents the problem from recurring, ensuring long-term maintainability.

**Independent Test**: Can be tested by creating sample temporary files and verifying git status shows them as ignored.

**Acceptance Scenarios**:

1. **Given** the updated .gitignore, **When** TypeScript compilation generates tsbuildinfo or output files, **Then** these files are not tracked by git
2. **Given** the updated .gitignore, **When** a developer generates debug output, **Then** common debug file patterns are ignored

---

### Edge Cases

- What happens when a file marked for archival is still actively referenced by other documentation? Check for internal references before moving; update references if found.
- What happens when a large data file is needed for local development? Move to appropriate data directory and update any import paths.
- What happens if archived files have the same name as existing files in the archive? Use timestamped naming or subdirectories to prevent conflicts.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST remove or relocate all temporary TypeScript compilation outputs (tsc_output*.txt files) from the root folder
- **FR-002**: System MUST preserve old documentation files by moving them to `docs/archive/` rather than deleting
- **FR-003**: System MUST update .gitignore to include patterns for temporary and generated files (*.tsbuildinfo, tsc_output*.txt, .DS_Store)
- **FR-004**: System MUST ensure the project builds successfully after cleanup
- **FR-005**: System MUST maintain all essential configuration files in their current locations (package.json, tsconfig.json, next.config.js, etc.)
- **FR-006**: System MUST evaluate large data files and move them to appropriate directories if not needed in root
- **FR-007**: System MUST identify and handle obsolete directories (components-new/, firebasebackup/) appropriately

### Files to Archive (Move to docs/archive/)

| File | Reason |
|------|--------|
| 010-storybook-import-implementation-report.md | Historical report |
| 010-storybook-import-summary.md | Historical summary |
| CONNECTOR-FIX.md | Historical fix documentation |
| FIXES_APPLIED.md | Historical fix documentation |
| PROVIDER-FIX.md | Historical fix documentation |
| REACT-IMPORT-FIX.md | Historical fix documentation |
| MAP_REBUILD_SUMMARY.md | Historical summary |
| IMPLEMENTATION_NOTES.md | Historical notes |
| TECHNICAL_DEBT_REPORT.md | Historical report |
| PAGE_WIREFRAMES.md | Design documentation |
| FEATURES_CHECKLIST.md | Historical checklist |
| firebasebackup/ | Firebase backup directory (2025-11-17) |

### Files to Delete (Temporary/Generated)

| File | Reason |
|------|--------|
| tsc_output.txt | Debug output |
| tsc_output_2.txt | Debug output |
| tsc_output_3.txt | Debug output |
| tsc_output_4.txt | Debug output |
| .DS_Store | macOS metadata |
| tsconfig.tsbuildinfo | TypeScript build cache (regenerates) |
| wagdie.json | Large data file (35MB), not needed |
| claude_code_zai_env.sh | Obsolete environment script |

### Files to Evaluate

| File/Directory | Size | Consideration |
|----------------|------|---------------|
| wagdie.json | 35MB | **DELETE** - Not needed, can be regenerated |
| claude_code_zai_env.sh | 5.2KB | **DELETE** - Obsolete script |
| components-new/ | - | **KEEP** - Actively used by 10+ components |
| firebasebackup/ | - | **ARCHIVE** - Move to docs/archive/firebasebackup/ |

### Essential Files to Keep in Root

| Category | Files |
|----------|-------|
| Package management | package.json, package-lock.json, bun.lock |
| TypeScript | tsconfig.json, next-env.d.ts |
| Next.js | next.config.js, middleware.ts |
| Styling | tailwind.config.ts, postcss.config.js |
| Testing | jest.config.js, jest.setup.js, jest-dom.d.ts |
| Environment | .env, .env.example, .env.local, .env.docker |
| Linting | .eslintrc.json, .eslintignore, .prettierignore |
| Git | .gitignore |
| Deployment | vercel.json, docker-compose.yml |
| Documentation | README.md, SETUP.md, ARCHITECTURE.md, CLAUDE.md |
| UI Components | components-new/ (actively used by 10+ components) |

### Key Entities

- **Root File**: A file located in the project's root directory, categorized as essential, archivable, or deletable
- **Archive**: The `docs/archive/` directory containing historical documentation for reference
- **Gitignore Pattern**: A rule in .gitignore that prevents specific file types from being tracked

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Root folder contains no more than 25 visible files (excluding hidden configuration files)
- **SC-002**: All temporary/debug output files (tsc_output*.txt) are removed from root
- **SC-003**: Historical documentation is preserved and accessible in docs/archive/
- **SC-004**: Project builds successfully after cleanup
- **SC-005**: Common temporary file patterns are covered in .gitignore
- **SC-006**: No regression in project functionality - all existing features work after cleanup

## Clarifications

### Session 2025-12-03

- Q: How should components-new/ directory be handled? → A: Keep in place (it's actively used by 10+ components, not obsolete)
- Q: How should firebasebackup/ directory be handled? → A: Move to docs/archive/firebasebackup/ (preserve for reference)
- Q: How should wagdie.json (35MB) be handled? → A: Delete entirely (not needed, can be regenerated)
- Q: How should claude_code_zai_env.sh be handled? → A: Delete entirely (obsolete script)

## Assumptions

- Old fix documentation (CONNECTOR-FIX.md, etc.) is no longer actively referenced and can be archived
- The tsc_output*.txt files are debug artifacts with no ongoing value
- Moving files to docs/archive/ preserves sufficient accessibility for historical reference
- The project's essential functionality does not depend on the specific location of archivable files
- Large data files can be moved without breaking import paths (paths will be updated if necessary)
