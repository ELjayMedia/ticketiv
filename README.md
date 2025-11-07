# Ticketiv - Event Ticketing Platform

A modern, full-stack ticketing platform built with Next.js 16 (App Router), Tailwind CSS, and shadcn/ui. Ready for Supabase integration and Vercel deployment.

## Features

- **Authentication**: Login and signup flows (ready for Supabase integration)
- **Event Discovery**: Browse, search, and filter events by category
- **Event Details**: Rich event information with availability tracking
- **Checkout Flow**: Multi-step ticket purchase with order summary
- **Ticket Dashboard**: View and manage purchased tickets
- **Responsive Design**: Mobile-first, works on all devices
- **Modern UI**: Beautiful gradients, smooth transitions, and consistent design

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Language**: TypeScript
- **Storage**: localStorage (demo), ready for Supabase
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or pnpm

### Installation

1. Clone the repository:
\`\`\`bash
git clone <your-repo-url>
cd ticketiv
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
# or
pnpm install
\`\`\`

3. Set up environment variables:
\`\`\`bash
cp .env.local.example .env.local
\`\`\`

Update `.env.local` with your configuration:
\`\`\`
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
\`\`\`

4. Run the development server:
\`\`\`bash
npm run dev
# or
pnpm dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Demo Credentials

For testing purposes, use:
- **Email**: demo@ticketiv.com
- **Password**: demo123456

Or create a new account to test the signup flow.

## Project Structure

\`\`\`
ticketiv/
├── app/
│   ├── (auth)/              # Auth pages (login, signup)
│   ├── (main)/              # Protected pages (browse, events, checkout, dashboard)
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home (redirects to browse)
│   └── globals.css          # Global styles
├── components/
│   ├── header.tsx           # Navigation header
│   ├── ui/                  # shadcn/ui components
│   └── ...
├── lib/
│   ├── mock-data.ts         # Mock event data
│   ├── supabase.ts          # Client Supabase (for future)
│   ├── supabase-server.ts   # Server Supabase (for future)
│   └── utils.ts             # Utility functions
├── types/
│   └── index.ts             # TypeScript type definitions
├── public/                  # Static assets
├── .env.local               # Environment variables
├── next.config.mjs          # Next.js configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Dependencies

\`\`\`

## Pages & Routes

### Public Routes
- `/login` - User login
- `/signup` - Create new account

### Protected Routes (require login)
- `/browse` - Browse and search events
- `/events/[id]` - Event details page
- `/checkout/[id]` - Checkout page
- `/dashboard` - User's ticket dashboard

## Current Features (Demo)

The app currently uses localStorage for demo purposes:
- User sessions stored in localStorage
- Event data from mock data file
- Tickets stored in localStorage
- No real payment processing (mocked)

## Future: Supabase Integration

To connect Supabase:

1. Create a Supabase project at [supabase.com](https://supabase.com)

2. Create database tables:

\`\`\`sql
-- Users table (handled by Supabase Auth)

-- Events table
CREATE TABLE events (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  full_description TEXT,
  date DATE,
  time TIME,
  end_time TIME,
  location TEXT,
  venue TEXT,
  price DECIMAL,
  image_url TEXT,
  category TEXT,
  attendees INTEGER,
  tickets_available INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tickets table
CREATE TABLE tickets (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  event_id UUID REFERENCES events(id),
  quantity INTEGER,
  total DECIMAL,
  ticket_number TEXT UNIQUE,
  purchase_date TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Events are readable by everyone" ON events FOR SELECT USING (true);
CREATE POLICY "Tickets are readable by owner" ON tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Tickets are creatable by authenticated users" ON tickets FOR INSERT WITH CHECK (auth.uid() = user_id);
\`\`\`

3. Add Supabase credentials to `.env.local`

4. Replace localStorage calls with Supabase client calls in:
   - `app/(main)/layout.tsx` - Authentication checks
   - `app/(main)/browse/page.tsx` - Event fetching
   - `app/(main)/events/[id]/page.tsx` - Event details
   - `app/(main)/checkout/[id]/page.tsx` - Ticket creation
   - `app/(main)/dashboard/page.tsx` - User tickets

## Deployment

### Deploy to Vercel

1. Push your repository to GitHub:
\`\`\`bash
git add .
git commit -m "Initial commit"
git push origin main
\`\`\`

2. Go to [vercel.com](https://vercel.com) and import your repository

3. Set environment variables in Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` (your Vercel domain)

4. Click "Deploy"

### Manual Deployment

\`\`\`bash
npm run build
npm run start
\`\`\`

## Environment Variables

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | String | No | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | String | No | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | String | No | Supabase service role (server-only) |
| `NEXT_PUBLIC_APP_URL` | String | Yes | Application base URL |
| `NODE_ENV` | String | No | Environment (development, production) |

## Development

### Create a new page

1. Create a new file in `app/(main)/your-page/page.tsx`
2. Use the `Header` component for navigation
3. Follow the existing component patterns

### Add new events

Edit `lib/mock-data.ts` and add to the `MOCK_EVENTS` array.

### Customize styling

Edit `app/globals.css` to modify design tokens and theme colors.

## Performance Optimizations

- React Compiler enabled (Next.js 16)
- Image optimization with Next.js Image component ready
- Automatic code splitting
- Layout components for better caching
- CSS-in-JS minimized with Tailwind

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

Contributions welcome! Please follow the existing code style and patterns.

## License

MIT License - feel free to use this as a template.

## Support

For issues or questions, please open an issue on GitHub.

## Next Steps

1. **Connect Supabase**: Follow the "Future: Supabase Integration" section
2. **Add Payment Processing**: Integrate Stripe for real payments
3. **Email Notifications**: Set up email service for ticket confirmations
4. **Admin Dashboard**: Create admin panel for event management
5. **Advanced Search**: Add filters for date, price range, etc.
6. **User Reviews**: Allow users to review events
7. **Wishlists**: Let users save favorite events
8. **Social Features**: Share events, invite friends
