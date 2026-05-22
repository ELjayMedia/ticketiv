// Ticketiv Wireframes — main app
// Composes all screens into a DesignCanvas with section grouping + Tweaks.

// DCSection filters by child.type === DCArtboard, so we can't wrap it in a
// component. Inline a tiny helper that RETURNS the React element instead.
const AB = (id, label, child) => (
  <DCArtboard id={id} label={label} width={300} height={620}>
    <div className="DC-artboard-host" style={{ width: '100%', height: '100%' }}>
      {child}
    </div>
  </DCArtboard>
);

// Desktop artboard — wider, taller.
const ABD = (id, label, child) => (
  <DCArtboard id={id} label={label} width={1280} height={820}>
    <div className="DC-artboard-host" style={{ width: '100%', height: '100%', padding: 0 }}>
      {child}
    </div>
  </DCArtboard>
);

function App() {
  const [t, setTweak] = useTweaks(/*EDITMODE-BEGIN*/{
    "accent": "#6b3fbd",
    "showNotes": true,
    "showSchema": true,
    "paper": "#fbfaf6",
    "phoneTilt": false
  }/*EDITMODE-END*/);

  React.useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--accent', t.accent);
    // derive a soft tint
    root.style.setProperty('--accent-soft', t.accent + '1f');
    root.style.setProperty('--accent-ink', t.accent);
    root.style.setProperty('--paper', t.paper);
    root.dataset.hideNotes = !t.showNotes;
    root.dataset.hideSchema = !t.showSchema;
  }, [t.accent, t.paper, t.showNotes, t.showSchema]);

  const accents = ['#6b3fbd', '#1f7a4f', '#c9531b', '#1a1815', '#2e63b3'];
  const papers = ['#fbfaf6', '#f4f1ea', '#ffffff', '#f3f0e8'];

  return (
    <>
      <DesignCanvas>
        <DCSection id="cover" title="Ticketiv · Wireframes" subtitle="Mobile-first low-fi exploration grounded in the supabase schema. Toggle 🛠 Tweaks for color & annotation controls.">
          <DCArtboard id="legend" label="Legend" width={300} height={420}>
            <div className="DC-artboard-host" style={{ width: '100%', height: '100%' }}>
              <div className="phone" style={{ width: 300, height: 420, padding: 14 }}>
                <div className="screen" style={{ padding: '14px 16px' }}>
                  <div className="hand-h">Ticketiv</div>
                  <div className="tiny muted">wireframes · v0</div>
                  <div className="hr"/>
                  <div className="tiny" style={{ lineHeight: 1.45 }}>
                    Hand-drawn flows for the consumer + organizer apps. Each screen ties to real tables in the
                    Supabase schema — look for the dashed pill at the bottom of each artboard.
                  </div>
                  <div className="mt8 col gap6">
                    <div className="row gap6"><span className="schema">events · ticket_types</span></div>
                    <div className="row gap6"><Note style={{ position: 'static' }}>handwritten annotation</Note></div>
                    <div className="row gap6"><span className="chip on">on-state</span><span className="chip soft">soft</span><span className="chip">off</span></div>
                    <div className="row gap6"><span className="seat"></span><span className="seat pick"></span><span className="seat sold"></span><span className="seat hold"></span><span className="muted tiny">seat states</span></div>
                  </div>
                  <div className="hr"/>
                  <div className="tiny muted">Sections →</div>
                  <ol className="tiny" style={{ paddingLeft: 16, lineHeight: 1.5, margin: 0 }}>
                    <li>Discovery — Home variants, Search, Map, Browse</li>
                    <li>Event detail — Hero, Festival, Minimal</li>
                    <li>Checkout — Type, Seats, Form, Promo, Pay</li>
                    <li>Tickets — QR, Transfer, Resale, Refund</li>
                    <li>Social, Calendar, Profile, Settings</li>
                    <li>Organizer — Dashboard, Create, Manage, Scanner, POS</li>
                  </ol>
                </div>
              </div>
            </div>
          </DCArtboard>
        </DCSection>

        <DCSection id="discovery" title="1 · Discovery" subtitle="Three takes on the home feed plus search, map and browse.">
          {AB("home-feed",    "Home A · Feed",          <HomeFeed/>)}
          {AB("home-tonight", "Home B · Tonight",       <HomeTonight/>)}
          {AB("home-friends", "Home C · Friends",       <HomeFriends/>)}
          {AB("search",       "Search",                  <Search/>)}
          {AB("map",          "Map",                     <MapView/>)}
          {AB("category",     "Browse · Categories",     <CategoryGrid/>)}
          {AB("city",         "City picker",             <CityPicker/>)}
        </DCSection>

        <DCSection id="event" title="2 · Event detail" subtitle="Hero, festival/multi-day, and a quieter text-first variant. Plus organizer & series.">
          {AB("evt-hero",     "Detail A · Hero",         <EventDetailHero/>)}
          {AB("evt-festival", "Detail B · Festival",     <EventDetailFestival/>)}
          {AB("evt-minimal",  "Detail C · Minimal",      <EventDetailMinimal/>)}
          {AB("organizer",    "Organizer profile",       <OrganizerProfile/>)}
          {AB("series",       "Series · Tour",           <SeriesPage/>)}
          {AB("review",       "Post-event · Review",     <ReviewModal/>)}
        </DCSection>

        <DCSection id="checkout" title="3 · Checkout flow" subtitle="GA → reserved seating → custom fields → promo rules → payment provider pick.">
          {AB("book",     "① Pick ticket type", <BookTicket/>)}
          {AB("seats",    "① Reserved seats",   <SeatMap/>)}
          {AB("attendee", "② Attendee form",    <AttendeeForm/>)}
          {AB("promo",    "② Promo & rules",    <PromoCode/>)}
          {AB("pay",      "③ Payment",          <PaymentMethod/>)}
          {AB("confirm",  "④ Confirmation",     <Confirmation/>)}
        </DCSection>

        <DCSection id="tickets" title="4 · My tickets & post-purchase" subtitle="Issuance, QR, peer transfer, resale marketplace, partial refund, guest claim.">
          {AB("my-tickets",    "My tickets",         <MyTickets/>)}
          {AB("ticket-detail", "Ticket · QR",        <TicketDetail/>)}
          {AB("transfer",      "Transfer (free P2P)",<TransferTicket/>)}
          {AB("resale",        "List for resale",    <ResaleListing/>)}
          {AB("refund",        "Request refund",     <RefundRequest/>)}
          {AB("guest",         "Guest list claim",   <GuestListClaim/>)}
        </DCSection>

        <DCSection id="social" title="5 · Social, calendar, profile" subtitle="Friend graph, calendar/reminders, account & settings.">
          {AB("friends",   "My friends",         <FriendsList/>)}
          {AB("requests",  "Friend requests",    <FriendRequests/>)}
          {AB("invite",    "Invite to event",    <InviteFriends/>)}
          {AB("cal",       "Calendar · month",   <CalendarMonth/>)}
          {AB("reminders", "Reminders",          <ReminderSettings/>)}
          {AB("profile",   "Profile",            <Profile/>)}
          {AB("notif",     "Notification prefs", <NotificationPrefs/>)}
          {AB("lang",      "Language",           <LanguageScreen/>)}
        </DCSection>

        <DCSection id="organizer" title="6 · Organizer mode" subtitle="Multi-org dashboard, create wizard, ticket types, guest list, scanner, POS.">
          {AB("org-dash",  "Org dashboard",          <OrgDashboard/>)}
          {AB("create",    "Create event · wizard",  <CreateEventWizard/>)}
          {AB("tt-manage", "Manage ticket types",    <ManageTicketTypes/>)}
          {AB("gl-manage", "Manage guest list",      <GuestListManage/>)}
          {AB("scanner",   "Scanner (dark)",         <ScannerUI/>)}
          {AB("pos",       "POS terminal",           <POSTerminal/>)}
        </DCSection>

        <DCSection id="desk-consumer" title="7 · Desktop · Consumer" subtitle="Web responsive — discover, event detail with sticky-sidebar checkout, single-page checkout, account.">
          {ABD("d-discover",   "Discover · Ahmedabad",  <DeskDiscover/>)}
          {ABD("d-event",      "Event detail",          <DeskEventDetail/>)}
          {ABD("d-checkout",   "Checkout · 3 in 1",     <DeskCheckout/>)}
          {ABD("d-account",    "My account · tickets",  <DeskMyAccount/>)}
        </DCSection>

        <DCSection id="desk-organizer" title="8 · Desktop · Organizer console" subtitle="Where most schema power surfaces — dashboard, table-driven CRUD, analytics, scan-station, payouts and team.">
          {ABD("d-dash",      "Org dashboard",         <DeskOrgDashboard/>)}
          {ABD("d-events",    "Events · table",        <DeskEventsList/>)}
          {ABD("d-editor",    "Event editor",          <DeskEventEditor/>)}
          {ABD("d-orders",    "Orders · drawer",       <DeskOrdersTable/>)}
          {ABD("d-analytics", "Analytics deep-dive",   <DeskAnalytics/>)}
          {ABD("d-scan",      "Scan station · kiosk",  <DeskScanStation/>)}
          {ABD("d-payouts",   "Payouts & ledger",      <DeskPayouts/>)}
          {ABD("d-settings",  "Team & roles",          <DeskSettings/>)}
        </DCSection>

        <DCSection id="desk-admin" title="9 · Desktop · Super-admin" subtitle="Platform-level governance — multi-org overview, payment provider health, jobs queue.">
          {ABD("d-admin",     "Platform overview",     <DeskSuperAdmin/>)}
        </DCSection>
      </DesignCanvas>

      <TweaksPanel title="Wireframe tweaks">
        <TweakSection label="Look">
          <TweakColor
            label="Accent"
            value={t.accent}
            onChange={v => setTweak('accent', v)}
            options={accents}
          />
          <TweakColor
            label="Paper"
            value={t.paper}
            onChange={v => setTweak('paper', v)}
            options={papers}
          />
        </TweakSection>
        <TweakSection label="Annotations">
          <TweakToggle
            label="Hand-drawn notes"
            value={t.showNotes}
            onChange={v => setTweak('showNotes', v)}
          />
          <TweakToggle
            label="Schema pills"
            value={t.showSchema}
            onChange={v => setTweak('showSchema', v)}
          />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
