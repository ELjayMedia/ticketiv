# EljayMedia Operations — System-of-Record Constitution

**Version:** 1.0
**Effective:** 2026-09-03
**Owner:** Operations

---

## 1. Authoritative systems of record

| Domain | System of record | Backup system |
|--------|-----------------|---------------|
| Client/lead data | Perfex CRM | Google Drive backup |
| Financial transactions | Perfex CRM + Supabase | Google Drive backup |
| Ticket/order data | Supabase (TICK project) | Supabase PITR |
| Editorial content | WordPress | WordPress export |
| Code/config | GitHub | Git + Google Drive |
| Automation state | n8n + PostgreSQL | n8n export + DB backup |
| Agent state/memory | Hermes profiles | File system backup |

---

## 2. Tool ownership

| Tool | Primary owner | Backup owner |
|------|-------------|--------------|
| Perfex CRM | Operations | Founder |
| Jira | Delivery | Operations |
| Confluence | Delivery | Operations |
| n8n | Operations | Automation Eng |
| GitHub | Engineering | Operations |
| Supabase | Engineering | Operations |
| Cloudflare | Infrastructure | Operations |

---

## 3. Version history

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-09-03 | Operations | Initial release |
