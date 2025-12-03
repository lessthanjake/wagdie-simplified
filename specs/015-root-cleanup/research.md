# Research: Root Folder Cleanup

**Feature**: 015-root-cleanup
**Date**: 2025-12-03

## Summary

This feature involves file system operations only (delete, move, gitignore updates). No technology research required.

## Decisions

### File Handling Decisions (from /speckit.clarify)

| Item | Decision | Rationale |
|------|----------|-----------|
| components-new/ | KEEP | Actively imported by 10+ components - deletion would break build |
| firebasebackup/ | ARCHIVE | Historical backup, not actively used, preserve for reference |
| wagdie.json (35MB) | DELETE | Not imported in codebase, can be regenerated if needed |
| claude_code_zai_env.sh | DELETE | Obsolete developer script, no longer needed |

### Verification Research

**Question**: Do any files to be deleted have active imports?

**Finding**: Verified via grep search:
- `wagdie.json` - No TypeScript/JavaScript imports found
- `claude_code_zai_env.sh` - Shell script, not imported
- `tsc_output*.txt` - Debug artifacts, not imported
- Documentation files (*.md in root) - Not programmatically imported

**Conclusion**: Safe to proceed with planned deletions.

### .gitignore Best Practices

**Standard patterns to add**:
```gitignore
# TypeScript
*.tsbuildinfo

# Debug output
tsc_output*.txt

# macOS
.DS_Store

# IDE
.idea/
*.swp
```

## Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| Delete all historical docs | Loses institutional knowledge |
| Keep wagdie.json in data/ | User confirmed not needed, 35MB bloat |
| Rename components-new/ to ui/ | Would require updating 10+ import paths, out of scope |

## Open Questions

None. All clarifications resolved in `/speckit.clarify` session.
