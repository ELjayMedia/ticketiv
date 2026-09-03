# EljayMedia Operations — Agent Task/Result Contract

**Version:** 1.0
**Effective:** 2026-09-03
**Owner:** Agent Engineering

---

## 1. Task envelope

```json
{
  "task_id": "uuid",
  "requester": "kaya|human|system",
  "timestamp": "ISO8601",
  "product_context": "ticketiv|noa|mi|agency|ops",
  "source_system": "jira|n8n|telegram|...",
  "objective": "string",
  "constraints": ["string"],
  "evidence_references": ["url|id"],
  "authority_level": "read|write|approve|external",
  "priority": "critical|high|medium|low",
  "due": "ISO8601"
}
```

---

## 2. Result envelope

```json
{
  "task_id": "uuid",
  "agent": "delivery|engineer|analyst",
  "status": "accepted|working|blocked|completed|needs_approval",
  "outcome": "string",
  "actions_taken": ["string"],
  "evidence": ["url|id"],
  "confidence": 0.0-1.0,
  "unresolved_blockers": ["string"],
  "decision_required": "string|null",
  "next_step": "string"
}
```

---

## 3. Status definitions

| Status | Meaning |
|--------|---------|
| accepted | Agent accepted the task |
| working | Actively processing |
| blocked | Cannot proceed without input |
| completed | Work finished, no approval needed |
| needs_approval | Work finished, requires human approval |

---

## 4. Audit record

Every material action logs:
- Timestamp
- Agent identity
- Task reference
- Action taken
- Input source
- Outcome

---

## 5. Version history

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-09-03 | Agent Engineering | Initial release |
