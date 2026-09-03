# EljayMedia Operations — Product Health Snapshots

**Version:** 1.0
**Effective:** 2026-09-03
**Owner:** Automation Engineering

---

## 1. Health signals by product

### Ticketiv
- Deployment status (Vercel)
- Critical Jira blockers
- Payment success rate
- Webhook health
- Error rate (Sentry)

### News On Africa
- WordPress sync status
- Content freshness
- Feed health
- Search index status

### Media Intelligence
- Ingestion pipeline status
- OCR service health
- Evidence processing queue
- AI Gateway availability

---

## 2. Snapshot collection

- Frequency: Every 15 minutes
- Storage: PostgreSQL time-series
- Retention: 90 days
- Delta calculation: Compare to previous snapshot

---

## 3. Alert rules

| Condition | Severity | Action |
|-----------|----------|--------|
| Deployment failed | Critical | Page on-call |
| Payment success < 95% | High | Alert operations |
| Ingestion pipeline down | High | Alert operations |
| Error rate > 5% | Medium | Daily digest |

---

## 4. Version history

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-09-03 | Automation Engineering | Initial release |
