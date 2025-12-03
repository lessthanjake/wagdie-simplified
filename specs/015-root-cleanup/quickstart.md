# Quickstart: Root Folder Cleanup

**Feature**: 015-root-cleanup
**Time to implement**: ~15 minutes

## Prerequisites

- Git repository is clean (no uncommitted changes)
- Node.js installed (for build verification)

## Quick Commands

### Step 1: Delete Temporary Files

```bash
# Delete debug/temp files
rm -f tsc_output.txt tsc_output_2.txt tsc_output_3.txt tsc_output_4.txt
rm -f tsconfig.tsbuildinfo
rm -f .DS_Store
rm -f wagdie.json
rm -f claude_code_zai_env.sh
```

### Step 2: Create Archive & Move Files

```bash
# Create archive directory
mkdir -p docs/archive

# Move documentation files
mv 010-storybook-import-implementation-report.md docs/archive/
mv 010-storybook-import-summary.md docs/archive/
mv CONNECTOR-FIX.md docs/archive/
mv FIXES_APPLIED.md docs/archive/
mv PROVIDER-FIX.md docs/archive/
mv REACT-IMPORT-FIX.md docs/archive/
mv MAP_REBUILD_SUMMARY.md docs/archive/
mv IMPLEMENTATION_NOTES.md docs/archive/
mv TECHNICAL_DEBT_REPORT.md docs/archive/
mv PAGE_WIREFRAMES.md docs/archive/
mv FEATURES_CHECKLIST.md docs/archive/

# Move firebase backup directory
mv firebasebackup docs/archive/
```

### Step 3: Update .gitignore

Add to `.gitignore`:

```gitignore
# TypeScript build artifacts
*.tsbuildinfo
tsc_output*.txt

# macOS
.DS_Store

# Large data files
wagdie.json
```

### Step 4: Verify

```bash
# Verify build works
npm run build

# Count root files (should be ≤25)
ls -1 | wc -l

# Verify archive contents
ls docs/archive/
```

## Verification Checklist

- [ ] No tsc_output*.txt files in root
- [ ] No wagdie.json in root
- [ ] docs/archive/ contains 11 markdown files + firebasebackup/
- [ ] `npm run build` succeeds
- [ ] Root folder has ≤25 visible files

## Rollback

If something goes wrong:

```bash
# Restore from git
git checkout -- .
git clean -fd
```

Or restore archived files:

```bash
mv docs/archive/*.md ./
mv docs/archive/firebasebackup ./
```
