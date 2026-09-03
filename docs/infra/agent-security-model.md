# EljayMedia Operations — Agent Security, Permissions & Secrets Model

**Version:** 1.0
**Effective:** 2026-09-03
**Owner:** Security Engineering

---

## 1. Permissions matrix

### Kaya (Chief of Staff)
| System | Read | Write | Destroy | External comms |
|--------|------|-------|---------|----------------|
| Jira | ✅ | ✅ | ❌ | ❌ |
| Confluence | ✅ | ✅ | ❌ | ❌ |
| GitHub | ✅ | ❌ | ❌ | ❌ |
| Vercel | ✅ | ❌ | ❌ | ❌ |
| Sentry | ✅ | ❌ | ❌ | ❌ |
| Supabase | ✅ | ❌ | ❌ | ❌ |
| n8n | ✅ | ✅ | ❌ | ❌ |
| Telegram | ✅ | ✅ | ❌ | ✅ |

### Delivery Agent
| System | Read | Write | Destroy | External comms |
|--------|------|-------|---------|----------------|
| Jira | ✅ | ✅ | ❌ | ❌ |
| Confluence | ✅ | ✅ | ❌ | ❌ |
| GitHub | ✅ | ❌ | ❌ | ❌ |
| Perfex | ✅ | ❌ | ❌ | ❌ |

### Engineer Agent
| System | Read | Write | Destroy | External comms |
|--------|------|-------|---------|----------------|
| GitHub | ✅ | ✅ | ❌ | ❌ |
| Vercel | ✅ | ✅ | ❌ | ❌ |
| Sentry | ✅ | ❌ | ❌ | ❌ |
| Supabase | ✅ | ✅ | ❌ | ❌ |
| Neon | ✅ | ❌ | ❌ | ❌ |
| Cloudflare | ✅ | ❌ | ❌ | ❌ |

### Analyst Agent
| System | Read | Write | Destroy | External comms |
|--------|------|-------|---------|----------------|
| Jira | ✅ | ❌ | ❌ | ❌ |
| Supabase | ✅ | ❌ | ❌ | ❌ |
| PostgreSQL | ✅ | ❌ | ❌ | ❌ |

---

## 2. Approval gates

### Require explicit human approval
- Financial transactions
- Production deployments
- Destructive database operations
- External communications (email, social media)
- Access grants/revocations
- Configuration changes to security controls

### Can execute autonomously
- Read-only queries
- Non-destructive updates (status fields, labels)
- Internal notifications
- Report generation
- Scheduled health checks

---

## 3. Credential management

- Secrets isolated by profile/function
- Rotation every 90 days or on team change
- No secrets in logs, memory, or inter-agent payloads
- Emergency revoke procedure documented and tested

---

## 4. Version history

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-09-03 | Security Engineering | Initial release |
