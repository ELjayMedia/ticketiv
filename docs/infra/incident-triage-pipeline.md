# EljayMedia Operations — Deployment & Incident Triage Pipeline

**Version:** 1.0
**Effective:** 2026-09-03
**Owner:** Automation Engineering

---

## 1. Technical event sources

| Source | Event types | Ingestion method |
|--------|-------------|------------------|
| GitHub | push, PR, release, check_run | Webhook |
| Vercel | deployment_success, deployment_failed, deployment_canceled | Webhook |
| Sentry | error, issue_assigned, issue_resolved | Webhook |

---

## 2. Event enrichment

For each event, enrich with:
- Repository name and branch
- Commit SHA and message
- Environment (production/staging/preview)
- Linked Jira issue (from commit message or branch name)
- Author/deployer identity

---

## 3. Triage flow

```
Event received → Normalize → Fingerprint → Evaluate rules → Route
```

### Rules
| Condition | Action |
|-----------|--------|
| deployment_successful | Record, no agent |
| known_error_fingerprint | Execute known remediation, no agent |
| unknown_failure | Build diagnostic packet → Engineer Agent |
| duplicate_error (within window) | Suppress, increment counter |
| repeated_failures (>3 in 1hr) | Escalate to Kaya |

---

## 4. Version history

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-09-03 | Automation Engineering | Initial release |
