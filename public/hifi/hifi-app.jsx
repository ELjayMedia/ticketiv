// Hi-fi canvas — QUIET committed direction.

const ABM = (id, label, child) => (
  <DCArtboard id={id} label={label} width={390} height={844}>
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {child}
    </div>
  </DCArtboard>
);

const ABD = (id, label, child) => (
  <DCArtboard id={id} label={label} width={1440} height={900}>
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {child}
    </div>
  </DCArtboard>
);

function HFApp() {
  return (
    <DesignCanvas>
      <DCSection
        id="cover"
        title="Ticketiv · Hi-fi (Quiet direction)"
        subtitle="Linear / Vercel restraint · Inter Tight + JetBrains Mono · violet accent #6b3fbd · light mode · dense, power-user vibe. Comparison with LOUD is preserved at the bottom."
      >
        <DCArtboard id="legend" label="System notes" width={620} height={520}>
          <div style={{ width: '100%', height: '100%', padding: 30, background: '#fff', fontFamily: "'Inter Tight', system-ui, sans-serif", display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6c6862' }}>Committed direction</div>
              <div style={{ fontSize: 38, lineHeight: 0.9, marginTop: 6, fontWeight: 600, letterSpacing: '-0.025em' }}>Quiet.</div>
              <div style={{ fontSize: 13, color: '#2a2a2e', marginTop: 10, lineHeight: 1.55, maxWidth: 540 }}>
                Inter Tight throughout with tight negative letter-spacing. Hairline 1px dividers, soft 8–14px radii. Violet
                <code style={{ background: '#efe7fb', color: '#6b3fbd', padding: '1px 6px', borderRadius: 4, margin: '0 4px', fontFamily: 'JetBrains Mono' }}>#6b3fbd</code>
                used sparingly for primary CTAs &amp; emphasis. JetBrains Mono for every number, status, timestamp, code.
              </div>
            </div>

            <div style={{ display: 'flex', gap: 18 }}>
              <div className="hf-col" style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6c6862', marginBottom: 6 }}>Palette</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[
                    ['#fafafa', 'bg'],
                    ['#ffffff', 'surface'],
                    ['#ececea', 'line'],
                    ['#0a0a0c', 'ink'],
                    ['#6e6c70', 'mute'],
                    ['#6b3fbd', 'accent'],
                    ['#efe7fb', 'accent-soft'],
                  ].map(([c, l]) => (
                    <div key={c} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 36, height: 36, background: c, border: '1px solid #ececea', borderRadius: 8 }}/>
                      <span style={{ fontSize: 9, color: '#6c6862', fontFamily: 'JetBrains Mono' }}>{l}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 18 }}>
              <div className="hf-col" style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6c6862', marginBottom: 8 }}>Type scale</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.022em', lineHeight: 1 }}>H1 — display</div>
                  <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em' }}>H2 — section</div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>H3 — card title</div>
                  <div style={{ fontSize: 14 }}>Body · Inter Tight 14</div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: '#6c6862' }}>MONO · NUMBERS · TIMESTAMPS</div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 'auto', fontSize: 12, color: '#6c6862', lineHeight: 1.5, borderTop: '1px solid #ececea', paddingTop: 12 }}>
              <b style={{ color: '#0a0a0c' }}>Now shipped:</b> Mobile home, search, event detail, checkout, confirmation, ticket, my tickets, transfer · Mobile organizer dashboard, scanner, POS · Desktop discover, event detail, checkout.
              <br/><br/>
              <b style={{ color: '#0a0a0c' }}>Next:</b> resale &amp; refund, profile/account, seating chart, attendee form, social/calendar, full organizer console.
            </div>
          </div>
        </DCArtboard>
      </DCSection>

      <DCSection id="consumer-mobile" title="Mobile consumer · core flow" subtitle="Discover → search → event → checkout → confirmation → ticket → my tickets. Tap left edge of each artboard for fullscreen.">
        {ABM("q-home",      "Discover",          <QuietHome/>)}
        {ABM("q-search",    "Search results",    <QuietSearch/>)}
        {ABM("q-event",     "Event detail",      <QuietEvent/>)}
        {ABM("q-checkout",  "Checkout",          <QuietCheckout/>)}
        {ABM("q-confirm",   "Confirmation",      <QuietConfirm/>)}
        {ABM("q-ticket",    "Ticket · QR",       <QuietTicket/>)}
        {ABM("q-mytickets", "My tickets",        <QuietMyTickets/>)}
        {ABM("q-transfer",  "Transfer ticket",   <QuietTransfer/>)}
      </DCSection>

      <DCSection id="consumer-mobile-more" title="Mobile consumer · post-purchase &amp; discovery extras" subtitle="Resale, refund, seating chart, calendar, friends, profile.">
        {ABM("q-resale",   "Resale listing",  <QuietResale/>)}
        {ABM("q-refund",   "Refund request",  <QuietRefund/>)}
        {ABM("q-seating",  "Seating chart",   <QuietSeating/>)}
        {ABM("q-calendar", "Calendar",        <QuietCalendar/>)}
        {ABM("q-friends",  "Friends · social",<QuietFriends/>)}
        {ABM("q-profile",  "Profile",         <QuietProfile/>)}
      </DCSection>

      <DCSection id="organizer-mobile" title="Mobile organizer" subtitle="Dashboard, scanner kiosk, box office POS.">
        {ABM("q-orgdash", "Org dashboard",  <QuietOrgDash/>)}
        {ABM("q-scanner", "Scanner (dark)", <QuietScanner/>)}
        {ABM("q-pos",     "Box office POS", <QuietPOS/>)}
      </DCSection>

      <DCSection id="consumer-desk" title="Desktop consumer" subtitle="Web buy flow — discover, event detail with sticky checkout, single-page checkout.">
        {ABD("q-d-discover", "Discover · web home",    <QuietDesktop/>)}
        {ABD("q-d-event",    "Event detail",           <QuietDeskEvent/>)}
        {ABD("q-d-checkout", "Checkout",               <QuietDeskCheckout/>)}
      </DCSection>

      <DCSection id="organizer-desk" title="Desktop organizer console" subtitle="Where the schema power surfaces — dashboard, table-driven CRUD, analytics, kiosk, finance, team.">
        {ABD("q-d-orgdash",   "Org dashboard",       <QuietDeskOrgDash/>)}
        {ABD("q-d-events",    "Events · table",      <QuietDeskEvents/>)}
        {ABD("q-d-edit",      "Event editor",        <QuietDeskEventEdit/>)}
        {ABD("q-d-orders",    "Orders · drawer",     <QuietDeskOrders/>)}
        {ABD("q-d-analytics", "Analytics deep-dive", <QuietDeskAnalytics/>)}
        {ABD("q-d-payouts",   "Payouts &amp; ledger",<QuietDeskPayouts/>)}
        {ABD("q-d-team",      "Team &amp; roles",    <QuietDeskTeam/>)}
        {ABD("q-d-scan",      "Scan station · kiosk",<QuietDeskScan/>)}
      </DCSection>

      <DCSection id="superadmin" title="Desktop super-admin" subtitle="Platform-level governance — overview, multi-org table, providers, flags, audit, jobs, webhooks, DB.">
        {ABD("q-d-admin",          "Platform overview",  <QuietDeskSuperAdmin/>)}
        {ABD("q-d-admin-orgs",     "Organizations",      <QuietDeskSuperOrgs/>)}
        {ABD("q-d-admin-prov",     "Providers · routing",<QuietDeskSuperProviders/>)}
        {ABD("q-d-admin-flags",    "Feature flags",      <QuietDeskSuperFlags/>)}
        {ABD("q-d-admin-audit",    "Audit log",          <QuietDeskSuperAudit/>)}
        {ABD("q-d-admin-jobs",     "Jobs queue",         <QuietDeskSuperJobs/>)}
        {ABD("q-d-admin-webhooks", "Webhooks",           <QuietDeskSuperWebhooks/>)}
        {ABD("q-d-admin-db",       "DB · Supabase",      <QuietDeskSuperDB/>)}
      </DCSection>

      <DCSection id="reference" title="Reference · LOUD direction (archived)" subtitle="Kept for comparison. Decision: ship Quiet.">
        {ABM("l-home",   "LOUD · home",    <LoudHome/>)}
        {ABM("l-event",  "LOUD · event",   <LoudEvent/>)}
        {ABM("l-ticket", "LOUD · ticket",  <LoudTicket/>)}
        {ABD("l-desk",   "LOUD · desktop", <LoudDesktop/>)}
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<HFApp/>);
