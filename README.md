# Ticketiv – Full Stack Event Ticketing Platform

Ticketiv is an African-first ticketing suite that connects organisers, vendors, and fans across the continent. The platform ships with regional payment rails, scalable Supabase persistence, and role-based dashboards so that teams can launch, monetise, and operate live experiences without stitching tools together.

## Tech Stack

| Layer | Technology | Notes |
| --- | --- | --- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript | Responsive client with streaming layouts and client/server components. |
| Styling | Tailwind CSS v4, shadcn/ui, Radix primitives | Design system tuned for dark/light theming and motion. |
| Data | Supabase (Postgres, Auth, Storage) | Managed Postgres schema, RLS policies, real-time subscriptions. |
| Payments | DeltaPay, Paystack, Flutterwave adapters | Regional payment orchestration with webhooks for settlement. |
| Deployment | Vercel (frontend) + Supabase (backend) | Zero-config CI/CD, environment promotion, edge caching. |

> **Deployment notes**: The repository is optimised for Vercel previews backed by a shared Supabase project. Configure staging and production environments with separate Supabase instances and payment credentials, and promote builds once smoke-tests pass.

## Platform Capabilities

### 🎟️ Attendee Experience
- Curated browse surfaces for events, artists, and categories with rich search and filters.
- Mobile-ready checkout that handles ticket quantity, tier selection, and secure payments.
- Personal dashboard for managing upcoming events, downloads, and payment receipts.

### 🧑‍💼 Organizer Workspace
- Event management flows covering draft publishing, pricing controls, and inventory.
- Settlement and payout tracking with reconciliation views for DeltaPay, Paystack, and Flutterwave transactions.
- Role-aware navigation shared across organiser sub-routes and API handlers for orders/payouts.

### 📱 Scanner Tools
- Web-based validation console for QR codes or manual ticket codes via `/scanner/scan`.
- API endpoints for instant ticket verification and audit logging of entry attempts.
- Real-time feedback states to keep gate staff moving during peak check-in windows.

### 🛡️ Platform Administration
- Supabase policies enforcing least-privilege access for events and tickets.
- Admin-only tooling hooks for suspending events, refunding orders, and rotating API keys.
- Observability touchpoints (Supabase logs, Vercel analytics) to monitor platform health.

## Supabase Data Model

| Table | Purpose | Key Columns |
| --- | --- | --- |
| `events` | Stores public event metadata and ticket inventory. | `title`, `description`, `date`, `location`, `price`, `tickets_available`, `category`, `created_at`, `updated_at` |
| `tickets` | Records purchases and links them to Supabase Auth users. | `user_id`, `event_id`, `quantity`, `total`, `ticket_number`, `purchase_date`, `created_at` |
| `user_role` enum | Distinguishes attendee vs. admin profiles. | Values: `user`, `admin` |

All tables are protected with Row Level Security. Events are publicly readable, while tickets are only readable/insertable by the owning authenticated user. Indexed columns (`category`, `date`, `user_id`, `event_id`, `created_at`) keep queries fast at scale.

## User Journeys

- **Attendee**: Discover events → authenticate via Supabase → checkout with preferred regional payment rail → receive ticket confirmation → manage tickets from the dashboard.
- **Organizer**: Authenticate as organiser → create or edit events → monitor orders and payouts → export reports for finance reconciliation.
- **Scanner**: Access the scanner console → validate QR code or manual ticket input → check Supabase-backed validity response → admit attendee or flag issue.
- **Platform Admin**: Authenticate with elevated role → manage global settings, payment credentials, and policy enforcement → audit logs and respond to support tickets.

## Supabase Integration Steps

1. **Provision Supabase** – Create a project, secure the database password, and note the project URL, anon key, and service role key from **Settings → API**.
2. **Run the schema** – Execute the SQL from [`SUPABASE_SETUP.md`](SUPABASE_SETUP.md) to create the `user_role` enum, `events`, and `tickets` tables, apply indexes, and register the `update_events_updated_at` trigger.
3. **Configure Auth** – Enable email sign-in and register redirect URLs for local (`http://localhost:3000/...`) and production domains.
4. **Seed catalogue data** – Use the provided insert statements (or your own CSV imports) to load initial events so the public marketplace renders meaningful content.
5. **Wire credentials** – Populate the environment variables described below, ensuring that service role keys stay on the server only.
6. **Connect the app** – Replace the mock data helpers with Supabase client queries inside the data loaders (`lib/events.ts`, `lib/orders.ts`, etc.), and subscribe to real-time channels where required.
7. **Validate flows** – Run the end-to-end journeys locally, verifying Supabase rows, payment webhook callbacks, and scanner validation responses before promoting to staging.

