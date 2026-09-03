# EljayMedia Operations — Reporting & Dashboards

**Version:** 1.0
**Effective:** 2026-09-03
**Owner:** Business Intelligence

---

## 1. Dashboard specifications

### Executive Dashboard
- Monthly recurring revenue
- Revenue delivered vs cash collected
- Win rate
- Lead response time
- Platform uptime

### Operations Dashboard
- Automation failure rate
- Backup status
- Incident count
- Service health (Tier 1/2/3)

### Financial Dashboard
- Outstanding invoices (ageing)
- Gross margin by client/service line
- Cash flow (collected vs delivered)
- Client churn/retention

---

## 2. Implementation

- Tool: Metabase (self-hosted)
- Data sources: Perfex, Supabase, n8n telemetry, Uptime Kuma
- Update frequency: Daily refresh

---

## 3. Version history

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-09-03 | Business Intelligence | Initial release |
