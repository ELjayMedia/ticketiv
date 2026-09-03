# EljayMedia Operations — Production Webhook Security Baseline

**Version:** 1.0
**Effective:** 2026-09-03
**Owner:** Infrastructure Operations

---

## 1. Webhook inventory

| Webhook | Owner | Caller | Data classification | Auth method |
|---------|-------|--------|--------------------|-------------|
| Paystack | Finance | Paystack | Financial | HMAC-SHA-512 |
| WordPress | Editorial | WordPress | Content | HMAC-SHA256 |
| DeltaPay | Finance | DeltaPay | Financial | API key |
| Supabase | Engineering | Supabase | Database | JWT |

---

## 2. Security controls

### Authentication
- [ ] HMAC signature verification for all financial webhooks
- [ ] Provider-native signature verification where available
- [ ] Secret header/token for internal service calls
- [ ] JWT validation for authenticated endpoints

### Replay protection
- [ ] Timestamp validation (5-minute window)
- [ ] Idempotency key enforcement
- [ ] Duplicate detection via payload hash

### Rate limiting
- [ ] Cloudflare rate limiting rules
- [ ] n8n workflow-level throttling
- [ ] Per-source IP limits

### Payload validation
- [ ] Content-type enforcement (application/json)
- [ ] Maximum payload size (1MB default)
- [ ] Schema validation before processing
- [ ] Sanitization of logged data

---

## 3. Secure webhook template

```typescript
// Webhook handler template
export async function POST(request: Request) {
  // 1. Verify signature
  const signature = request.headers.get("x-webhook-signature");
  const rawBody = await request.text();
  
  if (!verifySignature(rawBody, signature, process.env.WEBHOOK_SECRET)) {
    return new Response("Invalid signature", { status: 401 });
  }
  
  // 2. Check timestamp (replay protection)
  const timestamp = request.headers.get("x-webhook-timestamp");
  if (Math.abs(Date.now() - Number(timestamp)) > 300_000) {
    return new Response("Request expired", { status: 401 });
  }
  
  // 3. Idempotency check
  const eventId = request.headers.get("x-webhook-id");
  if (await isDuplicate(eventId)) {
    return new Response("Already processed", { status: 200 });
  }
  
  // 4. Process payload
  const payload = JSON.parse(rawBody);
  await processWebhook(payload);
  
  return new Response("OK", { status: 200 });
}
```

---

## 4. Monitoring and alerting

- Failed authentication attempts logged
- Rate limit violations alerted
- Payload validation failures tracked
- Duplicate event detection monitored

---

## 5. Version history

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-09-03 | Infrastructure Operations | Initial release |
