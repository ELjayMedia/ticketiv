# EljayMedia Operations — n8n Nervous System Architecture

**Version:** 1.0
**Effective:** 2026-09-03
**Owner:** Automation Engineering

---

## 1. Architecture overview

```
Systems/events → n8n → deterministic processing → decision gate → action OR agent invocation → result → logging → Kaya/owner
```

Core rule: **Machines execute rules. Agents make judgements.**

---

## 2. Event intake layer

### Supported sources
- Jira (webhooks + scheduled delta)
- GitHub (push, PR, release events)
- Vercel (deployment status)
- Sentry (error events)
- Supabase (database events)
- Cloudflare (analytics, security)
- Custom webhooks (Ticketiv, NOA, MI events)

### Event schema
```json
{
  "event_id": "uuid",
  "timestamp": "ISO8601",
  "source": "jira|github|vercel|sentry|...",
  "event_type": "deployment_failed|issue_created|...",
  "product_context": "ticketiv|noa|mi|ops",
  "severity": "critical|high|medium|low",
  "correlation_id": "string",
  "payload": {}
}
```

---

## 3. Deterministic rules engine

### Decision flow
1. Is this event healthy/no-action? → Log and stop
2. Is the issue already known? → Execute known remediation
3. Has a threshold been breached? → Alert or auto-remediate
4. Has anything material changed? → Update state, notify if needed
5. Does this require agent judgement? → Route to appropriate agent

### Reusable components
- Event normalizer
- Deduplication service
- State comparator
- Severity scorer
- Threshold evaluator
- Context packet builder
- Agent router

---

## 4. Cost-control layer

### AI cost controls
- Default `AI_REQUIRED = false`
- Task/model routing table
- Rate limiting by workflow
- Deduplication of identical requests
- Output caching where safe
- Monthly budget warnings
- Hard circuit breakers

### Metrics tracked
- Events handled without AI
- AI calls avoided
- Cost by workflow/product/agent
- Model usage by provider

---

## 5. Initial priority workflows

### A. Jira operating feed
- Delta-based issue retrieval
- Blocked/high-priority detection
- Stale work identification
- Daily delta summary

### B. Deployment triage
- Error fingerprint catalog
- Known remediation matching
- Unknown failure → Engineer Agent

### C. Product health snapshots
- Deployment health
- Critical blockers
- Error counts
- Metric anomalies

### D. Morning briefing pipeline
- Overnight change collection
- Decision/blocker extraction
- Structured briefing packet

---

## 6. Version history

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-09-03 | Automation Engineering | Initial release |
