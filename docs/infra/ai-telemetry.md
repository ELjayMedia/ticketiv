# EljayMedia Operations — AI Usage Telemetry & Budgets

**Version:** 1.0
**Effective:** 2026-09-03
**Owner:** Automation Engineering

---

## 1. Telemetry data captured

### Per AI invocation
- Workflow ID/name
- Product context
- Agent identity
- Model/provider used
- Reason for AI call
- Token usage (where available)
- Estimated cost
- Timestamp

### Storage
```sql
CREATE TABLE n8n_ai_telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id TEXT NOT NULL,
  workflow_name TEXT,
  product_context TEXT,
  agent TEXT,
  model_provider TEXT,
  model_name TEXT,
  reason TEXT,
  tokens_input INT,
  tokens_output INT,
  estimated_cost DECIMAL(10,4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_telemetry_workflow ON n8n_ai_telemetry(workflow_id);
CREATE INDEX idx_ai_telemetry_product ON n8n_ai_telemetry(product_context);
CREATE INDEX idx_ai_telemetry_agent ON n8n_ai_telemetry(agent);
CREATE INDEX idx_ai_telemetry_created ON n8n_ai_telemetry(created_at);
```

---

## 2. Budget controls

### Soft budget (warning)
- Monthly threshold per product/workflow
- Warning alert when 80% reached
- Notification to operations team

### Hard circuit breaker
- Monthly threshold (2x soft budget)
- Automatic workflow pause when exceeded
- Requires manual reset

### Per-workflow rate limits
- Max AI calls per hour: 60
- Max AI calls per day: 500
- Configurable per workflow

---

## 3. Avoided calls tracking

Count AI calls avoided through:
- Deduplication (same event fingerprint)
- State comparison (no material change)
- Known issue (playbook exists)
- Healthy event (no action needed)

---

## 4. Summary views

### Cost by product
```sql
SELECT product_context, SUM(estimated_cost) as total_cost
FROM n8n_ai_telemetry
WHERE created_at >= date_trunc('month', NOW())
GROUP BY product_context;
```

### Cost by agent
```sql
SELECT agent, SUM(estimated_cost) as total_cost
FROM n8n_ai_telemetry
WHERE created_at >= date_trunc('month', NOW())
GROUP BY agent;
```

---

## 5. Version history

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-09-03 | Automation Engineering | Initial release |
