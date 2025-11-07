# Deployment Guide - Ticketiv

This guide covers deploying Ticketiv to Vercel with Supabase integration.

## Prerequisites

- A GitHub account with your repository pushed
- A Vercel account (free at [vercel.com](https://vercel.com))
- A Supabase account (free at [supabase.com](https://supabase.com))

## Step 1: Prepare Supabase (Optional for Demo)

If you want to use Supabase for production:

### Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Save your project URL and anon key from the API settings
3. Create the following tables:

\`\`\`sql
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
  price DECIMAL NOT NULL,
  image_url TEXT,
  category TEXT NOT NULL,
  attendees INTEGER DEFAULT 0,
  tickets_available INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tickets table
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  total DECIMAL NOT NULL,
  ticket_number TEXT UNIQUE NOT NULL,
  purchase_date TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Events are readable by everyone" ON events
  FOR SELECT USING (true);

CREATE POLICY "Tickets are readable by owner" ON tickets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Tickets are creatable by authenticated users" ON tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_tickets_user_id ON tickets(user_id);
CREATE INDEX idx_tickets_event_id ON tickets(event_id);
\`\`\`

4. Seed initial events (optional):

\`\`\`sql
INSERT INTO events (title, description, full_description, date, time, end_time, location, venue, price, category, attendees, tickets_available) VALUES
('Tech Conference 2025', 'Join industry leaders for a day of innovation', '...', '2025-03-15', '09:00', '17:00', 'San Francisco, CA', 'Moscone Center', 199, 'Conference', 1250, 850),
-- Add more events...
;
\`\`\`

## Step 2: Deploy to Vercel

### Option A: Automatic Deployment (Recommended)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Select "Import Git Repository"
3. Find your `ticketiv` repository
4. Click "Import"
5. Configure the project:
   - **Project Name**: `ticketiv` (or your choice)
   - **Framework Preset**: Next.js
   - Click "Deploy"

### Option B: Manual Deployment via CLI

1. Install Vercel CLI:
\`\`\`bash
npm i -g vercel
\`\`\`

2. Deploy:
\`\`\`bash
vercel
\`\`\`

3. Follow the prompts to connect your GitHub repository

## Step 3: Configure Environment Variables

1. In your Vercel project dashboard, go to **Settings** → **Environment Variables**
2. Add the following variables:

\`\`\`
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
NODE_ENV=production
\`\`\`

3. Click "Save" and trigger a redeployment

## Step 4: Update Auth Redirects

In Supabase, update your auth configuration:

1. Go to **Authentication** → **URL Configuration**
2. Add redirect URLs:
   - `https://your-project.vercel.app/browse`
   - `https://your-project.vercel.app/dashboard`
   - `http://localhost:3000/browse` (for local development)

## Step 5: Verify Deployment

1. Visit your Vercel deployment URL
2. Test the authentication flow
3. Create a test account and purchase a ticket
4. Check the Supabase dashboard to verify data is being saved

## Troubleshooting

### 401 Unauthorized Errors
- Check that `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct
- Verify RLS policies in Supabase are set correctly

### Data Not Appearing
- Check that Supabase credentials are set in Vercel environment variables
- Verify RLS policies aren't blocking reads
- Check browser console for error messages

### Slow Performance
- Enable Vercel Analytics to identify bottlenecks
- Add database indexes (see SQL above)
- Consider enabling Supabase caching

### Build Failures
- Check Vercel build logs
- Ensure all environment variables are set
- Try clearing `.next` and rebuilding locally

## Monitoring & Maintenance

### Enable Analytics

1. In Vercel dashboard, go to **Analytics**
2. Enable **Web Analytics** and **Edge Requests**
3. Monitor performance metrics

### Set Up Error Tracking

Vercel automatically captures errors. View them in:
- Vercel Dashboard → **Deployments** → **Logs**
- Browser console for client-side errors

### Database Monitoring

In Supabase:
1. Go to **Logs** to view query performance
2. Check **Database** → **Replication** for sync status
3. Monitor **Auth** → **Users** for user activity

## Updating the Deployment

### Push Changes to GitHub

1. Commit your changes:
\`\`\`bash
git add .
git commit -m "Your commit message"
\`\`\`

2. Push to GitHub:
\`\`\`bash
git push origin main
\`\`\`

3. Vercel automatically redeploys on push to main branch

### Manual Redeployment

In Vercel dashboard:
1. Go to **Deployments**
2. Click the three dots on the latest deployment
3. Select **Redeploy**

## Custom Domain

1. In Vercel dashboard, go to **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update `NEXT_PUBLIC_APP_URL` in environment variables

## Production Checklist

- [ ] Supabase project created with all tables
- [ ] Environment variables set in Vercel
- [ ] Auth redirects configured in Supabase
- [ ] Database backups enabled in Supabase
- [ ] Custom domain configured (optional)
- [ ] Analytics enabled
- [ ] Error tracking verified
- [ ] Security headers configured (vercel.json)
- [ ] Rate limiting considered
- [ ] User data privacy reviewed

## Rollback

If something goes wrong:

1. In Vercel dashboard, go to **Deployments**
2. Find the last working deployment
3. Click the three dots and select **Promote to Production**

## Support

For issues:
- Check [Vercel Docs](https://vercel.com/docs)
- Check [Supabase Docs](https://supabase.com/docs)
- Review browser console for errors
- Check Vercel and Supabase dashboards for warnings
