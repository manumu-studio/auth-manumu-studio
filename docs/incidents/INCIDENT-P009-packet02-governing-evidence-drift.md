---
id: INCIDENT-P009
date: 2026-06-21
severity: SEV-4
status: RESOLVED
packet: PACKET-02-gated-registration
branch: feat/task-022-social-jit
environment: local
detected_by: developer
related_incidents:
  - INCIDENT-P001
  - INCIDENT-P003
  - INCIDENT-P008
fix_pr: null
---

# INCIDENT-P009 - Packet 02 Governing Evidence Drift

## Prior Incident Check

- **Registry checked:** yes
- **Search terms:** `CP-011`, `GATED-PRIVATE-REGISTRATION`, `MANUMU-DEVELOPMENT-OPERATING-SYSTEM`, `INCIDENT-P002`, `governing evidence`, `decision context`
- **Candidate incidents:** `INCIDENT-P003`, `INCIDENT-P005`
- **Classification:** related but distinct
- **Action:** create linked child incident

## Problem

### Symptoms

- The living Packet 02 spec requires reading several files before any task, but those files are not present in the current worktree or checked refs.
- Missing paths:
  - `docs/continuation-prompts/CP-011-packet02-design-rewrite.md`
  - `docs/research/GATED-PRIVATE-REGISTRATION-SECURITY-RESEARCH.md`
  - `docs/incidents/INCIDENT-P002-decision-context-not-read.md`
  - `docs/research/MANUMU-DEVELOPMENT-OPERATING-SYSTEM.md`

### Impact

- **Users affected:** none directly
- **Features broken:** Packet 02 governance preflight for TASK-022
- **Data at risk:** no
- **Workaround exists:** yes, update the living spec to cite available authoritative Packet 02 artifacts

### Reproduction Steps

1. Open `docs/build-packets/PACKET-02-gated-registration.md`.
2. Inspect the "Governing Evidence" section.
3. Check the referenced files in the current worktree and relevant refs.

### Evidence

```text
NO_CP011
NO_GATED_RESEARCH
NO_MANUMU_OS
NO_P002
```

### Files Suspected

| File | Why suspected |
|------|--------------|
| `docs/build-packets/PACKET-02-gated-registration.md` | Living spec cites unavailable governing artifacts |

### Root Cause Hypothesis

> Packet 02 was rewritten from private/local design artifacts, but the living spec retained references to artifacts that are no longer available in this worktree.

### What's Blocked

- Full Step 0 compliance for TASK-022.

## Resolution

### Contributing Factors

1. **Factor:** Historical design artifacts are not all available in the current worktree.
   - **How it contributed:** The living spec pointed to files that cannot be read on resume.
   - **Why it was not caught earlier:** Later RUN6 artifacts and task files carried the effective decisions, so execution continued without reconciling the source list.

### Was the Hypothesis Correct?

Yes. The missing references were historical/private design artifacts, while the current Round 6 packet artifacts carry the effective binding decisions.

### Files Changed

| File | Change | Why |
|------|--------|-----|
| `docs/build-packets/PACKET-02-gated-registration.md` | Replaced unavailable evidence references with available authoritative artifacts | Allow future Step 0 preflight from files present in this worktree |
| `docs/incidents/INCIDENT-P009-packet02-governing-evidence-drift.md` | Created and resolved this incident | Preserve the required incident record |

### Fix Approach

> Kept historical CPs/vendor bundles unchanged, and updated only the living Packet 02 spec so future resumes can satisfy Step 0 from files present in the worktree.

### Regression Risk

- Low: documentation-only repair that preserves existing binding decisions.

### Testing Done

- [x] Referenced files exist
- [x] Packet 02 binding decisions remain intact
- [x] Conflict-marker scan passes

### Timeline

| Time (UTC) | Event |
|------------|-------|
| 02:56 | Missing governing evidence detected during TASK-022 preflight |
| 02:56 | Prior incident search completed |
| 02:56 | Incident opened before living-spec repair |
| 02:57 | Living Packet 02 evidence list reconciled and verified |

### Lessons Learned

**What went well:**
- Step 0 caught the missing source references before TASK-022 production edits.

**What could be better:**
- Living packet specs should cite only files available in the repo/worktree, or explicitly mark private historical sources as superseded.

### Action Items

| Action | Owner | Deadline | Status | Tracking |
|--------|-------|----------|--------|----------|
| Reconcile Packet 02 governing evidence list | Codex | 2026-06-21 | DONE | This incident |

## Conclusion

Packet 02's living governing evidence list referenced unavailable historical design artifacts. The living spec now cites available authoritative artifacts without editing historical snapshots, restoring Step 0 preflight for TASK-022.