## Project Structure

```
ticketiv/
├── app/
│   ├── (app)/checkout/               # Authenticated attendee checkout
│   ├── (app)/dashboard/              # Attendee ticket management
│   ├── (auth)/login|signup/          # Supabase-auth powered forms
│   ├── (organizer)/events|payouts/   # Organizer dashboards and ledgers
│   ├── (public)/…                    # Marketing, browse, categories, artists
│   ├── (scanner)/scan/               # Entry validation console
│   ├── api/                          # Route handlers for orders, payouts, scanner
│   └── layout.tsx                    # Root layout and providers
├── components/
│   ├── events/                       # Cards, sliders, detail sections
│   ├── forms/                        # Reusable form patterns (auth, organiser)
│   ├── tickets/                      # Ticket UI fragments
│   └── ui/                           # shadcn/ui wrappers and primitives
├── lib/
│   ├── events.ts, orders.ts, payouts.ts, scanning.ts  # Data access helpers
│   ├── supabase.ts & supabase-server.ts               # Supabase clients (browser/server)
│   └── utils.ts, navigation.ts, pricing.ts            # Cross-cutting utilities
├── public/                           # Static assets and favicons
├── styles/                           # Tailwind entrypoints and tokens
├── types/                            # Shared TypeScript types
├── SUPABASE_SETUP.md                 # SQL migrations and integration guidance
├── DEPLOYMENT.md                     # Vercel + Supabase deployment playbook
└── …                                 # Config files (Next, PostCSS, TypeScript, etc.)
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Supabase project with database schema applied
- Credentials for at least one payment provider (DeltaPay, Paystack, or Flutterwave)

### Installation

```bash
git clone <your-repo-url>
cd ticketiv
pnpm install
# or npm install
```

### Environment Variables

Create an `.env.local` file and supply the following values:

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL used on both client and server. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Public anon key for client-side requests. |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ (server-only) | Service role key for server route handlers and background jobs. |
| `NEXT_PUBLIC_APP_URL` | ✅ | Base URL for constructing callbacks (e.g., `http://localhost:3000`). |
| `DELTAPAY_PUBLIC_KEY` | ✅ (if enabled) | Public key for DeltaPay checkout. |
| `DELTAPAY_SECRET_KEY` | ✅ (server-only) | Secret key for verifying DeltaPay webhooks. |
| `PAYSTACK_PUBLIC_KEY` | ✅ (if enabled) | Public key for Paystack inline payments. |
| `PAYSTACK_SECRET_KEY` | ✅ (server-only) | Secret key for Paystack server-side verification. |
| `FLUTTERWAVE_PUBLIC_KEY` | ✅ (if enabled) | Public key for Flutterwave checkout. |
| `FLUTTERWAVE_SECRET_KEY` | ✅ (server-only) | Secret key for Flutterwave webhook validation. |
| `GOOGLE_MAPS_EMBED_KEY` | ✅ (server-only) | Server-side key used by the Google Maps embed proxy. |
| `NODE_ENV` | Optional | Runtime mode (`development`, `production`). |

> Store server-only secrets in Vercel's encrypted environment variable manager. Never expose service role or payment secret keys in client bundles.

### Run Locally

```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) and complete the attendee and organiser journeys. Use Supabase Studio to confirm that events and tickets are persisted as expected.

## Deployment

1. Push the repository to GitHub (or your preferred Git provider).
2. Import the project into Vercel and select the Next.js framework preset.
3. In Vercel, add all environment variables from the table above for **Production**, **Preview**, and **Development** scopes as needed.
4. Point your production build at the production Supabase project and live payment credentials; keep staging and preview builds on sandbox keys.
5. Trigger a deployment. Vercel will build the Next.js app, while Supabase hosts the database and auth services.
6. Configure Supabase auth redirect URLs for each environment (e.g., `https://<project>.vercel.app/browse`, `https://<project>.vercel.app/dashboard`).
7. Validate DeltaPay/Paystack/Flutterwave webhook endpoints against your `/api/orders` and `/api/payouts` handlers before announcing availability.

## Maintenance Checklist

- Monitor Supabase logs and RLS policies when adjusting schema migrations.
- Rotate payment provider keys on a scheduled cadence and update Vercel secrets accordingly.
- Use Vercel Analytics and Supabase real-time feeds to watch conversion funnels and entry scans in real time.

## Contributing

Contributions are welcome! Please open an issue or pull request with context about the regions and payment rails you are targeting so we can validate compliance requirements.

## License

MIT License. Use, adapt, and deploy across your event ecosystems.
