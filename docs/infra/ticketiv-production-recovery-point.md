# Ticketiv production recovery point

This runbook records the verified current-state recovery point created on
2026-11-11. It supplements the general infrastructure backup procedure and is
specific to Supabase project `radsfmlsjznqvcpogluo`.

## Verified recovery point

| Item | Value |
|---|---|
| Backup timestamp | `20261111T174141Z` |
| GitHub Actions run | `43070063589` |
| Source commit | `ae8540b5cc13059d93655a1c82d42e3498e554ed` |
| Supabase PostgreSQL image | `public.ecr.aws/supabase/postgres:17.6.1.032` |
| Persistent directory | `/srv/eljaymedia/backups/ticketiv/20261111T174141Z` |
| Database archive SHA-256 | `7c4e142ebc171731f4f3244cc0cf361ea4c611bda138fe0aa02555acfadc05b9` |
| Storage archive SHA-256 | `f0990ed28c62fd91158cd9a47e822276aaa50eb5098a3909cecd6e34182f4d32` |
| Encryption | age X25519 |
| Recovery identity | `/srv/eljaymedia/secrets/backup/ticketiv/recovery.agekey` |

The recovery identity is root-owned with mode `600` and is stored separately
from the encrypted archives. GitHub has only the public recipient in the
`TICKETIV_BACKUP_AGE_RECIPIENT` repository variable. The transient Actions
artifact was deleted after transfer and checksum verification.

The database bundle contains:

- cluster roles;
- the production `auth` and `storage` managed schemas;
- application schema, functions, grants, RLS policies and triggers;
- application, Auth and Storage-metadata records;
- Supabase migration schema and migration history.

The Storage bundle is separate from the database bundle and contains every
object plus a path, size and SHA-256 manifest. It contains two buckets:

| Bucket | Public | Objects | Bytes |
|---|---:|---:|---:|
| `avatars` | yes | 0 | 0 |
| `event-covers` | yes | 8 | 11,963,708 |

## Verified restore evidence

The restore was performed in Docker network `ticketiv-recovery-net`, created
with `--internal`. The database had no published ports, no application or
scheduler container was attached, and `cron.job` contained zero jobs. No
external request could be sent from the recovery database.

| Record set | Restored count |
|---|---:|
| Organizers (`organizations`) | 1 |
| Orders | 39 |
| Payments | 30 |
| Payouts | 2 |
| Payout accounts | 2 |
| Ledger entries | 60 |
| Refunds | 0 |
| Auth users | 45 |
| Storage metadata objects | 8 |

Integrity checks passed with 238/238 foreign keys validated, 0 invalid indexes,
0 disabled user triggers, 305 public functions and 25 migration-history rows.
The latest recorded migration version is `20261108162246`.

The two reviewed payout rows were preserved exactly:

| Payout ID | Amount | Currency | Status |
|---|---:|---|---|
| `531aa7c1-6a07-4e4d-b0a2-efad7173ad4f` | 50,000 cents | SZL | paid |
| `80712fff-c451-49db-8906-9e1fd49da63d` | 893,100 cents | SZL | paid |

Both reviewed payout-account rows were present and retained their `enc:v2`
envelopes with key ID `2026-09b`. Their encrypted contents were not read or
printed.

All 8 Storage files passed size and SHA-256 validation against the encrypted
manifest. The restored database also contained exactly 2 bucket rows and 8
object-metadata rows.

## Repeatable recovery procedure

1. Select the recovery directory and verify both encrypted archives before
   decryption:

   ```bash
   cd /srv/eljaymedia/backups/ticketiv/20261111T174141Z
   sha256sum -c ticketiv-database-20261111T174141Z.tar.gz.age.sha256
   sha256sum -c ticketiv-storage-20261111T174141Z.tar.gz.age.sha256
   ```

2. Create a root-only temporary recovery directory on encrypted or ephemeral
   storage. Decrypt with the separately held age identity, extract both tar
   archives, and keep every decrypted file mode `600` or inside a mode `700`
   directory. Never place plaintext archives in persistent backup storage.

3. Pull the PostgreSQL image recorded above. Create a dedicated Docker network
   with `docker network create --internal`; start only the recovery database on
   that network and publish no ports. Use a disposable random database password.

4. Restore with `psql --single-transaction --set ON_ERROR_STOP=on` in this
   order:

   1. `roles.sql`
   2. `managed_schema.sql`
   3. `schema.sql`
   4. the two Auth triggers that call `public.grant_seeded_super_admin()` and
      `public.handle_new_user()` (defer these until the public functions exist)
   5. `SET session_replication_role = replica`
   6. `data.sql`
   7. `history_schema.sql`
   8. `history_data.sql`

   A raw Supabase PostgreSQL image contains pre-created managed schemas. In a
   disposable recovery database only, drop `auth` and `storage` with `CASCADE`
   before replaying `managed_schema.sql`. Never do this against production or a
   shared Supabase project.

5. Verify the counts in this document, both payout IDs and values, every
   foreign key's `convalidated` state, invalid indexes, public-function count
   and the migration-history count/latest version. Do not select
   `payout_accounts.details_encrypted`.

6. Extract the Storage archive and run:

   ```bash
   node scripts/verify-supabase-storage-backup.mjs /path/to/extracted/storage
   ```

   Compare its bucket/object counts with `storage.buckets` and
   `storage.objects` in the restored database.

7. Stop and remove only the explicitly named recovery container, volume and
   internal network. Securely erase decrypted archives, extracted SQL, Storage
   objects, restore logs and disposable database credentials. Retain the
   encrypted archives, checksum files, metadata and recovery identity.

## Configuration not recreated by database restore

The following must be recovered from their authorized secret/configuration
stores. Values must never be copied into this document.

- Supabase project URL, publishable/anon key, service-role key and management
  access token;
- Auth provider configuration, redirect URLs, SMTP settings and platform JWT
  configuration;
- database publications, platform extensions and scheduled jobs. The logical
  data dump intentionally does not copy `cron.job`; recreate reviewed jobs from
  migrations/configuration after restore;
- `PAYOUT_ENCRYPTION_KEY`, `PAYOUT_ENCRYPTION_KEY_ID` and any authorized
  previous-key keyring;
- Paystack, Deltapay, Flutterwave and MoMo payment/payout credentials, provider
  enablement flags and callback/webhook verification keys;
- application webhook, cron, ticket-token and internal-payment secrets;
- Resend/SMTP, SMS, WhatsApp, Web Push/VAPID, Apple Wallet and Google Wallet
  credentials;
- Chatwoot, PostHog, Sentry and Google Maps configuration;
- Upstash Redis credentials, operational alert targets and health URLs;
- Coolify application settings, deployment credentials, domain/TLS settings
  and Cloudflare DNS configuration;
- Edge Function source/configuration and any Edge Function secrets.

The repository and Coolify configuration are therefore required alongside the
encrypted database and Storage archives for a complete service recovery.

## Creating a newer recovery point

Run `.github/workflows/dump-production-schema.yml` manually on the reviewed
branch. It uses pinned Supabase CLI `3.0.0`, exports current database and
Storage state, encrypts before upload and keeps the artifact for one day. Move
the encrypted files to a new root-only timestamp directory, verify both
checksums, and delete the transient GitHub artifact. A recovery point is not
declared usable until this isolated restore procedure succeeds.
