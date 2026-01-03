# Supabase Integration Guide

This guide walks through the production-ready Supabase setup that powers Ticketiv across attendees, organisers, scanner agents, and platform admins. Follow each step to provision the database schema, secure authentication, and connect the Next.js application.

## Current State

The application ships with Supabase integration for authentication, event data, ticketing, and scanning workflows.

\`\`\`sql
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

-- Orders used by payouts + scanner validation
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL,
  event_title TEXT NOT NULL,
  attendee_name TEXT NOT NULL,
  attendee_email TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  pricing_subtotal DECIMAL(10, 2) NOT NULL CHECK (pricing_subtotal >= 0),
  pricing_fees DECIMAL(10, 2) NOT NULL CHECK (pricing_fees >= 0),
  pricing_total DECIMAL(10, 2) NOT NULL CHECK (pricing_total >= 0),
  pricing_currency TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  scanned_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Security configuration
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events are readable by everyone" ON events
  FOR SELECT USING (true);

CREATE POLICY "Users can view their own tickets" ON tickets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create tickets for themselves" ON tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Orders readable by organiser routes" ON orders
  FOR SELECT USING (true);

CREATE POLICY "Orders insertable by organiser routes" ON orders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Order items readable by scanner routes" ON order_items
  FOR SELECT USING (true);

CREATE POLICY "Order items insertable by organiser routes" ON order_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Order items updatable for scan status" ON order_items
  FOR UPDATE USING (true) WITH CHECK (true);

-- Performance indexes
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_date ON events(date DESC);
CREATE INDEX idx_tickets_user_id ON tickets(user_id);
CREATE INDEX idx_tickets_event_id ON tickets(event_id);
CREATE INDEX idx_tickets_created_at ON tickets(created_at DESC);
CREATE INDEX idx_orders_event_id ON orders(event_id);
CREATE INDEX idx_orders_attendee_email ON orders(attendee_email);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_code ON order_items(code);

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
\`\`\`

Run the migration once per environment (development, staging, production). Subsequent schema changes should be versioned via SQL migration files or the Supabase migration CLI to keep environments aligned.

## 3. Configure Authentication

1. Navigate to **Authentication → Providers** and ensure **Email** sign-in is enabled. Add social providers if required by your rollout plan.
2. In **Authentication → URL Configuration**, register redirect URLs for local development and each deployed environment:
   - `http://localhost:3000/browse`
   - `http://localhost:3000/dashboard`
   - `https://your-domain.com/browse`
   - `https://your-domain.com/dashboard`

### Step 5: Review Application Code

#### 1. Authentication (components/ui/workspace-shell.tsx)

Authentication is powered by Supabase Auth sessions handled in the workspace shell:

\`\`\`typescript
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState } from 'react'

export default function MainLayout({ children }) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
      } else {
        setUser(session.user)
      }
      setLoading(false)
    }
    getSession()
  }, [])

  // ... rest of component
}
\`\`\`

#### 2. Event Fetching (lib/events.ts)

Event data is queried from Supabase with helpers that power both server and client components:

\`\`\`typescript
import { createBrowserClient } from '@supabase/ssr'

export default function BrowsePage() {
  const [events, setEvents] = useState([])
  const supabase = createBrowserClient(...)

  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true })

      if (error) console.error(error)
      else setEvents(data)
    }
    fetchEvents()
  }, [])

  // ... rest of component
}
\`\`\`

#### 3. Ticket Creation (lib/orders.ts)

Checkout uses Supabase server actions to persist orders, calculate fees, and mint tickets:

\`\`\`typescript
const { data, error } = await supabase
  .from('tickets')
  .insert({
    user_id: user.id,
    event_id: eventId,
    quantity,
    total,
    ticket_number: `TICKET-${Date.now()}`
  })
\`\`\`

#### 4. Dashboard (app/(main)/dashboard/page.tsx)

Fetch user's tickets:

\`\`\`typescript
const { data: tickets } = await supabase
  .from('tickets')
  .select('*')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })
\`\`\`

### Step 6: Seed Initial Data (Optional)

Add demo events to your database:

1. Go to **SQL Editor**
2. Run:

\`\`\`sql
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
\`\`\`

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

### Auth Not Working
- Verify redirect URLs in Supabase settings
- Check anon key is correct
- Ensure email provider is enabled

### No Data Showing
- Check RLS policies
- Verify tables exist in database
- Run SQL queries manually to test

### Slow Performance
- Add indexes (SQL provided)
- Check query performance in Supabase logs
- Consider enabling caching

## Security Considerations

1. **Never expose service role key** on client
2. **Always use RLS** to protect data
3. **Validate input** before sending to database
4. **Use HTTPS** in production
5. **Rotate secrets** regularly
6. **Monitor suspicious activity** in logs

## Legacy localStorage Data

Earlier versions of Ticketiv stored demo data in `localStorage`. The current implementation persists all records in Supabase. If you have legacy browser data you wish to keep, migrate it manually into the relevant Supabase tables.

## Useful References

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
