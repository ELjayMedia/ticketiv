# EljayMedia Operations — Google Drive Backup Configuration

**Version:** 1.0
**Effective:** 2026-09-03
**Owner:** Infrastructure Operations

---

## 1. Backup scope

| Data | Method | Frequency | Retention |
|------|--------|-----------|-----------|
| Perfex CRM database | mariabackup | Daily | 30 days |
| n8n workflow definitions | JSON export + Git | On change | Forever |
| Application volumes | rsync | Daily | 30 days |
| Cloudflare config | API export | Weekly | 90 days |
| Server config (Docker Compose, env templates) | Git | On change | Forever |
| TLS certificates | rsync | Daily | 90 days |

---

## 2. Backup flow

1. **Daily automated backup script** (`/srv/eljaymedia/infra/scripts/backup.sh`):
   - Dump Perfex database to compressed SQL
   - Export n8n workflows to JSON
   - rsync application volumes to backup directory
   - Sync to Google Drive via `rclone`

2. **Weekly config export**:
   - Export Cloudflare DNS/settings
   - Commit infrastructure changes to Git

3. **Monthly verification**:
   - Test restore of a random backup file
   - Verify backup integrity (checksums)

---

## 3. Google Drive structure

```
/EljayMediaBackups/
├── daily/
│   ├── perfex/
│   ├── n8n/
│   └── volumes/
├── weekly/
│   └── cloudflare/
└── monthly/
    └── full-system/
```

---

## 4. Security

- Backups encrypted at rest
- Access restricted to infrastructure team
- No secrets in plain text in backups

---

## 5. Version history

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-09-03 | Infrastructure Operations | Initial release |
