# EljayMedia Operations — Incident Response & Escalation

**Version:** 1.0
**Effective:** 2026-09-03
**Owner:** Infrastructure Operations

---

## 1. Tier 1 services and owners

| Service | Primary responder | Backup | SLA |
|---------|------------------|--------|-----|
| Oracle VM / SSH | Infrastructure team | Founder | 1 hour |
| Perfex CRM | Operations manager | Founder | 2 hours |
| n8n automation | Operations manager | Infrastructure team | 4 hours |
| MariaDB / PostgreSQL | Infrastructure team | Founder | 1 hour |
| Cloudflare Tunnel | Infrastructure team | Founder | 1 hour |
| Uptime Kuma | Infrastructure team | Operations manager | 4 hours |

---

## 2. Alert channels

| Severity | Channel | Response time |
|----------|---------|---------------|
| Critical (P1) | Phone call + Telegram | 15 minutes |
| High (P2) | Telegram message | 1 hour |
| Medium (P3) | Telegram message | 4 hours |
| Low (P4) | Jira ticket | Next business day |

---

## 3. Severity definitions

- **Critical (P1):** Complete service outage, data loss, security breach
- **High (P2):** Major feature unavailable, performance severely degraded
- **Medium (P3):** Minor feature issue, workaround available
- **Low (P4):** Cosmetic issue, enhancement request

---

## 4. Incident runbook

1. **Acknowledge** — Confirm receipt of alert
2. **Assess** — Determine customer/business impact
3. **Contain** — Prevent further damage
4. **Communicate** — Notify stakeholders
5. **Recover** — Restore service
6. **Verify** — Confirm resolution
7. **Document** — Record timeline, root cause, corrective actions

---

## 5. Incident Jira template

```
Title: [SEVERITY] Service - Brief description
Description:
- Timeline: [When detected → When resolved]
- Root cause: [Technical explanation]
- Impact: [Users affected, data at risk]
- Recovery: [Steps taken]
- Corrective actions: [Prevention measures]
- Linked tickets: [Follow-up work]
```

---

## 6. Version history

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-09-03 | Infrastructure Operations | Initial release |
