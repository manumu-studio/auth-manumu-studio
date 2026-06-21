---
id: INCIDENT-P008
date: 2026-06-21
severity: SEV-4
status: RESOLVED
packet: PACKET-02-gated-registration
branch: feat/task-022-social-jit
environment: local
detected_by: developer
related_incidents:
  - INCIDENT-P001
fix_pr: null
---

# INCIDENT-P008 - Incident Registry Conflict Markers

## Prior Incident Check

- **Registry checked:** yes, but the registry itself contained committed conflict markers.
- **Search terms:** `incident registry`, `conflict marker`, `merge conflict`, `registry conflict`
- **Candidate incidents:** none specific to committed registry conflict markers
- **Classification:** no prior match
- **Action:** create a new incident before fixing the registry

## Problem

### Symptoms

- `docs/incidents/INCIDENT_REGISTRY.md` contains committed conflict-marker tokens.
- The broken registry blocks the mandatory incident-memory Step 0 required before TASK-022 auth work.

### Impact

- **Users affected:** none directly
- **Features broken:** local development workflow and Packet 02 governance preflight
- **Data at risk:** no
- **Workaround exists:** yes, reconcile the registry from the current branch side and preserve incident rows

### Reproduction Steps

1. Open `docs/incidents/INCIDENT_REGISTRY.md`.
2. Observe committed conflict markers in the diagnostic note, Active table, and Resolved table.
3. Run a conflict-marker scan against `docs/incidents/INCIDENT_REGISTRY.md`.

### Evidence

```text
docs/incidents/INCIDENT_REGISTRY.md contained left-side, separator, and right-side conflict markers.
```

### Files Suspected

| File | Why suspected |
|------|--------------|
| `docs/incidents/INCIDENT_REGISTRY.md` | Contains committed merge-conflict markers |

### Root Cause Hypothesis

> A merge commit intended to resolve the registry conflict preserved the conflict markers in the committed file.

### What's Blocked

- TASK-022 implementation preflight.
- Reliable incident-memory lookup for current Packet 02 work.

## Resolution

### Contributing Factors

1. **Factor:** Manual conflict resolution drift.
   - **How it contributed:** Conflict markers survived into the committed registry.
   - **Why it was not caught earlier:** No conflict-marker scan ran after the merge commit.

### Was the Hypothesis Correct?

Yes. The merge commit preserved conflict markers in `docs/incidents/INCIDENT_REGISTRY.md`.

### Files Changed

| File | Change | Why |
|------|--------|-----|
| `docs/incidents/INCIDENT_REGISTRY.md` | Removed conflict markers and preserved branch incident rows | Restore Step 0 incident-memory readability |
| `docs/incidents/INCIDENT-P008-incident-registry-conflict-markers.md` | Created and resolved this incident | Preserve the required incident record |

### Fix Approach

> Reconstructed the registry from `HEAD^`'s resolved incident rows, added this incident, then verified no conflict markers remain in the checked governance docs.

### Regression Risk

- Low: documentation-only repair.

### Testing Done

- [x] Conflict-marker scan passes
- [x] Incident registry is readable
- [x] Git status reviewed

### Timeline

| Time (UTC) | Event |
|------------|-------|
| 02:54 | Detected while resuming TASK-022 and checking required incident memory |
| 02:54 | Prior incident search completed; no prior match found |
| 02:54 | Incident opened before registry repair |
| 02:55 | Registry reconstructed and conflict-marker scan passed |

### Lessons Learned

**What went well:**
- The mandatory Step 0 check caught the registry corruption before auth work began.

**What could be better:**
- Add a conflict-marker scan to local and CI documentation checks.

### Action Items

| Action | Owner | Deadline | Status | Tracking |
|--------|-------|----------|--------|----------|
| Remove conflict markers from incident registry | Codex | 2026-06-21 | DONE | This incident |
| Consider adding a conflict-marker check to CI/local release gate | Manu / Codex | Future hardening | TODO | Follow-up |

## Conclusion

The incident registry contained committed merge-conflict markers, blocking the project-required diagnostic preflight. The registry has been reconstructed without conflict markers, preserving the active and resolved incident rows needed for TASK-022 preflight.
