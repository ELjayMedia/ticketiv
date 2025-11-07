# Supabase Integration Guide

This guide covers integrating Supabase for authentication and data persistence.

## Current State (Demo)

The app currently uses localStorage for demo purposes. This is perfect for testing the UI without backend infrastructure.

## Transitioning to Supabase

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up / log in
4. Create a new project:
   - **Name**: `ticketiv`
   - **Database Password**: Strong password (save it!)
   - **Region**: Closest to your users
5. Wait for project to initialize (2-3 minutes)

### Step 2: Get API Keys

1. Go to **Settings** → **API**
2. Copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY`
3. Add to `.env.local`:

\`\`\`
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
\`\`\`

### Step 3: Create Database Schema

1. Go to **SQL Editor**
2. Click **New Query**
3. Paste and run:

\`\`\`sql
-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('user', 'admin');

-- Events table
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

-- Tickets table
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

-- Enable Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Policies for events (public read)
CREATE POLICY "Events are readable by everyone" ON events
  FOR SELECT
  USING (true);

-- Policies for tickets (user-specific)
CREATE POLICY "Users can view their own tickets" ON tickets
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create tickets for themselves" ON tickets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_date ON events(date DESC);
CREATE INDEX idx_tickets_user_id ON tickets(user_id);
CREATE INDEX idx_tickets_event_id ON tickets(event_id);
CREATE INDEX idx_tickets_created_at ON tickets(created_at DESC);

-- Create updated_at trigger
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

4. Click **Run**

### Step 4: Configure Authentication

1. Go to **Authentication** → **Providers**
2. Ensure **Email** is enabled
3. Go to **URL Configuration**
4. Add redirect URLs:
   - `http://localhost:3000/browse`
   - `http://localhost:3000/dashboard`
   - `https://your-domain.com/browse`
   - `https://your-domain.com/dashboard`

### Step 5: Update Application Code

#### 1. Authentication (app/(main)/layout.tsx)

Replace localStorage-based auth with Supabase:

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

#### 2. Event Fetching (app/(main)/browse/page.tsx)

Replace mock data with Supabase query:

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

#### 3. Ticket Creation (app/(main)/checkout/[id]/page.tsx)

Save ticket to Supabase:

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
-- Add more as needed
\`\`\`

### Step 7: Test Integration

1. Start development server: `npm run dev`
2. Go to `http://localhost:3000`
3. Sign up with test account
4. Browse events
5. Purchase a ticket
6. Check Supabase dashboard to verify data saved

## Useful Supabase Features

### Real-time Updates

Subscribe to ticket changes:

\`\`\`typescript
const subscription = supabase
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'tickets' },
    (payload) => {
      // Update UI with new ticket
    }
  )
  .subscribe()
\`\`\`

### Row Level Security (RLS)

Already configured! Users can only:
- View all events
- View their own tickets
- Create tickets for themselves

### Database Webhooks

Set up webhooks to:
- Send email confirmations
- Trigger event notifications
- Sync to external services

Go to **Database** → **Webhooks**

## Performance Tips

1. **Add indexes** (already done in schema)
2. **Use real-time subscriptions** instead of polling
3. **Implement pagination** for large result sets
4. **Cache events** client-side with SWR
5. **Use select()** to only fetch needed columns

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

## Migration from localStorage

Once Supabase is set up:

1. Existing localStorage tickets are local-only
2. Users can continue using app with localStorage
3. New purchases go to Supabase
4. Optional: Migrate old data manually

## Support & Documentation

- [Supabase Docs](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
- [GitHub Issues](https://github.com/supabase/supabase/issues)
