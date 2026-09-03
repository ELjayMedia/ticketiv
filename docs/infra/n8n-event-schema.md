# EljayMedia Operations — Central n8n Event Schema

**Version:** 1.0
**Effective:** 2026-09-03
**Owner:** Automation Engineering

---

## 1. Canonical event schema

```json
{
  "event_id": "uuid",
  "timestamp": "ISO8601",
  "source": "jira|github|vercel|sentry|supabase|cloudflare|custom",
  "event_type": "deployment_failed|issue_created|pr_merged|...",
  "product_context": "ticketiv|noa|mi|agency|ops",
  "severity": "critical|high|medium|low",
  "correlation_id": "string",
  "entity_ids": {
    "project": "string",
    "repository": "string",
    "issue": "string"
  },
  "payload": {}
}
```

---

## 2. Ingestion gateway

### Reusable intake workflow
1. Receive webhook/event
2. Authenticate source (HMAC, signature, secret)
3. Validate payload schema
4. Normalize to canonical schema
5. Enrich with product/context data
6. Route to deterministic rules engine

---

## 3. Version history

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-09-03 | Automation Engineering | Initial release |
