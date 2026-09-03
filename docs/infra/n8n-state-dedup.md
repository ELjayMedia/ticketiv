# EljayMedia Operations — State, Deduplication & Idempotency Services

**Version:** 1.0
**Effective:** 2026-09-03
**Owner:** Automation Engineering

---

## 1. State store

### Persistent state requirements
- Event fingerprints (SHA-256 of normalized event)
- Last-seen state per source/product
- Suppression windows (configurable TTL)
- Correlation IDs for related events
- Last successful run timestamp
- Retry state per workflow

### Storage backend
Use existing PostgreSQL/Supabase for state persistence:
```sql
CREATE TABLE n8n_state_store (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_n8n_state_expires ON n8n_state_store(expires_at);
```

---

## 2. Deduplication

### Reusable sub-workflow
1. Compute event fingerprint (SHA-256 of normalized payload)
2. Check if fingerprint exists in state store
3. If exists → suppress (log and stop)
4. If new → store fingerprint with TTL, continue processing

### Suppression windows
- Default: 5 minutes for identical events
- Configurable per workflow/product
- Automatic expiry via TTL

---

## 3. Idempotency

### Critical actions require idempotency key
- Financial transactions
- Ticket creation
- Order processing
- Webhook deliveries

### Implementation
1. Generate idempotency key (UUID) before action
2. Check if key exists in state store
3. If exists → return cached result
4. If new → execute action, store result with key

---

## 4. Version history

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-09-03 | Automation Engineering | Initial release |
