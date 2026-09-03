# EljayMedia Operations — Security Hardening Baseline

**Version:** 1.0
**Effective:** 2026-09-03
**Owner:** Infrastructure Operations

---

## 1. Server hardening

### SSH configuration
- [ ] Key-only authentication (disable password auth)
- [ ] Root SSH disabled
- [ ] Admin users are intentional and documented
- [ ] SSH on non-standard port (optional)

### OS updates
- [ ] Automatic security updates enabled
- [ ] Unattended-upgrades configured
- [ ] Regular patching schedule defined

### Firewall
- [ ] UFW/iptables configured
- [ ] Only approved ports exposed (SSH, Cloudflare Tunnel)
- [ ] Oracle Cloud network security groups aligned

---

## 2. Docker security

- [ ] No unnecessary privileged containers
- [ ] Host mounts minimized and read-only where possible
- [ ] Container resource limits defined
- [ ] Health checks configured for all services
- [ ] Images tagged and version-pinned

---

## 3. Network security

- [ ] Databases on private Docker network only
- [ ] No database ports exposed to internet
- [ ] Application access via Cloudflare Tunnel
- [ ] Cloudflare Access for admin surfaces
- [ ] DNS records proxied through Cloudflare

---

## 4. Access control

| Access level | Who | Method |
|-------------|-----|--------|
| Server SSH | Infrastructure team | Key-only |
| Docker management | Infrastructure team | SSH + local |
| Application admin | App owners | Cloudflare Access |
| Database admin | DBAs | Private network + VPN |
| Backup access | Infrastructure team | Service account |

---

## 5. Secret management

- [ ] No secrets in source control
- [ ] Environment files server-side only
- [ ] Secrets rotated after team changes
- [ ] Backup encryption for secret stores

---

## 6. Monitoring and alerting

- [ ] Uptime monitoring (Uptime Kuma)
- [ ] Failed login alerts
- [ ] Resource usage alerts
- [ ] Backup failure alerts

---

## 7. Version history

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-09-03 | Infrastructure Operations | Initial release |
