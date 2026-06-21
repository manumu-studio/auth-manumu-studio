---
id: INCIDENT-PNN
date: YYYY-MM-DD
severity: SEV-1 | SEV-2 | SEV-3 | SEV-4
status: OPEN | INVESTIGATING | FIXING | RESOLVED | DEPLOYED
packet: PACKET-NN
branch: feat/branch-name
environment: production | staging | local
detected_by: monitoring | user-report | developer | ci-pipeline
related_incidents: []
fix_pr: null
---

# INCIDENT-PNN - Short Descriptive Title

## Problem

### Symptoms

- 

### Impact

- **Users affected:** all / subset / none
- **Features broken:** 
- **Data at risk:** yes / no
- **Workaround exists:** yes / no

### Reproduction Steps

1. 
2. 
3. 

### Evidence

```text
[logs, stack traces, screenshots]
```

### Files Suspected

| File | Why suspected |
|------|--------------|
| `path/to/file.ts` | reason |

### Root Cause Hypothesis

> Capture the best hypothesis before fixing.

### What's Blocked

- 

## Resolution

### Contributing Factors

1. **Factor:** 
   - **How it contributed:** 
   - **Why it was not caught earlier:** 

### Was the Hypothesis Correct?

> 

### Files Changed

| File | Change | Why |
|------|--------|-----|
| `path/to/file.ts` | description | rationale |

### Fix Approach

> 

### Regression Risk

- 

### Testing Done

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual verification in target environment
- [ ] Edge cases tested

### Timeline

| Time (UTC) | Event |
|------------|-------|
| HH:MM | Detected |
| HH:MM | Investigation started |
| HH:MM | Root cause identified |
| HH:MM | Fix implemented |
| HH:MM | Verified |

### Lessons Learned

**What went well:**
- 

**What could be better:**
- 

### Action Items

| Action | Owner | Deadline | Status | Tracking |
|--------|-------|----------|--------|----------|
| | | | TODO | link |

## Conclusion

One paragraph: what happened, why, what changed, and what prevents recurrence.

