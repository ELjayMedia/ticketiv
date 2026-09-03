# EljayMedia Operations — Backup & Recovery Testing Procedure

**Version:** 1.0
**Effective:** 2026-09-03
**Owner:** Infrastructure Operations

---

## 1. Recovery objectives

| Metric | Target | Notes |
|--------|--------|-------|
| RPO (Recovery Point Objective) | 24 hours | Daily backups acceptable for MVP |
| RTO (Recovery Time Objective) | 4 hours | Time to restore core services |
| Backup retention | 30 days | Daily snapshots, weekly full |

---

## 2. Backup coverage

| Service | Backup method | Frequency | Location |
|---------|--------------|-----------|----------|
| MariaDB (OPS-23) | mariabackup | Daily | Google Drive |
| PostgreSQL (OPS-24) | pg_dump | Daily | Google Drive |
| n8n workflows | Export + Git | On change | GitHub + Google Drive |
| Application volumes | rsync | Daily | Google Drive |
| Cloudflare config | API export | Weekly | Google Drive |
| Server config | Git | On change | GitHub |

---

## 3. Recovery runbook

### 3.1 Server rebuild
1. Provision new Oracle VM (Ubuntu 22.04)
2. Install Docker + Docker Compose
3. Clone infrastructure repo: `git clone [infra-repo] /srv/eljaymedia`
4. Restore `.env` secrets from secure backup
5. Start core stack: `docker compose up -d`
6. Validate services respond

### 3.2 Database restore
1. Stop application services
2. Restore from latest backup:
   - MariaDB: `mariabackup --target-dir=/restore --backup-id=latest`
   - PostgreSQL: `pg_restore -d [db] latest.dump`
3. Validate data integrity
4. Restart application services

### 3.3 Full stack recovery
1. Follow server rebuild steps
2. Follow database restore steps
3. Restore application volumes: `rsync -av /backup/volumes/ /var/lib/docker/volumes/`
4. Validate all services start and authenticate
5. Update Cloudflare DNS if IP changed
6. Run health checks

---

## 4. Testing schedule

- **Monthly:** Non-destructive restore test in isolated environment
- **Quarterly:** Full disaster recovery drill
- **After major changes:** Validate backup integrity

---

## 5. Version history

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-09-03 | Infrastructure Operations | Initial release |
