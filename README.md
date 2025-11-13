# Ticketiv - Event Ticketing Platform

A modern, full-stack ticketing platform built with Next.js 16 (App Router), Tailwind CSS, and shadcn/ui. Ready for Supabase integration and Vercel deployment.

## Features

- **Authentication**: Supabase Auth login and signup flows
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
- **Database**: Supabase Postgres
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
│   ├── events.ts            # Event queries (Supabase, server-only)
│   ├── events-client.ts     # Client-side event queries
│   ├── orders.ts            # Order creation and ticket minting
│   ├── pricing.ts           # Fee calculations
│   ├── scanning.ts          # QR code validation helpers
│   ├── supabase.ts          # Client Supabase helpers
│   ├── supabase-server.ts   # Server Supabase helpers
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

## Data & Integrations

- **Supabase Auth** handles email/password sign-in and session refresh.
- **Supabase Postgres** stores events, ticket types, orders, tickets, scans, and device sessions.
- **Server Components** read data via `lib/events.ts`, while client components use `lib/events-client.ts#getEventsUsingClient` for live filtering.
- **Checkout** creates orders through `lib/orders.ts`, which inserts order items, calculates Eventbrite-style fees, and invokes the `fn_mint_tickets` RPC to mint tickets.
- **Scanning** APIs validate QR codes against Supabase data and support offline sync queues.

### Environment Variables

Create a `.env.local` file with your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

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

Manage events directly in the Supabase `events` table or extend `lib/events.ts` for custom queries.

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
