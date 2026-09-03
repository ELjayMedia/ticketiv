# EljayMedia Operations — Retry, Dead-Letter & Health Monitoring

**Version:** 1.0
**Effective:** 2026-09-03
**Owner:** Automation Engineering

---

## 1. Retry/backoff sub-workflow

### Bounded retry policy
- Max 3 attempts for transient failures
- Exponential backoff: 30s, 2min, 10min
- No retry for auth/permanent failures
- Idempotency key preserved across retries

---

## 2. Dead-letter queue

### When events land in DLQ
- Max retries exhausted
- Payload permanently invalid
- Target system unreachable after timeout

### DLQ record
```json
{
  "original_event": {},
  "attempts": 3,
  "failure_reason": "string",
  "correlation_id": "uuid",
  "failed_at": "ISO8601",
  "replayable": true
}
```

### Replay procedure
1. Fix root cause
2. Select DLQ entries for replay
3. Replay with same correlation ID
4. Audit trail preserved

---

## 3. Health monitoring

### Critical workflow health
- Alert if workflow hasn't run in expected window
- Alert if dead-letter backlog > threshold
- Alert if error rate exceeds baseline

### Deduplication
- Same alert suppressed for 15 minutes
- Escalation if unresolved after 1 hour

---

## 4. Version history

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-09-03 | Automation Engineering | Initial release |
