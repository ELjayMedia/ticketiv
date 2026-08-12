# Payout account encryption — TICK-376

Payout bank details are sensitive PII. Ticketiv encrypts `payout_accounts.details_encrypted` server-side with AES-256-GCM before storage and never sends the raw details back to the browser.

## Write contract

New writes are **fail-closed**. They require both server-only variables:

- `PAYOUT_ENCRYPTION_KEY` — strong generated secret used to derive the AES-256 key.
- `PAYOUT_ENCRYPTION_KEY_ID` — non-secret stable identifier for that key, for example `2026-08-a`.

When either value is missing or invalid, Ticketiv refuses to create a payout account. It does not fall back to plaintext.

Current ciphertext is stored as `enc:v2:<key-id>:...`. The key id is encoded into the payload so rows remain decryptable after rotation.

## Backward compatibility

Reads remain compatible with:

- `enc:v1:` ciphertext written by the previous single-key implementation;
- legacy plaintext JSON rows, **read-only and only until they are re-encrypted**.

Legacy plaintext compatibility must not be treated as permission to create new plaintext rows. `encryptPayoutDetails()` can only return encrypted v2 payloads.

## Rotation

Use `PAYOUT_ENCRYPTION_PREVIOUS_KEYS` to retain old decryption keys while moving writes to a new key. The value is a server-only JSON object mapping old key ids to their old secrets, for example:

```text
{"2026-08-a":"<old-secret>"}
```

Safe rotation sequence:

1. Generate a new strong secret and a new unique key id. Do not reuse a key id with different key material.
2. Add the current/old secret to `PAYOUT_ENCRYPTION_PREVIOUS_KEYS` under its old id.
3. Set the new values as `PAYOUT_ENCRYPTION_KEY` and `PAYOUT_ENCRYPTION_KEY_ID` in every runtime that can read payout accounts.
4. Deploy and verify a controlled non-production round trip: new writes are `enc:v2`, old rows still render only their masked account reference, and no secret values appear in logs.
5. Re-encrypt rows that still use the old key to the new active key using a separately reviewed, dry-run-first migration procedure.
6. Count storage formats without printing `details_encrypted` values. Only after the old-key count reaches zero may that old key be removed from `PAYOUT_ENCRYPTION_PREVIOUS_KEYS`.

For legacy `enc:v1` rows, which have no key id, Ticketiv attempts the active key and retained previous keys. Keep the v1-producing key available until every v1 row has been re-encrypted.

## Production rollout gate

Do **not** rotate keys or rewrite live payout rows as part of a normal application deployment. Before live re-encryption:

- capture a backup/restore point and verify the recovery procedure;
- configure the new server-only key material without pasting it into Jira, GitHub, chat, logs, or screenshots;
- run the re-encryption procedure in dry-run mode and record counts only;
- explicitly approve the write pass;
- verify `legacy_plaintext_rows = 0`, then verify no v1/retired-key rows remain before removing old keys.

The application PR for TICK-376 intentionally does not change live secrets and does not mutate existing payout rows.

## Logging and audit boundaries

Never log decrypted payout details, ciphertext, encryption secrets, account numbers, branch codes or account-holder names. The payout-account audit entry records only the business action and provider; sensitive fields are excluded.
