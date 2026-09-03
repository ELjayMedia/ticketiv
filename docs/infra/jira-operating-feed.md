# EljayMedia Operations — Jira Delta & Operating Feed

**Version:** 1.0
**Effective:** 2026-09-03
**Owner:** Automation Engineering

---

## 1. Delta-based ingestion

### Approach
- Ingest Jira webhooks where available
- Supplement with scheduled delta checks (every 15 min)
- Retrieve only issues changed since last successful run
- Never re-read entire backlog unless explicitly requested

---

## 2. Normalized issue fields

| Field | Source |
|-------|--------|
| project | Jira project key |
| priority | Jira priority |
| status | Jira status |
| parent/epic | Jira epic link |
| blocker | Jira issue links |
| assignee | Jira assignee |
| updated | Jira updated date |

---

## 3. Rule-based filtering

### Detect and route
- Launch-critical blocks → immediate alert
- Stale in-progress work (> 7 days no update) → flag
- Priority changes → notify
- Newly created critical issues → route to Delivery/Kaya

### Suppress
- Routine status transitions
- No-impact changes
- Already-processed duplicates

---

## 4. Version history

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-09-03 | Automation Engineering | Initial release |
