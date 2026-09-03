# EljayMedia Operations — Incident Fingerprint Catalogue

**Version:** 1.0
**Effective:** 2026-09-03
**Owner:** Automation Engineering

---

## 1. Fingerprint format

```json
{
  "fingerprint": "sha256(normalized_error_signature)",
  "source": "sentry|vercel|github|manual",
  "pattern": "error_pattern_regex",
  "tolerance": "exact|fuzzy|regex"
}
```

---

## 2. Catalogue entries

### Entry structure
```json
{
  "id": "uuid",
  "fingerprint": "string",
  "title": "string",
  "root_cause": "string",
  "affected_systems": ["string"],
  "safe_checks": ["string"],
  "remediation_steps": ["string"],
  "remediation_type": "auto|human_approved|diagnosis_only",
  "verification": "string",
  "rollback": "string",
  "version": "1.0",
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

---

## 3. Remediation types

| Type | Description | Execution |
|------|-------------|-----------|
| auto | Safe to run without approval | n8n executes immediately |
| human_approved | Requires operator confirmation | n8n pauses for approval |
| diagnosis_only | No automated fix | Engineer Agent notified |

---

## 4. Version control

- All changes auditable
- Rollback to previous version available
- Stale playbooks flagged after 90 days without match

---

## 5. Version history

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-09-03 | Automation Engineering | Initial release |
