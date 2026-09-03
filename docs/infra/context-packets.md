# EljayMedia Operations — Context Packets & Hermes Adapter

**Version:** 1.0
**Effective:** 2026-09-03
**Owner:** Automation Engineering

---

## 1. Context packet builder

### Standard packet structure
```json
{
  "event_id": "uuid",
  "timestamp": "ISO8601",
  "product_context": "ticketiv|noa|mi|agency|ops",
  "source_system": "jira|github|vercel|...",
  "event_type": "string",
  "severity": "critical|high|medium|low",
  "summary": "string",
  "relevant_state": {},
  "recent_changes": [],
  "evidence": [],
  "known_matches": [],
  "actions_already_attempted": [],
  "decision_required": "string|null",
  "recommended_agent": "kaya|delivery|engineer|analyst",
  "source_links": []
}
```

### Principles
- Exclude unnecessary raw data and secrets
- Store/reference large logs instead of embedding
- Include only minimum data necessary

---

## 2. Hermes invocation adapter

### Adapter responsibilities
1. Build context packet from event data
2. Invoke Hermes agent via API
3. Parse structured response
4. Handle timeouts/provider errors
5. Preserve correlation IDs end-to-end

### Error handling
- Failed responses enter controlled error path
- Retry with bounded backoff
- Dead-letter queue for unrecoverable failures

---

## 3. Version history

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-09-03 | Automation Engineering | Initial release |
