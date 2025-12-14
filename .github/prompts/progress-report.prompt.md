---
name: progress-report
description: 'Generate a comprehensive progress report on project status'
---

# Goal

Generate a **comprehensive progress report** showing project status, completed work, and remaining effort.

## Instructions

### 1. Gather Data

```bash
klondike status
klondike feature list
klondike validate
```

### 2. Git Activity

```bash
git log --oneline --since="1 week ago" | wc -l
git log --oneline --since="1 month ago" | wc -l
```

### 3. Calculate Metrics

**Completion Metrics:**

- Overall completion: verified / total features
- Completion by category
- Completion by priority level

**Health Metrics:**

- Stale in-progress features (not worked on recently)
- Blocked features
- Features without evidence

## Output Format

```markdown
# Project Progress Report

**Generated**: <timestamp>
**Project**: <name>

---

## Executive Summary

<2-3 sentence overview>

**Overall Progress**: ██████████░░░░░░ XX%

---

## Feature Completion

### By Status

| Status         | Count | Percentage |
| -------------- | ----- | ---------- |
| ✅ Verified    | X     | XX%        |
| 🔄 In-Progress | Y     | YY%        |
| 🚫 Blocked     | B     | BB%        |
| ⏳ Not Started | Z     | ZZ%        |

### By Priority

| Priority | Total | Complete | Remaining |
| -------- | ----- | -------- | --------- |
| 🔴 P1    | X     | Y        | Z         |
| 🟠 P2    | X     | Y        | Z         |
| 🟡 P3    | X     | Y        | Z         |

---

## Attention Required

### Blocked Features

| ID   | Description   | Blocked By |
| ---- | ------------- | ---------- |
| F0XX | <description> | <reason>   |

---

## Recommendations

1. **<Action 1>** - <rationale>
2. **<Action 2>** - <rationale>

---

## Projections

**Estimated Sessions to MVP**: X-Y sessions
```
