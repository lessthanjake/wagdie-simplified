# Implementation Plan: Root Folder Cleanup

**Branch**: `015-root-cleanup` | **Date**: 2025-12-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/015-root-cleanup/spec.md`

## Summary

Clean up the project root folder by deleting temporary/generated files, archiving historical documentation to `docs/archive/`, and updating `.gitignore` to prevent future clutter. This is a file system reorganization task with no code changes required.

## Technical Context

**Language/Version**: N/A (file operations only)
**Primary Dependencies**: Git, Bash/shell commands
**Storage**: File system only
**Testing**: Manual verification + build test (`npm run build`)
**Target Platform**: Local development environment
**Project Type**: Next.js web application (existing)
**Performance Goals**: N/A
**Constraints**: Must not break existing builds or imports
**Scale/Scope**: ~20 files to process (8 delete, 12 archive)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The constitution template is not yet configured for this project. Proceeding with standard best practices:

| Gate | Status | Notes |
|------|--------|-------|
| No code changes | PASS | File operations only |
| Build verification | REQUIRED | Must run `npm run build` after cleanup |
| Git history preserved | PASS | Using git mv/rm for proper tracking |
| No breaking changes | REQUIRED | Verify no imports reference deleted files |

## Project Structure

### Documentation (this feature)

```text
specs/015-root-cleanup/
├── plan.md              # This file
├── research.md          # Phase 0 output (minimal - no tech research needed)
├── data-model.md        # N/A - no data model for file cleanup
├── quickstart.md        # Phase 1 output
├── contracts/           # N/A - no API contracts
├── checklists/
│   └── requirements.md  # Quality checklist
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

This feature modifies the root folder structure. No source code changes required.

**Current State** (files to process):

```text
/ (root)
├── [DELETE] tsc_output.txt
├── [DELETE] tsc_output_2.txt
├── [DELETE] tsc_output_3.txt
├── [DELETE] tsc_output_4.txt
├── [DELETE] tsconfig.tsbuildinfo
├── [DELETE] .DS_Store
├── [DELETE] wagdie.json (35MB)
├── [DELETE] claude_code_zai_env.sh
├── [ARCHIVE] 010-storybook-import-implementation-report.md
├── [ARCHIVE] 010-storybook-import-summary.md
├── [ARCHIVE] CONNECTOR-FIX.md
├── [ARCHIVE] FIXES_APPLIED.md
├── [ARCHIVE] PROVIDER-FIX.md
├── [ARCHIVE] REACT-IMPORT-FIX.md
├── [ARCHIVE] MAP_REBUILD_SUMMARY.md
├── [ARCHIVE] IMPLEMENTATION_NOTES.md
├── [ARCHIVE] TECHNICAL_DEBT_REPORT.md
├── [ARCHIVE] PAGE_WIREFRAMES.md
├── [ARCHIVE] FEATURES_CHECKLIST.md
├── [ARCHIVE] firebasebackup/
├── [KEEP] components-new/  (actively used)
└── [KEEP] ... (all essential config files)
```

**Target State**:

```text
/ (root)
├── package.json, package-lock.json, bun.lock
├── tsconfig.json, next-env.d.ts
├── next.config.js, middleware.ts
├── tailwind.config.ts, postcss.config.js
├── jest.config.js, jest.setup.js, jest-dom.d.ts
├── .env, .env.example, .env.local, .env.docker
├── .eslintrc.json, .eslintignore, .prettierignore
├── .gitignore (updated)
├── vercel.json, docker-compose.yml
├── README.md, SETUP.md, ARCHITECTURE.md, CLAUDE.md
├── DOCKER-SUPABASE.md, STORYBOOK-QUICKSTART.md
├── components-new/
├── app/, components/, lib/, hooks/, types/
├── docs/
│   └── archive/  (NEW - contains archived files)
├── public/, scripts/, specs/, tests/
└── ... (other standard directories)
```

**Structure Decision**: No structural changes to source code. Only file deletions, moves to archive, and .gitignore updates.

## Complexity Tracking

No violations. This is a simple file cleanup operation with no architectural complexity.

## Implementation Phases

### Phase 1: Delete Temporary Files (8 files)

Files to delete:
1. `tsc_output.txt`
2. `tsc_output_2.txt`
3. `tsc_output_3.txt`
4. `tsc_output_4.txt`
5. `tsconfig.tsbuildinfo`
6. `.DS_Store`
7. `wagdie.json`
8. `claude_code_zai_env.sh`

### Phase 2: Create Archive Directory & Move Files (12 items)

1. Create `docs/archive/` directory
2. Move documentation files:
   - `010-storybook-import-implementation-report.md`
   - `010-storybook-import-summary.md`
   - `CONNECTOR-FIX.md`
   - `FIXES_APPLIED.md`
   - `PROVIDER-FIX.md`
   - `REACT-IMPORT-FIX.md`
   - `MAP_REBUILD_SUMMARY.md`
   - `IMPLEMENTATION_NOTES.md`
   - `TECHNICAL_DEBT_REPORT.md`
   - `PAGE_WIREFRAMES.md`
   - `FEATURES_CHECKLIST.md`
3. Move `firebasebackup/` directory

### Phase 3: Update .gitignore

Add patterns:
```gitignore
# TypeScript build artifacts
*.tsbuildinfo
tsc_output*.txt

# macOS
.DS_Store

# Large data files
wagdie.json
```

### Phase 4: Verification

1. Run `npm run build` to verify no breakage
2. Count root files to verify ≤25 visible files
3. Verify `docs/archive/` contains all archived files
4. Run `git status` to verify .gitignore patterns work

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking imports | Low | High | Pre-verified: no imports reference files to delete |
| Build failure | Low | High | Run build verification after cleanup |
| Lost documentation | None | Medium | Archiving, not deleting historical docs |
| Git history issues | Low | Low | Using git commands for proper tracking |

## Dependencies

- None. This is a standalone cleanup task.

## Success Metrics

From spec:
- SC-001: Root folder ≤25 visible files ✓
- SC-002: All tsc_output*.txt removed ✓
- SC-003: Historical docs in docs/archive/ ✓
- SC-004: Build succeeds ✓
- SC-005: .gitignore updated ✓
- SC-006: No functionality regression ✓
