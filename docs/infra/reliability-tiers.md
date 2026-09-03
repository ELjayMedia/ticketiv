# EljayMedia Operations — Service Reliability Tiers

**Version:** 1.0
**Effective:** 2026-09-03
**Owner:** Infrastructure Operations

---

## 1. Tier definitions

| Tier | Service | RTO | RPO | Backup frequency |
|------|---------|-----|-----|------------------|
| Tier 1 | Perfex CRM, Oracle VM, Cloudflare Tunnel | 1 hour | 24 hours | Daily |
| Tier 2 | n8n, Uptime Kuma, Hermes | 4 hours | 24 hours | Daily |
| Tier 3 | Metabase, documentation, internal tools | 24 hours | Weekly | Weekly |

---

## 2. Scaling triggers

### Oracle VM scale-up
- CPU > 80% sustained for 1 hour
- Memory > 85% sustained
- Disk > 80% capacity

### Current capacity
- 1 OCPU, 1 GB RAM (Free Tier)
- Scale to 2 OCPU, 16 GB RAM when triggers hit

---

## 3. Version history

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-09-03 | Infrastructure Operations | Initial release |
