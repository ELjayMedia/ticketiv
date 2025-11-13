# Supabase Integration Guide

This guide walks through the production-ready Supabase setup that powers Ticketiv across attendees, organisers, scanner agents, and platform admins. Follow each step to provision the database schema, secure authentication, and connect the Next.js application.

## 1. Create Your Supabase Project

1. Visit [supabase.com](https://supabase.com) and create a project named `ticketiv` (or reuse an existing workspace).
2. Choose the region closest to your primary audience and define a strong database password.
3. Once the project is ready, open **Settings → API** and copy the **Project URL**, **anon key**, and **service_role key**. You will reference these values when configuring environment variables.

## 2. Apply the Core Schema

Open the **SQL Editor**, create a new query, and run the migration below. It sets up the `user_role` enum, core tables, security policies, indexes, and triggers that keep the platform responsive.

```sql
-- Enum for platform roles
CREATE TYPE user_role AS ENUM ('user', 'admin');

-- Events catalogue
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  full_description TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  end_time TIME NOT NULL,
  location TEXT NOT NULL,
  venue TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  image_url TEXT,
  category TEXT NOT NULL,
  attendees INTEGER DEFAULT 0 CHECK (attendees >= 0),
  tickets_available INTEGER NOT NULL CHECK (tickets_available >= 0),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Ticket purchases linked to Supabase Auth users
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  total DECIMAL(10, 2) NOT NULL CHECK (total >= 0),
  ticket_number TEXT UNIQUE NOT NULL,
  purchase_date TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Security configuration
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events are readable by everyone" ON events
  FOR SELECT USING (true);

CREATE POLICY "Users can view their own tickets" ON tickets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create tickets for themselves" ON tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Performance indexes
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_date ON events(date DESC);
CREATE INDEX idx_tickets_user_id ON tickets(user_id);
CREATE INDEX idx_tickets_event_id ON tickets(event_id);
CREATE INDEX idx_tickets_created_at ON tickets(created_at DESC);

-- Trigger keeps updated_at current
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

Run the migration once per environment (development, staging, production). Subsequent schema changes should be versioned via SQL migration files or the Supabase migration CLI to keep environments aligned.

## 3. Configure Authentication

1. Navigate to **Authentication → Providers** and ensure **Email** sign-in is enabled. Add social providers if required by your rollout plan.
2. In **Authentication → URL Configuration**, register redirect URLs for local development and each deployed environment:
   - `http://localhost:3000/browse`
   - `http://localhost:3000/dashboard`
   - `https://<your-vercel-domain>/browse`
   - `https://<your-vercel-domain>/dashboard`

## 4. Seed Initial Data (Optional)

Populate the catalogue with representative events so stakeholders can demo the full experience. In the SQL Editor, run inserts such as:

```sql
INSERT INTO events (title, description, full_description, date, time, end_time, location, venue, price, category, attendees, tickets_available) VALUES
(
  'Tech Conference 2025',
  'Join industry leaders for a day of innovation and networking',
  'Experience the future of technology at our annual conference. Featuring keynote speakers from leading tech companies...',
  '2025-03-15',
  '09:00',
  '17:00',
  'San Francisco, CA',
  'Moscone Center, 747 Howard St',
  199,
  'Conference',
  1250,
  850
),
(
  'Summer Music Festival',
  'Three days of live music from your favorite artists',
  'Celebrate summer with three days of non-stop music...',
  '2025-06-21',
  '14:00',
  '23:00',
  'Los Angeles, CA',
  'Hollywood Park Grounds, Los Angeles, CA',
  89,
  'Festival',
  8500,
  2100
);
```

Replace these with your own events or import CSV data using Supabase's table editor.

## 5. Wire Environment Variables

Add the Supabase keys and payment provider credentials to `.env.local` for local development and to Vercel for hosted environments:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `DELTAPAY_PUBLIC_KEY`, `DELTAPAY_SECRET_KEY`
- `PAYSTACK_PUBLIC_KEY`, `PAYSTACK_SECRET_KEY`
- `FLUTTERWAVE_PUBLIC_KEY`, `FLUTTERWAVE_SECRET_KEY`

Keep service role and secret keys server-side only. Use Vercel's environment management to scope secrets per environment.

## 6. Connect the Next.js Application

1. Use the Supabase client helpers in `lib/supabase.ts` (client) and `lib/supabase-server.ts` (server) to query the `events` and `tickets` tables.
2. Replace any remaining mock helpers with `supabase.from("events")` or `supabase.from("tickets")` queries.
3. Update organiser and scanner routes (`app/api/orders`, `app/api/payouts`, `app/api/scanner`) to read and write via Supabase rather than stubbed responses.
4. Subscribe to `postgres_changes` for tickets if you need real-time dashboards.

## 7. Test the Integration End-to-End

- Run `pnpm dev` and create an attendee account via the Supabase-auth forms.
- Complete a checkout using sandbox credentials for your chosen payment provider.
- Validate that tickets appear in the Supabase dashboard and can be scanned via `/scanner/scan`.
- Review Supabase logs and Vercel serverless logs for errors before deploying to production.

## Troubleshooting

- **Auth issues**: Double-check redirect URLs, domain whitelists, and that the anon key matches the active environment.
- **Permission errors**: Inspect RLS policies and confirm the authenticated user owns the requested `tickets` rows.
- **Webhook failures**: Ensure payment provider callbacks target the deployed API routes and include required headers for signature validation.

## Useful References

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
