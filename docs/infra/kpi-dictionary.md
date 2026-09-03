# EljayMedia Operations — Executive KPI Dictionary

**Version:** 1.0
**Effective:** 2026-09-03
**Owner:** Business Intelligence

---

## 1. KPI definitions

| # | KPI | Formula | Source | Owner | Frequency |
|---|-----|---------|--------|-------|-----------|
| 1 | Qualified leads | COUNT of leads with budget/authority/need/timeline confirmed | Perfex | BD Manager | Weekly |
| 2 | Lead response time | AVG(time from lead creation to first contact) | Perfex | BD Manager | Weekly |
| 3 | Proposal value issued | SUM(proposal values sent in period) | Perfex | BD Manager | Monthly |
| 4 | Proposal turnaround | AVG(time from qualified to proposal sent) | Perfex | BD Manager | Monthly |
| 5 | Win rate | WON / (WON + LOST) | Perfex | BD Manager | Monthly |
| 6 | Monthly recurring revenue | SUM(active subscription MRR) | Perfex | Finance | Monthly |
| 7 | Revenue delivered | SUM(invoices issued in period) | Perfex | Finance | Monthly |
| 8 | Cash collected | SUM(payments received in period) | Perfex/Supabase | Finance | Monthly |
| 9 | Gross margin | (Revenue - Direct costs) / Revenue | Perfex | Finance | Monthly |
| 10 | Delivery utilisation | Billable hours / Available hours | Jira/Perfex | Delivery Lead | Weekly |
| 11 | Outstanding invoices | SUM(unpaid invoices) with ageing | Perfex | Finance | Weekly |
| 12 | Client churn | LOST clients / Total clients (period) | Perfex | BD Manager | Quarterly |
| 13 | Automation failure rate | Failed workflows / Total executions | n8n | Ops Manager | Weekly |
| 14 | Platform uptime | (Total time - Downtime) / Total time | Uptime Kuma | Ops Manager | Monthly |
| 15 | Incident count | COUNT(incidents in period) | Jira/Sentry | Ops Manager | Monthly |

---

## 2. Data quality rules

- Exclude test records from all KPIs
- Exclude cancelled/voided transactions
- Duplicate detection: same client + same period = single count
- Freshness: Daily data updated by 9am CAT

---

## 3. Version history

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-09-03 | Business Intelligence | Initial release |
