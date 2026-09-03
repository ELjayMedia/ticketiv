# EljayMedia Operations — Deterministic Rules & Severity Scoring

**Version:** 1.0
**Effective:** 2026-09-03
**Owner:** Automation Engineering

---

## 1. Rule evaluation pattern

### Decision flow
```
Event received → Normalize → Evaluate rules → Route
```

### Rule categories
| Rule | Outcome |
|------|---------|
| Is healthy/no-action? | Log and stop |
| Is known issue? | Execute known remediation |
| Threshold breached? | Alert or auto-remediate |
| Meaningful change? | Update state, notify |
| Requires human? | Escalate to Kaya/Eljay |
| Needs agent? | Route to specialist |

---

## 2. Severity scoring

### Default severity mapping
| Source event type | Default severity |
|-------------------|-----------------|
| deployment_failed | critical |
| payment_failed | critical |
| security_alert | high |
| issue_blocked | high |
| deployment_succeeded | low |
| issue_created | medium |

### Configurable thresholds
- Per workflow
- Per product context
- Adjustable without code changes

---

## 3. AI_REQUIRED logic

Default: `AI_REQUIRED = false`

Only set to `true` when:
- Unknown failure fingerprint
- Semantic analysis required
- Research/interpretation needed
- Human-like judgement essential

---

## 4. Version history

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-09-03 | Automation Engineering | Initial release |
