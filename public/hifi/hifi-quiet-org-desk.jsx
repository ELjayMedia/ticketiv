// QUIET · Desktop organizer console.
// Sidebar + Dashboard, Events list, Event editor, Orders, Analytics, Payouts, Team, Scanner station.

const HFQ_INK_2 = '#2a2a2e';

// Shared org sidebar
function QOSidebar({ active = 'dash' }) {
  const items = [
    ['dash',      'spark',   'Overview',    null],
    ['events',    'cal',     'Events',      '23'],
    ['orders',    'ticket',  'Orders',      '142'],
    ['attendees', 'user',    'Attendees',   '1.2k'],
    ['analytics', 'fire',    'Analytics',   null],
    ['guest',     'heart',   'Guest list',  null],
  ];
  const money = [
    ['payouts',   'wallet',  'Payouts',     '₹62k'],
    ['rules',     'zap',     'Price rules', null],
    ['ledger',    'fileText','Ledger',      null],
  ];
  const ops = [
    ['scan',      'qr',      'Scan station',null],
    ['pos',       'wallet',  'Box office',  null],
    ['team',      'user',    'Team',        '8'],
    ['settings',  'filter',  'Settings',    null],
  ];
  const NavItem = ([id, ic, l, count]) => (
    <div key={id} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '6px 10px',
      borderRadius: 8,
      background: active === id ? HFQ_ACC_2 : 'transparent',
      color: active === id ? HFQ_ACC : HFQ_INK_2,
      fontSize: 13, fontWeight: active === id ? 600 : 500,
      cursor: 'pointer',
    }}>
      <HFIcon name={ic} size={16}/>
      <span style={{ flex: 1 }}>{l}</span>
      {count && <span className="hf-mono" style={{ fontSize: 10, color: active === id ? HFQ_ACC : HFQ_INK_3, padding: '1px 6px', background: active === id ? '#fff' : '#fafafa', borderRadius: 4, fontWeight: 600 }}>{count}</span>}
    </div>
  );
  return (
    <div style={{ width: 220, background: '#fff', borderRight: `1px solid ${HFQ_LINE}`, padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 4, overflow: 'auto', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px 12px' }}>
        <div style={{ width: 22, height: 22, borderRadius: 6, background: HFQ_ACC, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>T</div>
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.02em' }}>ticketiv</span>
      </div>
      <div style={{ padding: '8px', background: '#fafafa', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: HFQ_INK, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>R</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Rishabh's Events</div>
          <div className="hf-mono" style={{ fontSize: 9, color: HFQ_INK_3 }}>organizer_owner</div>
        </div>
        <HFIcon name="chevD" size={12} style={{ color: HFQ_INK_3 }}/>
      </div>
      <div style={{ fontSize: 10, color: HFQ_INK_3, padding: '8px 10px 4px', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Manage</div>
      {items.map(NavItem)}
      <div style={{ fontSize: 10, color: HFQ_INK_3, padding: '12px 10px 4px', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Money</div>
      {money.map(NavItem)}
      <div style={{ fontSize: 10, color: HFQ_INK_3, padding: '12px 10px 4px', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Ops</div>
      {ops.map(NavItem)}
    </div>
  );
}

// Tabbed top header
function QOTopBar({ crumb, title, right }) {
  return (
    <div style={{ padding: '16px 28px', borderBottom: `1px solid ${HFQ_LINE}`, background: '#fff', display: 'flex', alignItems: 'center', gap: 16 }}>
      <div className="hf-col" style={{ flex: 1, gap: 2 }}>
        <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>{crumb}</span>
        <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.022em' }}>{title}</span>
      </div>
      {right}
    </div>
  );
}

function KPI({ l, v, d, dir, sub }) {
  return (
    <div className="hf-card" style={{ padding: 14, borderRadius: 12, flex: 1, minWidth: 0 }}>
      <div className="hf-row" style={{ gap: 6 }}>
        <span className="lbl" style={{ flex: 1 }}>{l}</span>
        {d && <span className="hf-mono" style={{ fontSize: 10, color: dir === 'up' ? HFQ_ACC : (dir === 'down' ? '#ef4444' : HFQ_INK_3), fontWeight: 600 }}>{dir === 'up' ? '▲' : dir === 'down' ? '▼' : ''} {d}</span>}
      </div>
      <div className="hf-mono" style={{ fontSize: 26, fontWeight: 600, marginTop: 8, letterSpacing: '-0.015em' }}>{v}</div>
      {sub && <div className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// Badge helper
function QOBadge({ k, children }) {
  const styles = {
    live:   { bg: HFQ_ACC_2, c: HFQ_ACC },
    paused: { bg: '#fdf6ed', c: '#c1841c' },
    soldout:{ bg: '#fdf0ec', c: '#c1422b' },
    draft:  { bg: '#f3f1ee', c: HFQ_INK_3 },
    paid:   { bg: HFQ_ACC_2, c: HFQ_ACC },
    pending:{ bg: '#fdf6ed', c: '#c1841c' },
    refund: { bg: '#f3f1ee', c: HFQ_INK_3 },
    failed: { bg: '#fdf0ec', c: '#c1422b' },
  };
  const s = styles[k] || styles.draft;
  return <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, background: s.bg, color: s.c, fontSize: 10, fontWeight: 600, fontFamily: 'var(--hf-font-mono)', letterSpacing: '0.04em' }}>{children}</span>;
}

// ─── Org dashboard (desktop) ───
function QuietDeskOrgDash() {
  const P = HF_PHOTOS;
  return (
    <HFBrowser url="admin.ticketiv.app/o/rishabh" tabs={["Overview · Ticketiv admin"]}>
      <div className="hf-quiet" style={{ background: '#fafafa', display: 'flex', minHeight: '100%' }}>
        <QOSidebar active="dash"/>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <QOTopBar
            crumb="ORGANIZATIONS / RISHABH'S EVENTS"
            title="Welcome back, Rishabh ✦"
            right={<div className="hf-row" style={{ gap: 8 }}>
              <div className="hf-seg" style={{ borderRadius: 8 }}>
                <span>24h</span><span className="on">7d</span><span>30d</span><span>YTD</span>
              </div>
              <button className="hf-btn xs"><HFIcon name="share" size={12}/> Public page</button>
              <button className="hf-btn accent xs"><HFIcon name="plus" size={12}/> New event</button>
              <span style={{ width: 1, height: 20, background: HFQ_LINE, marginLeft: 6 }}></span>
              <HFAvatar src={P.face_6} size={28}/>
            </div>}
          />

          <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* KPIs */}
            <div style={{ display: 'flex', gap: 14 }}>
              <KPI l="Tickets sold · 7d"   v="182"     d="24%"  dir="up"   sub="prev period 147"/>
              <KPI l="Gross revenue"        v="₹91,240" d="18%"  dir="up"   sub="net ₹78,421"/>
              <KPI l="Refund rate"          v="2.1%"    d="0.4pp" dir="down" sub="3 refunds"/>
              <KPI l="Avg ticket value"     v="₹501"    d="₹14"  dir="up"   sub="AOV last 30d"/>
              <KPI l="New buyers"           v="63"      d="9"    dir="up"/>
            </div>

            {/* Sales chart + top events */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
              <div className="hf-card" style={{ padding: 20, borderRadius: 12 }}>
                <div className="hf-between" style={{ marginBottom: 14 }}>
                  <div className="hf-col">
                    <span style={{ fontSize: 15, fontWeight: 600 }}>Sales · last 30 days</span>
                    <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3, marginTop: 2 }}>Hover a day to scrub</span>
                  </div>
                  <div className="hf-row" style={{ gap: 12, fontSize: 11, color: HFQ_INK_3 }}>
                    <span className="hf-row" style={{ gap: 4 }}><span style={{ width: 10, height: 2, background: HFQ_ACC }}></span> Revenue ₹</span>
                    <span className="hf-row" style={{ gap: 4 }}><span style={{ width: 10, height: 2, background: HFQ_INK_3, borderTop: `2px dashed ${HFQ_INK_3}` }}></span> Tickets</span>
                  </div>
                </div>
                <svg viewBox="0 0 600 220" style={{ width: '100%', height: 220 }}>
                  {[0,1,2,3,4].map(i => (
                    <line key={i} x1="0" x2="600" y1={i*50+10} y2={i*50+10} stroke={HFQ_LINE} strokeDasharray="3 4" strokeWidth="0.8"/>
                  ))}
                  <path d="M0,180 L30,170 L60,160 L90,140 L120,148 L150,128 L180,110 L210,136 L240,90 L270,80 L300,108 L330,72 L360,52 L390,80 L420,40 L450,58 L480,28 L510,40 L540,18 L570,28 L600,12 L600,220 L0,220 Z" fill={HFQ_ACC_2}/>
                  <polyline points="0,180 30,170 60,160 90,140 120,148 150,128 180,110 210,136 240,90 270,80 300,108 330,72 360,52 390,80 420,40 450,58 480,28 510,40 540,18 570,28 600,12" fill="none" stroke={HFQ_ACC} strokeWidth="2.5"/>
                  <polyline points="0,200 30,194 60,196 90,180 120,186 150,168 180,156 210,168 240,140 270,134 300,150 330,128 360,116 390,134 420,100 450,114 480,90 510,100 540,82 570,90 600,76" fill="none" stroke={HFQ_INK_3} strokeWidth="1.5" strokeDasharray="4 3"/>
                  {/* hover marker */}
                  <line x1="420" x2="420" y1="10" y2="210" stroke={HFQ_INK} strokeWidth="1"/>
                  <circle cx="420" cy="40" r="5" fill={HFQ_ACC} stroke="#fff" strokeWidth="2"/>
                  <circle cx="420" cy="100" r="4" fill={HFQ_INK_3} stroke="#fff" strokeWidth="2"/>
                  {/* tooltip */}
                  <g transform="translate(330, 0)">
                    <rect width="120" height="40" fill={HFQ_INK} rx="6"/>
                    <text x="60" y="16" fontSize="10" fill="#fff" fontFamily="var(--hf-font-mono)" textAnchor="middle">JUL 18</text>
                    <text x="60" y="30" fontSize="10" fill={HFQ_ACC} fontFamily="var(--hf-font-mono)" textAnchor="middle">₹6,840 · 14 sold</text>
                  </g>
                </svg>
              </div>

              <div className="hf-card" style={{ padding: 18, borderRadius: 12 }}>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Top events</div>
                <div className="hf-col" style={{ gap: 10 }}>
                  {[
                    ["Tribal Tales", 92, "₹38,050"],
                    ["River Sound Fest", 78, "₹32,420"],
                    ["Open Mic Fri", 54, "₹14,200"],
                    ["Comedy Night", 40, "₹8,150"],
                    ["Sunset Set", 28, "₹3,920"],
                  ].map(([n, w, v]) => (
                    <div key={n} className="hf-col" style={{ gap: 4 }}>
                      <div className="hf-row" style={{ fontSize: 12 }}>
                        <span style={{ flex: 1 }}>{n}</span>
                        <span className="hf-mono" style={{ fontWeight: 600 }}>{v}</span>
                      </div>
                      <div style={{ height: 4, background: HFQ_LINE, borderRadius: 999 }}>
                        <div style={{ height: '100%', width: w + '%', background: HFQ_ACC, borderRadius: 999 }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Live events + activity */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
              <div className="hf-card" style={{ padding: 18, borderRadius: 12 }}>
                <div className="hf-between" style={{ marginBottom: 14 }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>Live &amp; upcoming</span>
                  <span className="hf-mono" style={{ fontSize: 11, color: HFQ_ACC, fontWeight: 600 }}>VIEW ALL ›</span>
                </div>
                <div className="hf-col" style={{ gap: 8 }}>
                  {[
                    { p: P.dj_set,        t: "Tribal Tales",     sub: "Tonight · 3h to start", sold: 85,  cap: 120, scan: 12, st: 'live' },
                    { p: P.singer_red,    t: "Stand-up · Khan",  sub: "Fri 25 · 21:30",        sold: 42,  cap: 60,  scan: 0,  st: 'sale' },
                    { p: P.crowd_lights,  t: "Indie Showcase",   sub: "Sat 26 · 22:00",        sold: 18,  cap: 80,  scan: 0,  st: 'sale' },
                  ].map((e, i) => (
                    <div key={i} className="hf-row" style={{ gap: 12, padding: '8px 0', borderBottom: i < 2 ? `1px solid ${HFQ_LINE}` : 0 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                        <HFPhoto src={e.p} h={48}/>
                      </div>
                      <div className="hf-col" style={{ flex: 1, gap: 4 }}>
                        <div className="hf-row" style={{ gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{e.t}</span>
                          {e.st === 'live' && <span className="hf-row" style={{ gap: 4 }}><span className="hf-live-dot"></span><span className="hf-mono" style={{ fontSize: 9, color: '#ef4444', fontWeight: 700 }}>LIVE</span></span>}
                        </div>
                        <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>{e.sub}</span>
                        <div style={{ height: 4, background: HFQ_LINE, borderRadius: 999, marginTop: 2 }}>
                          <div style={{ height: '100%', width: `${(e.sold / e.cap) * 100}%`, background: e.st === 'live' ? HFQ_ACC : HFQ_INK_3, borderRadius: 999 }}></div>
                        </div>
                      </div>
                      <div className="hf-col" style={{ alignItems: 'flex-end', gap: 2 }}>
                        <span className="hf-mono" style={{ fontSize: 13, fontWeight: 600 }}>{e.sold}/{e.cap}</span>
                        {e.scan > 0 && <span className="hf-mono" style={{ fontSize: 10, color: HFQ_ACC }}>{e.scan} scanned</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="hf-card" style={{ padding: 18, borderRadius: 12 }}>
                <div className="hf-between" style={{ marginBottom: 14 }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>Activity</span>
                  <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>last 1h</span>
                </div>
                <div className="hf-col" style={{ gap: 0 }}>
                  {[
                    ['check',   'Asha booked 2 × Regular',   '2m', HFQ_ACC],
                    ['arrowUR', 'Salman → Vicky transfer',   '8m', HFQ_INK_3],
                    ['heart',   'New 5★ review',             '21m', HFQ_ACC],
                    ['wallet',  'Refund ₹450 → Visa',        '1h', HFQ_INK_3],
                    ['qr',      'Gate 1 scanner online',     '2h', HFQ_INK_3],
                    ['fileText','Payout PO-2401 requested',  '3h', HFQ_INK_3],
                  ].map(([i, t, w, c], idx, arr) => (
                    <div key={idx} className="hf-row" style={{ gap: 10, padding: '8px 0', borderBottom: idx < arr.length - 1 ? `1px solid ${HFQ_LINE}` : 0 }}>
                      <span style={{ width: 26, height: 26, borderRadius: 999, background: HFQ_ACC_2, color: c, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <HFIcon name={i} size={13}/>
                      </span>
                      <span style={{ flex: 1, fontSize: 12 }}>{t}</span>
                      <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>{w}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </HFBrowser>
  );
}

// ─── Events list table ───
function QuietDeskEvents() {
  return (
    <HFBrowser url="admin.ticketiv.app/o/rishabh/events" tabs={["Events · Ticketiv admin"]}>
      <div className="hf-quiet" style={{ background: '#fafafa', display: 'flex', minHeight: '100%' }}>
        <QOSidebar active="events"/>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <QOTopBar
            crumb="EVENTS"
            title="Events"
            right={<div className="hf-row" style={{ gap: 8 }}>
              <button className="hf-btn xs">Import</button>
              <button className="hf-btn accent xs"><HFIcon name="plus" size={12}/> New event</button>
            </div>}
          />

          <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Filters */}
            <div className="hf-row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <div style={{ background: '#fff', border: `1px solid ${HFQ_LINE_2}`, borderRadius: 8, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8, width: 260 }}>
                <HFIcon name="search" size={14} style={{ color: HFQ_INK_3 }}/>
                <span style={{ fontSize: 13, color: HFQ_INK_3, flex: 1 }}>Search title, venue, series…</span>
              </div>
              <span className="hf-chip on">All <span className="hf-mono" style={{ marginLeft: 4 }}>23</span></span>
              <span className="hf-chip">Live <span className="hf-mono" style={{ marginLeft: 4 }}>3</span></span>
              <span className="hf-chip">On sale <span className="hf-mono" style={{ marginLeft: 4 }}>12</span></span>
              <span className="hf-chip">Draft <span className="hf-mono" style={{ marginLeft: 4 }}>4</span></span>
              <span className="hf-chip">Past <span className="hf-mono" style={{ marginLeft: 4 }}>7</span></span>
              <span style={{ flex: 1 }}></span>
              <span className="hf-chip">Date ▾</span>
              <span className="hf-chip">Visibility ▾</span>
              <span className="hf-chip">Sort: Soonest ▾</span>
            </div>

            {/* Table */}
            <div className="hf-card" style={{ borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '24px 2.6fr 1.5fr 0.8fr 1fr 1.2fr 0.8fr 28px', gap: 12, padding: '12px 18px', borderBottom: `1px solid ${HFQ_LINE}`, fontSize: 10, color: HFQ_INK_3, fontFamily: 'var(--hf-font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, background: '#fafafa' }}>
                <span></span>
                <span>Event</span>
                <span>Date &amp; venue</span>
                <span>Status</span>
                <span>Sold</span>
                <span>Gross</span>
                <span>Vis.</span>
                <span></span>
              </div>
              {[
                ['Tribal Tales',       'Wed 30 Aug · Cafe Natarani',  'live',    '85/120',   '₹38,050',  'public',  'pub'],
                ['Open Mic Friday',    'Fri 25 Jul · Studio X',        'on_sale', '42/60',    '₹10,500',  'public',  'pub'],
                ['Indie Showcase',     'Sat 26 Jul · The Loft',        'on_sale', '18/80',    '₹14,400',  'public',  'pub'],
                ['River Sound Fest',   'Fri 25 → Sun 27 · Riverside',  'on_sale', '612/1200', '₹14.6L',   'public',  'pub'],
                ['Comedy Night',       'Thu 24 Jul · Lol HQ',          'paused',  '20/100',   '₹7,000',   'public',  'pub'],
                ['Sunset Set',         'Sat 23 Aug · Riverside',       'draft',   '—',        '—',        'private', 'priv'],
                ['Tribal Tales · BBY', 'Sat 09 Sep · Antisocial',      'scheduled','0/200',   '—',        'public',  'pub'],
                ['Tech Talks',         'Tue 29 Jul · BlueSpace',       'soldout', '120/120',  '₹18,000',  'public',  'pub'],
              ].map((row, i, arr) => (
                <div key={i} style={{
                  display: 'grid',
                  gridTemplateColumns: '24px 2.6fr 1.5fr 0.8fr 1fr 1.2fr 0.8fr 28px',
                  gap: 12, padding: '14px 18px',
                  borderBottom: i < arr.length - 1 ? `1px solid ${HFQ_LINE}` : 0,
                  alignItems: 'center', fontSize: 13,
                  background: i === 0 ? '#fbfaff' : '#fff',
                }}>
                  <span style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${HFQ_LINE_2}` }}></span>
                  <span style={{ fontWeight: 600 }}>{row[0]}</span>
                  <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>{row[1]}</span>
                  <QOBadge k={row[2] === 'live' ? 'live' : row[2] === 'paused' ? 'paused' : row[2] === 'soldout' ? 'soldout' : row[2] === 'draft' ? 'draft' : 'paid'}>{row[2].toUpperCase()}</QOBadge>
                  <span className="hf-mono" style={{ fontSize: 12 }}>{row[3]}</span>
                  <span className="hf-mono" style={{ fontSize: 12, fontWeight: 600 }}>{row[4]}</span>
                  <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>{row[5].toUpperCase()}</span>
                  <HFIcon name="chevR" size={14} style={{ color: HFQ_INK_3 }}/>
                </div>
              ))}
            </div>

            <div className="hf-row" style={{ justifyContent: 'flex-end', gap: 6, fontSize: 12, color: HFQ_INK_3 }}>
              <span>8 of 23</span>
              <span style={{ width: 1, height: 14, background: HFQ_LINE, margin: '0 6px' }}></span>
              <button className="hf-btn xs">‹</button>
              <button className="hf-btn xs" style={{ background: HFQ_INK, color: '#fff', borderColor: HFQ_INK }}>1</button>
              <button className="hf-btn xs">2</button>
              <button className="hf-btn xs">3</button>
              <button className="hf-btn xs">›</button>
            </div>
          </div>
        </div>
      </div>
    </HFBrowser>
  );
}

// ─── Event editor (tabbed) ───
function QuietDeskEventEdit() {
  return (
    <HFBrowser url="admin.ticketiv.app/o/rishabh/events/tribal-tales" tabs={["Edit · Tribal Tales"]}>
      <div className="hf-quiet" style={{ background: '#fafafa', display: 'flex', minHeight: '100%' }}>
        <QOSidebar active="events"/>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <div style={{ padding: '16px 28px', borderBottom: `1px solid ${HFQ_LINE}`, background: '#fff' }}>
            <div className="hf-row" style={{ marginBottom: 8 }}>
              <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>EVENTS / <b style={{ color: HFQ_INK }}>TRIBAL TALES</b></span>
              <span style={{ flex: 1 }}></span>
              <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>draft saved 2m ago</span>
              <button className="hf-btn xs" style={{ marginLeft: 10 }}>Preview</button>
              <button className="hf-btn xs">Duplicate</button>
              <button className="hf-btn xs">Unpublish</button>
              <button className="hf-btn accent xs">Save</button>
            </div>
            <div className="hf-row" style={{ gap: 14 }}>
              <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.022em' }}>Tribal Tales</span>
              <QOBadge k="live">LIVE · ON SALE</QOBadge>
            </div>
            {/* tabs */}
            <div style={{ marginTop: 14, display: 'flex', gap: 24, borderBottom: `1px solid ${HFQ_LINE}`, marginLeft: -2 }}>
              {['Basics','Schedule','Tickets & pricing','Seating','Attendee fields','Lineup','Promo codes','Settings'].map((t, i) => (
                <div key={t} style={{ padding: '10px 0', fontSize: 13, fontWeight: 500, color: i === 2 ? HFQ_INK : HFQ_INK_3, borderBottom: i === 2 ? `2px solid ${HFQ_ACC}` : '2px solid transparent', marginBottom: -1 }}>{t}</div>
              ))}
            </div>
          </div>

          <div style={{ padding: 28, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, alignItems: 'flex-start' }}>
            {/* Left: ticket types + rules */}
            <div className="hf-col" style={{ gap: 14 }}>
              <div className="hf-card" style={{ padding: 20, borderRadius: 12 }}>
                <div className="hf-between" style={{ marginBottom: 14 }}>
                  <div className="hf-col">
                    <span style={{ fontSize: 16, fontWeight: 600 }}>Ticket types</span>
                    <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>5 types · drag to reorder</span>
                  </div>
                  <button className="hf-btn xs"><HFIcon name="plus" size={12}/> Add type</button>
                </div>
                {/* table */}
                <div style={{ display: 'grid', gridTemplateColumns: '14px 2fr 0.8fr 0.7fr 0.7fr 1.2fr 0.9fr 16px', gap: 10, padding: '8px 0', borderBottom: `1px solid ${HFQ_LINE}`, fontSize: 10, color: HFQ_INK_3, fontFamily: 'var(--hf-font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>
                  <span></span><span>Name</span><span>Price</span><span>Quota</span><span>Sold</span><span>Channel</span><span>Status</span><span></span>
                </div>
                {[
                  ['Regular',   '₹500',  '120', '85',  'Online + POS', 'on_sale','live'],
                  ['Premium',   '₹1,200','30',  '12',  'Online',        'paused', 'paused'],
                  ['VIP',       '₹2,500','10',  '10',  'Online',        'sold_out','soldout'],
                  ['Early bird','₹350',  '30',  '30',  'Online',        'ended',  'draft'],
                  ['Comp',      '₹0',    '20',  '7',   'Comp only',     'on_sale','live'],
                ].map((r, i, arr) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '14px 2fr 0.8fr 0.7fr 0.7fr 1.2fr 0.9fr 16px', gap: 10, padding: '10px 0', alignItems: 'center', borderBottom: i < arr.length - 1 ? `1px solid ${HFQ_LINE}` : 0, fontSize: 13 }}>
                    <span style={{ color: HFQ_INK_3 }}>⋮⋮</span>
                    <span style={{ fontWeight: 600 }}>{r[0]}</span>
                    <span className="hf-mono">{r[1]}</span>
                    <span className="hf-mono" style={{ color: HFQ_INK_3 }}>{r[2]}</span>
                    <span className="hf-mono" style={{ fontWeight: 600 }}>{r[3]}</span>
                    <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>{r[4]}</span>
                    <QOBadge k={r[6]}>{r[5].toUpperCase()}</QOBadge>
                    <HFIcon name="chevR" size={14} style={{ color: HFQ_INK_3 }}/>
                  </div>
                ))}
              </div>

              <div className="hf-card" style={{ padding: 20, borderRadius: 12 }}>
                <div className="hf-between" style={{ marginBottom: 12 }}>
                  <div className="hf-col">
                    <span style={{ fontSize: 16, fontWeight: 600 }}>Channel quotas</span>
                    <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>Allocate per channel · unsold releases 2h before doors</span>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  {[
                    ['Online',       85, 100, HFQ_ACC],
                    ['POS / door',  14, 15,  '#c1841c'],
                    ['Comp / guest', 7, 20,  HFQ_INK_3],
                  ].map(([l, s, t, c]) => (
                    <div key={l} className="hf-col" style={{ padding: 12, border: `1px solid ${HFQ_LINE}`, borderRadius: 10, gap: 8 }}>
                      <div className="hf-row">
                        <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{l}</span>
                        <span className="hf-mono" style={{ fontSize: 12, fontWeight: 600 }}>{s} / {t}</span>
                      </div>
                      <div style={{ height: 6, background: HFQ_LINE, borderRadius: 999 }}>
                        <div style={{ height: '100%', width: `${(s/t)*100}%`, background: c, borderRadius: 999 }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="hf-card" style={{ padding: 20, borderRadius: 12 }}>
                <div className="hf-between" style={{ marginBottom: 12 }}>
                  <div className="hf-col">
                    <span style={{ fontSize: 16, fontWeight: 600 }}>Pricing rules</span>
                    <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>Discounts, fees, taxes · stacked in order</span>
                  </div>
                  <button className="hf-btn xs"><HFIcon name="plus" size={12}/> Add rule</button>
                </div>
                {[
                  ['%', 'WELCOME10', '10% off all tickets · 124 redemptions', true],
                  ['−', 'EARLY100', 'Flat ₹100 off · early bird only', true],
                  ['+', 'GST 18%', 'Applies to all online sales', true],
                  ['↺', 'Refund window 48h', 'Per-event policy override', false],
                ].map(([g, n, d, on], i, arr) => (
                  <div key={i} className="hf-row" style={{ padding: '12px 0', gap: 12, borderBottom: i < arr.length - 1 ? `1px solid ${HFQ_LINE}` : 0 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: HFQ_ACC_2, color: HFQ_ACC, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{g}</div>
                    <div className="hf-col" style={{ flex: 1 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{n}</span>
                      <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>{d}</span>
                    </div>
                    <div style={{ width: 36, height: 22, borderRadius: 999, background: on ? HFQ_ACC : HFQ_LINE_2, position: 'relative', flexShrink: 0 }}>
                      <span style={{ position: 'absolute', top: 2, [on ? 'right' : 'left']: 2, width: 18, height: 18, background: '#fff', borderRadius: 999, boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: snapshot + visibility */}
            <div className="hf-col" style={{ gap: 14, position: 'sticky', top: 24 }}>
              <div className="hf-card" style={{ padding: 18, borderRadius: 12 }}>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Snapshot</div>
                {[
                  ['Sold', '85 / 120'],
                  ['Gross', '₹38,050'],
                  ['Refunds', '−₹500', HFQ_INK_3],
                  ['Fees', '−₹3,200', HFQ_INK_3],
                ].map(([l, v, c]) => (
                  <div key={l} className="hf-row" style={{ padding: '4px 0' }}>
                    <span className="hf-mono" style={{ fontSize: 12, color: HFQ_INK_3, flex: 1 }}>{l}</span>
                    <span className="hf-mono" style={{ fontSize: 12, color: c || HFQ_INK }}>{v}</span>
                  </div>
                ))}
                <div className="hf-divider" style={{ margin: '8px 0' }}></div>
                <div className="hf-row">
                  <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>Payout est.</span>
                  <span className="hf-mono" style={{ fontSize: 16, fontWeight: 600, color: HFQ_ACC }}>₹34,350</span>
                </div>
              </div>

              <div className="hf-card" style={{ padding: 18, borderRadius: 12 }}>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Visibility</div>
                <div className="hf-col" style={{ gap: 8 }}>
                  {[['Public', true], ['Unlisted', false], ['Private (link only)', false]].map(([l, on]) => (
                    <div key={l} className="hf-row" style={{ gap: 8, fontSize: 13 }}>
                      <span style={{ width: 14, height: 14, borderRadius: 999, border: `2px solid ${on ? HFQ_ACC : HFQ_LINE_2}`, background: '#fff', position: 'relative', flexShrink: 0 }}>{on && <span style={{ position: 'absolute', inset: 2, borderRadius: 999, background: HFQ_ACC }}></span>}</span>
                      <span>{l}</span>
                    </div>
                  ))}
                </div>
                <div className="hf-divider" style={{ margin: '12px 0' }}></div>
                <div className="hf-row" style={{ padding: '3px 0' }}>
                  <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3, flex: 1 }}>Publish at</span>
                  <span className="hf-mono" style={{ fontSize: 11 }}>22 Jul · 09:00</span>
                </div>
                <div className="hf-row" style={{ padding: '3px 0' }}>
                  <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3, flex: 1 }}>Unpublish at</span>
                  <span className="hf-mono" style={{ fontSize: 11 }}>30 Aug · 22:00</span>
                </div>
              </div>

              <div className="hf-card" style={{ padding: 18, borderRadius: 12 }}>
                <div className="hf-between" style={{ marginBottom: 10 }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>Staff on event</span>
                  <button className="hf-btn xs"><HFIcon name="plus" size={12}/></button>
                </div>
                <div className="hf-col" style={{ gap: 8 }}>
                  {[
                    [HF_PHOTOS.face_6, 'Rishabh M.', 'organizer_owner'],
                    [HF_PHOTOS.face_8, 'Neha S.',     'event_admin'],
                    [HF_PHOTOS.face_5, 'Anil K.',     'scanner'],
                  ].map(([f, n, role], i) => (
                    <div key={i} className="hf-row" style={{ gap: 8 }}>
                      <HFAvatar src={f} size={24}/>
                      <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{n}</span>
                      <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>{role}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </HFBrowser>
  );
}

// ─── Orders table w/ drawer ───
function QuietDeskOrders() {
  const P = HF_PHOTOS;
  return (
    <HFBrowser url="admin.ticketiv.app/o/rishabh/orders" tabs={["Orders · Ticketiv admin"]}>
      <div className="hf-quiet" style={{ background: '#fafafa', display: 'flex', minHeight: '100%', position: 'relative' }}>
        <QOSidebar active="orders"/>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <QOTopBar
            crumb="ORDERS"
            title="Orders"
            right={<div className="hf-row" style={{ gap: 8 }}>
              <button className="hf-btn xs"><HFIcon name="download" size={12}/> Export CSV</button>
              <button className="hf-btn xs"><HFIcon name="fileText" size={12}/> Invoices</button>
            </div>}
          />

          <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 14, paddingRight: 388 }}>
            <div style={{ display: 'flex', gap: 14 }}>
              <KPI l="Orders · 7d" v="142" d="+18"/>
              <KPI l="Gross · 7d"  v="₹71,200"/>
              <KPI l="AOV"          v="₹501"/>
              <KPI l="Refunds"      v="3" sub="₹1,350 · 2.1%"/>
            </div>

            <div className="hf-row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <div style={{ background: '#fff', border: `1px solid ${HFQ_LINE_2}`, borderRadius: 8, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8, width: 240 }}>
                <HFIcon name="search" size={14} style={{ color: HFQ_INK_3 }}/>
                <span style={{ fontSize: 13, color: HFQ_INK_3, flex: 1 }}>Order #, buyer, email…</span>
              </div>
              <span className="hf-chip on">All</span>
              <span className="hf-chip">Paid</span>
              <span className="hf-chip">Pending</span>
              <span className="hf-chip">Refunded</span>
              <span className="hf-chip">Failed</span>
              <span style={{ flex: 1 }}></span>
              <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>328 results</span>
            </div>

            <div className="hf-card" style={{ borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.4fr 1.4fr 1fr 0.9fr 0.8fr 0.9fr 0.5fr', gap: 10, padding: '10px 16px', borderBottom: `1px solid ${HFQ_LINE}`, fontSize: 10, color: HFQ_INK_3, fontFamily: 'var(--hf-font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, background: '#fafafa' }}>
                {['Order','Buyer','Event','Items','Total','Channel','Status','Age'].map(c => <span key={c}>{c}</span>)}
              </div>
              {[
                ['RG7352','Prateek Sharma','Tribal Tales','2× Regular','₹1,018','Online','paid','2m', true],
                ['RG7351','Asha Iyer','Tribal Tales','1× Premium','₹1,218','Online','paid','8m'],
                ['RG7350','Vicky Kausal','Indie Showcase','1× Regular','₹500','Online','pending','12m'],
                ['RG7349','Walk-in #4','Tribal Tales','2× Regular','₹1,000','POS','paid','45m'],
                ['RG7348','Riya M.','Open Mic','1× Regular','₹250','Online','paid','1h'],
                ['RG7347','Manish G.','Tribal Tales','2× Regular','₹1,000','Online','refund','3h'],
                ['RG7346','Priya Shah','Tribal Tales','2× Comp','₹0','Comp','paid','1d'],
                ['RG7345','Smit Modi','Indie Showcase','1× VIP','₹2,500','Online','failed','1d'],
                ['RG7344','Anil Kumar','River Sound','1× Day Pass','₹900','Online','paid','2d'],
                ['RG7343','Neha Sinha','Tribal Tales','3× Regular','₹1,527','Online','paid','2d'],
              ].map((r, i, arr) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '0.8fr 1.4fr 1.4fr 1fr 0.9fr 0.8fr 0.9fr 0.5fr',
                  gap: 10, padding: '12px 16px',
                  borderBottom: i < arr.length - 1 ? `1px solid ${HFQ_LINE}` : 0,
                  alignItems: 'center', fontSize: 12,
                  background: r[8] ? HFQ_ACC_2 : '#fff',
                }}>
                  <span className="hf-mono" style={{ fontWeight: 600 }}>#{r[0]}</span>
                  <span style={{ fontWeight: 500 }}>{r[1]}</span>
                  <span style={{ color: HFQ_INK_3 }}>{r[2]}</span>
                  <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>{r[3]}</span>
                  <span className="hf-mono" style={{ fontWeight: 600 }}>{r[4]}</span>
                  <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>{r[5].toUpperCase()}</span>
                  <QOBadge k={r[6] === 'paid' ? 'paid' : r[6] === 'pending' ? 'pending' : r[6] === 'refund' ? 'refund' : 'failed'}>{r[6].toUpperCase()}</QOBadge>
                  <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3, textAlign: 'right' }}>{r[7]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detail drawer */}
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0,
          width: 360, background: '#fff',
          borderLeft: `1px solid ${HFQ_LINE}`,
          padding: 20, overflow: 'auto',
          display: 'flex', flexDirection: 'column', gap: 14,
          boxShadow: '-8px 0 24px rgba(0,0,0,0.04)',
        }}>
          <div className="hf-row">
            <div className="hf-col" style={{ flex: 1 }}>
              <span className="lbl">Order</span>
              <span style={{ fontSize: 20, fontWeight: 600, fontFamily: 'var(--hf-font-mono)' }}>#RG7352</span>
            </div>
            <button className="hf-btn ghost" style={{ padding: 6 }}><HFIcon name="close" size={16}/></button>
          </div>
          <QOBadge k="paid">PAID · PAYSTACK</QOBadge>

          <div className="hf-divider"></div>

          <div className="hf-col" style={{ gap: 8 }}>
            {[
              ['Buyer', 'Prateek Sharma'],
              ['Email', 'prateek@mail.in', 'mono'],
              ['Phone', '+91 98xxxxxxxx', 'mono'],
              ['Created', '11:42:03 · 22 Jul', 'mono'],
              ['IP', '59.144.x.x', 'mono'],
            ].map(([l, v, f]) => (
              <div key={l} className="hf-row" style={{ alignItems: 'baseline' }}>
                <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3, letterSpacing: '0.06em', textTransform: 'uppercase', flex: 1 }}>{l}</span>
                <span style={{ fontSize: 13, fontFamily: f === 'mono' ? 'var(--hf-font-mono)' : 'inherit', fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>

          <div className="hf-divider"></div>

          <div>
            <div className="lbl" style={{ marginBottom: 8 }}>Tickets · 2</div>
            <div className="hf-col" style={{ gap: 6 }}>
              {[
                ['C-4', 'issued', 'TKT-9X2K-LM4P'],
                ['C-5', 'issued', 'TKT-9X2K-LM4Q'],
              ].map(([s, st, code]) => (
                <div key={s} className="hf-card" style={{ padding: 10, borderRadius: 8 }}>
                  <div className="hf-row">
                    <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>Seat {s}</span>
                    <QOBadge k="paid">{st.toUpperCase()}</QOBadge>
                  </div>
                  <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3, marginTop: 2, display: 'block' }}>{code}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hf-divider"></div>

          <div>
            <div className="lbl" style={{ marginBottom: 8 }}>Charges</div>
            <div className="hf-col" style={{ gap: 4 }}>
              {[
                ['2 × Regular', '₹1,000'],
                ['Booking fee', '₹100'],
                ['GST 18%', '₹18'],
                ['WELCOME10', '−₹100', HFQ_ACC],
              ].map(([l, v, c]) => (
                <div key={l} className="hf-row" style={{ padding: '2px 0' }}>
                  <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3, flex: 1 }}>{l}</span>
                  <span className="hf-mono" style={{ fontSize: 11, color: c || HFQ_INK }}>{v}</span>
                </div>
              ))}
              <div className="hf-divider" style={{ margin: '6px 0' }}></div>
              <div className="hf-row">
                <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>Total paid</span>
                <span className="hf-mono" style={{ fontSize: 15, fontWeight: 600 }}>₹1,018</span>
              </div>
            </div>
          </div>

          <div className="hf-row" style={{ gap: 6, marginTop: 'auto' }}>
            <button className="hf-btn xs" style={{ flex: 1 }}><HFIcon name="arrowUR" size={12}/> Refund</button>
            <button className="hf-btn xs" style={{ flex: 1 }}>Resend</button>
            <button className="hf-btn xs" style={{ flex: 1 }}>Ledger</button>
          </div>
        </div>
      </div>
    </HFBrowser>
  );
}

// ─── Analytics ───
function QuietDeskAnalytics() {
  return (
    <HFBrowser url="admin.ticketiv.app/o/rishabh/analytics/tribal-tales" tabs={["Analytics · Tribal Tales"]}>
      <div className="hf-quiet" style={{ background: '#fafafa', display: 'flex', minHeight: '100%' }}>
        <QOSidebar active="analytics"/>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <QOTopBar
            crumb="EVENTS / TRIBAL TALES / ANALYTICS"
            title="Tribal Tales · analytics"
            right={<div className="hf-row" style={{ gap: 8 }}>
              <span className="hf-chip">Compare ▾</span>
              <span className="hf-chip">Last 30 days ▾</span>
              <button className="hf-btn xs"><HFIcon name="download" size={12}/> Export</button>
            </div>}
          />

          <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 14 }}>
              <KPI l="Sell-through" v="71%"    d="6pp"  dir="up"/>
              <KPI l="Unique buyers" v="63"/>
              <KPI l="Conversion"    v="4.2%"  d="0.8pp" dir="up" sub="pageview → buy"/>
              <KPI l="Avg ticket"    v="₹448"  d="₹12"  dir="down"/>
              <KPI l="Refund rate"   v="2.1%"/>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
              {/* Funnel */}
              <div className="hf-card" style={{ padding: 20, borderRadius: 12 }}>
                <div className="hf-between" style={{ marginBottom: 16 }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>Conversion funnel</span>
                  <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>last 30 days</span>
                </div>
                <div className="hf-col" style={{ gap: 10 }}>
                  {[
                    ['Event page views', 100, '12,480'],
                    ['Picked ticket type', 38, '4,742'],
                    ['Reached payment',    14, '1,758'],
                    ['Paid',                4.2, '528'],
                  ].map(([l, w, n], i, arr) => (
                    <div key={l} className="hf-col" style={{ gap: 6 }}>
                      <div className="hf-row" style={{ gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{l}</span>
                        <span className="hf-mono" style={{ fontSize: 12, fontWeight: 600 }}>{n}</span>
                        <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3, width: 40, textAlign: 'right' }}>{w}%</span>
                      </div>
                      <div style={{ height: 12, background: HFQ_LINE, borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: w + '%', background: HFQ_ACC, borderRadius: 4 }}></div>
                      </div>
                      {i < arr.length - 1 && <div className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3, textAlign: 'right' }}>↓ drop {((1 - arr[i+1][1] / w) * 100).toFixed(0)}%</div>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Hourly bars */}
              <div className="hf-card" style={{ padding: 20, borderRadius: 12 }}>
                <div className="hf-between" style={{ marginBottom: 16 }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>Sales by hour</span>
                  <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>last 7d · 528 tix</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', height: 140, gap: 3 }}>
                  {[8,5,3,2,1,2,4,12,18,22,15,12,9,8,15,28,42,55,38,28,20,15,12,10].map((v, i) => (
                    <div key={i} style={{ flex: 1, height: `${(v/60)*100}%`, background: HFQ_ACC, opacity: 0.4 + (v/60)*0.6, borderRadius: '3px 3px 0 0' }}></div>
                  ))}
                </div>
                <div className="hf-row" style={{ justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: HFQ_INK_3, fontFamily: 'var(--hf-font-mono)' }}>
                  <span>00</span><span>06</span><span>12</span><span>18</span><span>24</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              {/* Channel mix donut */}
              <div className="hf-card" style={{ padding: 18, borderRadius: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Channel mix</div>
                <div className="hf-row" style={{ gap: 14, alignItems: 'center' }}>
                  <svg viewBox="0 0 80 80" style={{ width: 80, height: 80 }}>
                    <circle cx="40" cy="40" r="32" fill="none" stroke={HFQ_LINE} strokeWidth="12"/>
                    <circle cx="40" cy="40" r="32" fill="none" stroke={HFQ_ACC}     strokeWidth="12" strokeDasharray="157 201" strokeDashoffset="0" transform="rotate(-90 40 40)"/>
                    <circle cx="40" cy="40" r="32" fill="none" stroke="#3a8a55"     strokeWidth="12" strokeDasharray="36 201"  strokeDashoffset="-157" transform="rotate(-90 40 40)"/>
                    <circle cx="40" cy="40" r="32" fill="none" stroke={HFQ_INK_3}   strokeWidth="12" strokeDasharray="8 201"   strokeDashoffset="-193" transform="rotate(-90 40 40)"/>
                  </svg>
                  <div className="hf-col" style={{ flex: 1, gap: 6 }}>
                    {[['Online',78,HFQ_ACC],['POS',18,'#3a8a55'],['Comp',4,HFQ_INK_3]].map(([l,v,c]) => (
                      <div key={l} className="hf-row" style={{ gap: 6, fontSize: 12 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 999, background: c, flexShrink: 0 }}></span>
                        <span style={{ flex: 1 }}>{l}</span>
                        <span className="hf-mono" style={{ fontWeight: 600 }}>{v}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Promo redemptions */}
              <div className="hf-card" style={{ padding: 18, borderRadius: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Promo redemptions</div>
                <div className="hf-col" style={{ gap: 6 }}>
                  {[
                    ['WELCOME10', 124, '−₹12,400'],
                    ['EARLY100',  38,  '−₹3,800'],
                    ['NEW100',    12,  '−₹1,200'],
                  ].map(([l, n, v]) => (
                    <div key={l} className="hf-row" style={{ fontSize: 12, padding: '4px 0', borderBottom: `1px solid ${HFQ_LINE}` }}>
                      <span className="hf-mono" style={{ fontWeight: 600, flex: 1 }}>{l}</span>
                      <span className="hf-mono" style={{ color: HFQ_INK_3, marginRight: 12 }}>{n}</span>
                      <span className="hf-mono" style={{ fontWeight: 600, color: HFQ_ACC }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div className="hf-row" style={{ marginTop: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>Total saved</span>
                  <span className="hf-mono" style={{ fontSize: 14, fontWeight: 600, color: HFQ_ACC }}>−₹17,400</span>
                </div>
              </div>

              {/* Traffic source */}
              <div className="hf-card" style={{ padding: 18, borderRadius: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Traffic sources</div>
                <div className="hf-col" style={{ gap: 6 }}>
                  {[['Direct',42],['Instagram',28],['Friend invite',18],['Search',8],['Other',4]].map(([l,v]) => (
                    <div key={l} className="hf-col" style={{ gap: 2 }}>
                      <div className="hf-row" style={{ fontSize: 12 }}>
                        <span style={{ flex: 1 }}>{l}</span>
                        <span className="hf-mono" style={{ fontWeight: 600 }}>{v}%</span>
                      </div>
                      <div style={{ height: 4, background: HFQ_LINE, borderRadius: 999 }}>
                        <div style={{ height: '100%', width: v + '%', background: HFQ_ACC, borderRadius: 999, opacity: 0.4 + (v/100)*0.6 }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Cohort */}
            <div className="hf-card" style={{ padding: 20, borderRadius: 12 }}>
              <div className="hf-between" style={{ marginBottom: 14 }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>Repeat buyer cohorts</span>
                <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>% who attended ≥2 events</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto repeat(6, 1fr)', gap: 4 }}>
                <span></span>
                {['M0','M1','M2','M3','M4','M5'].map(m => (
                  <span key={m} className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3, textAlign: 'center', padding: 4 }}>{m}</span>
                ))}
                {[
                  ['Feb cohort', [100, 38, 24, 18, 14, 10]],
                  ['Mar cohort', [100, 42, 28, 22, 16]],
                  ['Apr cohort', [100, 48, 34, 26]],
                  ['May cohort', [100, 52, 38]],
                  ['Jun cohort', [100, 56]],
                  ['Jul cohort', [100]],
                ].map(([n, vals]) => (
                  <React.Fragment key={n}>
                    <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3, padding: 4 }}>{n}</span>
                    {vals.map((v, i) => (
                      <div key={i} style={{ aspectRatio: '1', background: v === 100 ? HFQ_INK : HFQ_ACC, opacity: v === 100 ? 1 : 0.2 + (v/60)*0.7, borderRadius: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 600, fontFamily: 'var(--hf-font-mono)' }}>{v}</div>
                    ))}
                    {Array.from({ length: 6 - vals.length }).map((_, i) => <span key={`e${i}`}></span>)}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </HFBrowser>
  );
}

// ─── Payouts ───
function QuietDeskPayouts() {
  return (
    <HFBrowser url="admin.ticketiv.app/o/rishabh/payouts" tabs={["Payouts · Ticketiv admin"]}>
      <div className="hf-quiet" style={{ background: '#fafafa', display: 'flex', minHeight: '100%' }}>
        <QOSidebar active="payouts"/>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <QOTopBar
            crumb="MONEY / PAYOUTS"
            title="Payouts & ledger"
            right={<div className="hf-row" style={{ gap: 8 }}>
              <button className="hf-btn xs">Statements</button>
              <button className="hf-btn accent xs"><HFIcon name="arrowUR" size={12}/> Request payout</button>
            </div>}
          />

          <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 14 }}>
              <KPI l="Available balance" v="₹62,400" sub="Withdraw any time"/>
              <KPI l="On hold"            v="₹8,100"  sub="Releases per ticket scan"/>
              <KPI l="Lifetime gross"     v="₹4.82L"/>
              <KPI l="Payout account"     v="HDFC ••12" sub="Verified · primary"/>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {/* Payouts table */}
              <div className="hf-card" style={{ borderRadius: 12 }}>
                <div className="hf-between" style={{ padding: '14px 18px', borderBottom: `1px solid ${HFQ_LINE}` }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Recent payouts</span>
                  <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>last 12 mo · 12 payouts</span>
                </div>
                {[
                  ['18 Jul','₹38,000','HDFC ••12','paid','PO-2401'],
                  ['04 Jul','₹52,100','HDFC ••12','paid','PO-2378'],
                  ['20 Jun','₹41,800','HDFC ••12','paid','PO-2330'],
                  ['06 Jun','₹19,500','HDFC ••12','pending','PO-2308'],
                  ['23 May','₹8,200','HDFC ••12','failed','PO-2245'],
                ].map((r, i, arr) => (
                  <div key={i} style={{ padding: '12px 18px', display: 'grid', gridTemplateColumns: '0.7fr 1fr 1.2fr 0.8fr 0.8fr', gap: 8, alignItems: 'center', borderBottom: i < arr.length - 1 ? `1px solid ${HFQ_LINE}` : 0, fontSize: 12 }}>
                    <span className="hf-mono" style={{ color: HFQ_INK_3 }}>{r[0]}</span>
                    <span className="hf-mono" style={{ fontWeight: 600 }}>{r[1]}</span>
                    <span className="hf-mono" style={{ color: HFQ_INK_3 }}>{r[2]}</span>
                    <QOBadge k={r[3] === 'paid' ? 'paid' : r[3] === 'pending' ? 'pending' : 'failed'}>{r[3].toUpperCase()}</QOBadge>
                    <span className="hf-mono" style={{ color: HFQ_INK_3, textAlign: 'right' }}>{r[4]}</span>
                  </div>
                ))}
              </div>

              {/* Ledger */}
              <div className="hf-card" style={{ borderRadius: 12 }}>
                <div className="hf-between" style={{ padding: '14px 18px', borderBottom: `1px solid ${HFQ_LINE}` }}>
                  <div className="hf-col">
                    <span style={{ fontSize: 14, fontWeight: 600 }}>Ledger · double-entry</span>
                    <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>every charge, refund &amp; payout</span>
                  </div>
                  <span className="hf-mono" style={{ fontSize: 11, color: HFQ_ACC, fontWeight: 600 }}>full ledger ›</span>
                </div>
                {[
                  ['order_gross', '#RG7352',   '+₹1,018', '₹72,568'],
                  ['fee_platform','#RG7352',   '−₹80',    '₹72,488'],
                  ['fee_processor','#RG7352',  '−₹20',    '₹72,468'],
                  ['tax_gst',     '#RG7352',   '−₹18',    '₹72,450'],
                  ['refund',      '#RG7347',   '−₹500',   '₹71,950'],
                  ['payout_paid', 'PO-2401',   '−₹38,000','₹33,950'],
                  ['order_gross', '#RG7348',   '+₹250',   '₹34,200'],
                  ['adjustment',  'manual fix','+₹100',   '₹34,300'],
                ].map((r, i, arr) => (
                  <div key={i} style={{ padding: '10px 18px', display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr 0.8fr', gap: 8, alignItems: 'center', borderBottom: i < arr.length - 1 ? `1px solid ${HFQ_LINE}` : 0, fontSize: 11 }}>
                    <span className="hf-mono" style={{ color: HFQ_INK_3 }}>{r[0]}</span>
                    <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>{r[1]}</span>
                    <span className="hf-mono" style={{ fontWeight: 600, color: r[2].startsWith('+') ? HFQ_ACC : HFQ_INK }}>{r[2]}</span>
                    <span className="hf-mono" style={{ color: HFQ_INK_3, textAlign: 'right' }}>{r[3]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Account */}
            <div className="hf-card" style={{ padding: 20, borderRadius: 12 }}>
              <div className="hf-between" style={{ marginBottom: 12 }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>Payout accounts</span>
                <button className="hf-btn xs"><HFIcon name="plus" size={12}/> Add account</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                  ['Primary',   'HDFC ••12',  'IFSC HDFC0001234', 'verified',  HFQ_ACC],
                  ['Backup',    'ICICI ••88', 'IFSC ICIC0007890', 'verified',  HFQ_ACC],
                  ['Wallet',    'Razorpay X · rishabh@rzp', null,              'pending',  '#c1841c'],
                ].map(([l, n, sub, st, c]) => (
                  <div key={l} className="hf-card" style={{ padding: 12, borderRadius: 10 }}>
                    <div className="lbl" style={{ marginBottom: 4 }}>{l}</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{n}</div>
                    {sub && <div className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3, marginTop: 2 }}>{sub}</div>}
                    <div style={{ marginTop: 8, color: c, fontSize: 10, fontWeight: 600, fontFamily: 'var(--hf-font-mono)' }}>● {st.toUpperCase()}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </HFBrowser>
  );
}

// ─── Team & roles ───
function QuietDeskTeam() {
  return (
    <HFBrowser url="admin.ticketiv.app/o/rishabh/settings/team" tabs={["Team · Ticketiv admin"]}>
      <div className="hf-quiet" style={{ background: '#fafafa', display: 'flex', minHeight: '100%' }}>
        <QOSidebar active="team"/>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <QOTopBar
            crumb="OPS / TEAM"
            title="Team &amp; roles"
            right={<button className="hf-btn accent xs"><HFIcon name="plus" size={12}/> Invite member</button>}
          />

          <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="hf-card" style={{ borderRadius: 12 }}>
              <div className="hf-between" style={{ padding: '14px 18px', borderBottom: `1px solid ${HFQ_LINE}` }}>
                <div className="hf-col">
                  <span style={{ fontSize: 15, fontWeight: 600 }}>Members</span>
                  <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>8 active · 1 pending invite</span>
                </div>
                <div style={{ background: '#fafafa', border: `1px solid ${HFQ_LINE_2}`, borderRadius: 8, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 6, width: 220 }}>
                  <HFIcon name="search" size={14} style={{ color: HFQ_INK_3 }}/>
                  <span style={{ fontSize: 12, color: HFQ_INK_3 }}>filter members</span>
                </div>
              </div>
              <div style={{ padding: '10px 18px', display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.2fr 0.8fr 0.8fr 16px', gap: 10, fontSize: 10, color: HFQ_INK_3, fontFamily: 'var(--hf-font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, background: '#fafafa', borderBottom: `1px solid ${HFQ_LINE}` }}>
                <span>Member</span><span>Role</span><span>Events scoped</span><span>Joined</span><span>Last active</span><span></span>
              </div>
              {[
                [HF_PHOTOS.face_6, 'Rishabh M.','organizer_owner', 'all',                  '12 Jan',  'just now', 'acc'],
                [HF_PHOTOS.face_8, 'Neha S.',   'organizer_admin', 'all',                  '18 Feb',  '8m',       null],
                [HF_PHOTOS.face_5, 'Anil K.',   'scanner',         'Tribal Tales',         '02 May',  '2h',       null],
                [HF_PHOTOS.face_4, 'Priya P.',  'event_admin',     'Open Mic Friday',      '12 Mar',  'yesterday',null],
                [null,             'iPad · Box','pos',             'all',                  '04 Jul',  '3m',       null],
                [HF_PHOTOS.face_2, 'Asha I.',   'support',         'all',                  '21 Apr',  '3d',       null],
                [HF_PHOTOS.face_3, 'Manish G.', 'scanner',         'River Sound Fest',     '02 Jul',  'never',    'warn'],
                [HF_PHOTOS.face_7, 'Smit M.',   'read_only',       'all',                  '18 Jul',  'just now', null],
              ].map((r, i, arr) => (
                <div key={i} style={{ padding: '12px 18px', display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.2fr 0.8fr 0.8fr 16px', gap: 10, alignItems: 'center', borderBottom: i < arr.length - 1 ? `1px solid ${HFQ_LINE}` : 0, fontSize: 13 }}>
                  <div className="hf-row" style={{ gap: 10 }}>
                    {r[0] ? <HFAvatar src={r[0]} size={26}/> : <span style={{ width: 26, height: 26, borderRadius: 999, background: HFQ_INK, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}><HFIcon name="qr" size={13}/></span>}
                    <span style={{ fontWeight: 600 }}>{r[1]}</span>
                    {r[6] === 'warn' && <span className="hf-mono" style={{ fontSize: 9, padding: '1px 6px', background: '#fdf6ed', color: '#c1841c', borderRadius: 4, fontWeight: 600 }}>NEVER LOGGED IN</span>}
                  </div>
                  <QOBadge k={r[2] === 'organizer_owner' ? 'live' : r[2].includes('admin') || r[2] === 'pos' ? 'paid' : 'draft'}>{r[2]}</QOBadge>
                  <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>{r[3]}</span>
                  <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>{r[4]}</span>
                  <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>{r[5]}</span>
                  <HFIcon name="chevR" size={14} style={{ color: HFQ_INK_3 }}/>
                </div>
              ))}
            </div>

            {/* Permissions matrix */}
            <div className="hf-card" style={{ padding: 20, borderRadius: 12 }}>
              <div className="hf-between" style={{ marginBottom: 14 }}>
                <div className="hf-col">
                  <span style={{ fontSize: 15, fontWeight: 600 }}>Role permissions</span>
                  <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>13 platform actors · app_role enum</span>
                </div>
                <button className="hf-btn xs">View all permissions</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr repeat(6, 1fr)', gap: 8, padding: '8px 0', borderBottom: `1px solid ${HFQ_LINE}`, fontSize: 10, color: HFQ_INK_3, fontFamily: 'var(--hf-font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>
                <span>Capability</span>
                {['owner','admin','event_admin','scanner','pos','support'].map(r => <span key={r}>{r}</span>)}
              </div>
              {[
                ['Create / publish events',  ['✓','✓','scope','','','']],
                ['Manage ticket types',      ['✓','✓','scope','','','']],
                ['Issue refunds',            ['✓','✓','scope','','','✓']],
                ['Request payouts',          ['✓','','','','','']],
                ['Manage team',              ['✓','','','','','']],
                ['Scan tickets',             ['✓','✓','scope','✓','','']],
                ['Sell at door',             ['✓','✓','scope','','✓','']],
                ['View analytics',           ['✓','✓','scope','','','read']],
              ].map(([cap, vals], i, arr) => (
                <div key={cap} style={{ display: 'grid', gridTemplateColumns: '2fr repeat(6, 1fr)', gap: 8, padding: '10px 0', borderBottom: i < arr.length - 1 ? `1px solid ${HFQ_LINE}` : 0, alignItems: 'center', fontSize: 12 }}>
                  <span style={{ fontWeight: 500 }}>{cap}</span>
                  {vals.map((v, j) => (
                    <span key={j} style={{ fontSize: 11, fontFamily: 'var(--hf-font-mono)', color: v === '✓' ? HFQ_ACC : (v === 'scope' || v === 'read') ? HFQ_INK_3 : HFQ_LINE_2, fontWeight: 600 }}>{v || '—'}</span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </HFBrowser>
  );
}

// ─── Scanner station (desktop kiosk) ───
function QuietDeskScan() {
  return (
    <HFBrowser url="admin.ticketiv.app/o/rishabh/scan/tribal-tales" tabs={["Scan station · Tribal Tales"]}>
      <div style={{ background: HFQ_INK, color: '#fff', minHeight: '100%', display: 'flex', flexDirection: 'column' }} className="hf-quiet">
        <div style={{ padding: '16px 32px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="hf-col" style={{ gap: 2 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Scan station · Gate 1</span>
            <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.022em' }}>Tribal Tales · live</span>
          </div>
          <span style={{ flex: 1 }}></span>
          <span className="hf-row" style={{ gap: 6 }}><span className="hf-live-dot"></span><span className="hf-mono" style={{ fontSize: 12, color: HFQ_ACC, fontWeight: 600 }}>ONLINE</span></span>
          <span style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.15)' }}></span>
          <span className="hf-mono" style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>device #4 · Anil K.</span>
          <button style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 500, fontFamily: 'inherit' }}>End shift</button>
        </div>

        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 360px' }}>
          {/* Main scan */}
          <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ flex: 1, border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 16, background: 'radial-gradient(circle at 50% 50%, rgba(107,63,189,0.18), transparent 60%), #1a1a20', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="hf-mono" style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em' }}>AIM AT QR · OR ENTER CODE</span>
              {[[0,0],[1,0],[0,1],[1,1]].map(([x,y], i) => {
                const sz = 40;
                return (
                  <div key={i} style={{
                    position: 'absolute',
                    [x ? 'right' : 'left']: 32,
                    [y ? 'bottom' : 'top']: 32,
                    width: sz, height: sz,
                    borderTop: y ? 0 : `3px solid ${HFQ_ACC}`,
                    borderBottom: y ? `3px solid ${HFQ_ACC}` : 0,
                    borderLeft: x ? 0 : `3px solid ${HFQ_ACC}`,
                    borderRight: x ? `3px solid ${HFQ_ACC}` : 0,
                    borderRadius: 6,
                  }}/>
                );
              })}
              <div style={{ position: 'absolute', left: 32, right: 32, top: '50%', height: 2, background: HFQ_ACC, boxShadow: `0 0 16px ${HFQ_ACC}`, opacity: 0.8 }}></div>
            </div>

            {/* last result */}
            <div style={{ background: 'rgba(107,63,189,0.18)', border: `1px solid ${HFQ_ACC}`, borderRadius: 14, padding: 22, display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: 999, background: HFQ_ACC, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <HFIcon name="check" size={32} stroke={3}/>
              </div>
              <div className="hf-col" style={{ flex: 1, gap: 4 }}>
                <span style={{ fontSize: 22, fontWeight: 700 }}>VALID · checked in</span>
                <span className="hf-mono" style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>3 SECONDS AGO · AUTO-ADVANCE 2S</span>
                <div className="hf-row" style={{ gap: 8, marginTop: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Prateek Sharma</span>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>·</span>
                  <span className="hf-mono" style={{ fontSize: 12 }}>Seat C-4 · Regular</span>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>·</span>
                  <span className="hf-mono" style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>TKT-9X2K-LM4P</span>
                </div>
              </div>
              <button className="hf-btn accent">Next scan <HFIcon name="arrowR" size={14}/></button>
            </div>

            {/* stats */}
            <div style={{ display: 'flex', gap: 14 }}>
              {[
                ['Scanned', '214', HFQ_ACC],
                ['Rejected', '6', '#ef4444'],
                ['Capacity', '320', '#fff'],
                ['Rate', '42/min', '#fff'],
              ].map(([l, v, c]) => (
                <div key={l} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 14 }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>{l}</span>
                  <div className="hf-mono" style={{ fontSize: 26, fontWeight: 600, color: c, marginTop: 6 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Side feed */}
          <div style={{ borderLeft: '1px solid rgba(255,255,255,0.08)', padding: '20px 22px', overflow: 'auto' }}>
            <div className="hf-between" style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Live feed</span>
              <span className="hf-mono" style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>last 5 min</span>
            </div>
            {[
              ['VALID','Asha I. · C-5','12s','ok'],
              ['VALID','Prateek S. · C-4','3s','ok'],
              ['DUPLICATE','Vicky K. · already in 8:02','42s','rej'],
              ['VALID','Riya M. · GA','1m','ok'],
              ['WRONG EVT','TKT for Open Mic','2m','rej'],
              ['VALID','Manish G. · F-12','2m','ok'],
              ['VALID','Smit M. · F-13','3m','ok'],
              ['REVOKED','resold ticket','4m','rej'],
              ['VALID','Anil K. · GA','5m','ok'],
              ['VALID','Neha S. · VIP','5m','ok'],
              ['VALID','Farah K. · C-12','6m','ok'],
              ['VALID','Salman K. · D-3','7m','ok'],
            ].map((r, i) => (
              <div key={i} style={{ padding: '8px 10px', borderRadius: 8, background: r[3] === 'rej' ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.04)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', color: r[3] === 'ok' ? HFQ_ACC : '#ff8a7a', background: r[3] === 'ok' ? 'rgba(107,63,189,0.18)' : 'rgba(239,68,68,0.18)', padding: '3px 7px', borderRadius: 4, minWidth: 76, textAlign: 'center', fontFamily: 'var(--hf-font-mono)' }}>{r[0]}</span>
                <span style={{ flex: 1, fontSize: 12 }}>{r[1]}</span>
                <span className="hf-mono" style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{r[2]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </HFBrowser>
  );
}

// ─── Super-admin platform overview ───
function QuietDeskSuperAdmin() {
  return (
    <HFBrowser url="admin.ticketiv.app/_platform" tabs={["Platform · Ticketiv super-admin"]}>
      <div className="hf-quiet" style={{ background: '#fafafa', display: 'flex', minHeight: '100%' }}>
        <div style={{ width: 220, background: '#fff', borderRight: `1px solid ${HFQ_LINE}`, padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 4, overflow: 'auto', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px 12px' }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: HFQ_INK, color: HFQ_ACC, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>T</div>
            <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.02em' }}>ticketiv</span>
            <span className="hf-mono" style={{ fontSize: 9, padding: '2px 5px', background: HFQ_INK, color: HFQ_ACC, borderRadius: 4, fontWeight: 600, letterSpacing: '0.04em' }}>ADM</span>
          </div>
          <div style={{ fontSize: 10, color: HFQ_INK_3, padding: '8px 10px 4px', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Platform</div>
          {[
            ['Overview',       'spark', true],
            ['Organizations',  'cal',  false, '184'],
            ['Providers',      'wallet',false],
            ['Admins & roles', 'user', false],
            ['Feature flags',  'filter',false],
            ['Action catalog', 'fileText',false],
            ['Audit log',      'fileText',false],
            ['Jobs queue',     'zap',  false, '142'],
            ['Webhooks',       'globe',false],
            ['DB · Supabase',  'wallet',false],
          ].map(([l, i, on, c]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', borderRadius: 8, background: on ? HFQ_ACC_2 : 'transparent', color: on ? HFQ_ACC : HFQ_INK_2, fontSize: 13, fontWeight: on ? 600 : 500 }}>
              <HFIcon name={i} size={16}/>
              <span style={{ flex: 1 }}>{l}</span>
              {c && <span className="hf-mono" style={{ fontSize: 10, color: on ? HFQ_ACC : HFQ_INK_3, padding: '1px 6px', background: '#fafafa', borderRadius: 4, fontWeight: 600 }}>{c}</span>}
            </div>
          ))}
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          <QOTopBar
            crumb="PLATFORM · LAST 7 DAYS"
            title="Super-admin overview"
            right={<div className="hf-row" style={{ gap: 8 }}>
              <QOBadge k="live">SUPER_ADMIN · SMIT M.</QOBadge>
              <button className="hf-btn xs"><HFIcon name="download" size={12}/> Export report</button>
            </div>}
          />

          <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 14 }}>
              <KPI l="Active orgs"  v="184"  d="+6"   dir="up"/>
              <KPI l="Tickets · 7d" v="42,318" d="12%" dir="up"/>
              <KPI l="GMV · 7d"     v="₹2.18 Cr" d="9%" dir="up"/>
              <KPI l="Take rate"    v="6.4%" sub="of GMV"/>
              <KPI l="Open jobs"    v="142"  d="−8"   dir="down"/>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14 }}>
              <div className="hf-card" style={{ borderRadius: 12 }}>
                <div className="hf-between" style={{ padding: '14px 18px', borderBottom: `1px solid ${HFQ_LINE}` }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Provider health · 24h</span>
                  <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>auto-refresh 30s</span>
                </div>
                <div style={{ padding: '8px 18px', display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1.4fr 0.8fr 0.8fr', gap: 10, fontSize: 10, color: HFQ_INK_3, fontFamily: 'var(--hf-font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, background: '#fafafa', borderBottom: `1px solid ${HFQ_LINE}` }}>
                  <span>Provider</span><span>Success</span><span>Webhooks</span><span>P95</span><span>Status</span>
                </div>
                {[
                  ['Paystack',      '98.7%', '12,482 / 12,488', '612 ms', 'ok'],
                  ['DeltaPay',      '94.2%', '2,108 / 2,220',   '1.4 s',  'degraded'],
                  ['Flutterwave',   '99.1%', '618 / 622',       '420 ms', 'ok'],
                  ['Manual / bank', '—',     '—',                '—',      'ok'],
                ].map((r, i, arr) => (
                  <div key={i} style={{ padding: '12px 18px', display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1.4fr 0.8fr 0.8fr', gap: 10, alignItems: 'center', borderBottom: i < arr.length - 1 ? `1px solid ${HFQ_LINE}` : 0, fontSize: 12 }}>
                    <span style={{ fontWeight: 600 }}>{r[0]}</span>
                    <span className="hf-mono">{r[1]}</span>
                    <span className="hf-mono" style={{ color: HFQ_INK_3 }}>{r[2]}</span>
                    <span className="hf-mono">{r[3]}</span>
                    <QOBadge k={r[4] === 'ok' ? 'paid' : 'paused'}>{r[4].toUpperCase()}</QOBadge>
                  </div>
                ))}
              </div>

              <div className="hf-card" style={{ padding: 18, borderRadius: 12 }}>
                <div className="hf-between" style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Job queue</span>
                  <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>depth</span>
                </div>
                <div className="hf-col" style={{ gap: 10 }}>
                  {[
                    ['send_email_receipt',     22, 'ok'],
                    ['scan_audit_replay',      8,  'ok'],
                    ['payout_disbursement',    4,  'ok'],
                    ['refund_provider_call',   88, 'backlog'],
                    ['webhook_retry · deltapay',20,'retry'],
                  ].map(([n, v, st]) => (
                    <div key={n} className="hf-row" style={{ gap: 8 }}>
                      <span className="hf-mono" style={{ fontSize: 11, flex: 1, color: HFQ_INK }}>{n}</span>
                      <div style={{ width: 100, height: 8, background: HFQ_LINE, borderRadius: 999 }}>
                        <div style={{ height: '100%', width: `${Math.min(v, 100)}%`, background: st === 'ok' ? HFQ_ACC : st === 'backlog' ? '#ef4444' : '#c1841c', borderRadius: 999 }}></div>
                      </div>
                      <span className="hf-mono" style={{ fontSize: 11, fontWeight: 600, width: 26, textAlign: 'right' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="hf-card" style={{ borderRadius: 12 }}>
              <div className="hf-between" style={{ padding: '14px 18px', borderBottom: `1px solid ${HFQ_LINE}` }}>
                <div className="hf-col">
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Organizations</span>
                  <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>184 active · 6 new this week · 2 on review</span>
                </div>
                <div className="hf-row" style={{ gap: 8 }}>
                  <div style={{ background: '#fafafa', border: `1px solid ${HFQ_LINE_2}`, borderRadius: 8, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 6, width: 240 }}>
                    <HFIcon name="search" size={14} style={{ color: HFQ_INK_3 }}/>
                    <span style={{ fontSize: 12, color: HFQ_INK_3 }}>search 184 organizations</span>
                  </div>
                  <button className="hf-btn xs">Filters</button>
                </div>
              </div>
              <div style={{ padding: '10px 18px', display: 'grid', gridTemplateColumns: '2fr 0.7fr 0.7fr 0.9fr 1.4fr 0.7fr', gap: 10, fontSize: 10, color: HFQ_INK_3, fontFamily: 'var(--hf-font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, background: '#fafafa', borderBottom: `1px solid ${HFQ_LINE}` }}>
                <span>Org</span><span>Plan</span><span>Live</span><span>7d gross</span><span>Flags</span><span>Status</span>
              </div>
              {[
                ["Rishabh's Events", 'Standard', '3',  '₹91k',   'seated, resale',             'paid'],
                ['The Loft',         'Pro',      '8',  '₹2.4L',  'resale, pos',                'paid'],
                ['Comedy Co.',       'Standard', '12', '₹1.1L',  '—',                          'paid'],
                ['River Sound Org',  'Pro',      '1',  '₹14.6L', 'seated, resale, payout_hold','pending'],
                ['Local Fest',       'Starter',  '2',  '₹38k',   'beta_kiosk',                 'paid'],
                ['Studio X',         'Standard', '6',  '₹52k',   '—',                          'paused'],
              ].map((r, i, arr) => (
                <div key={i} style={{ padding: '12px 18px', display: 'grid', gridTemplateColumns: '2fr 0.7fr 0.7fr 0.9fr 1.4fr 0.7fr', gap: 10, alignItems: 'center', borderBottom: i < arr.length - 1 ? `1px solid ${HFQ_LINE}` : 0, fontSize: 12 }}>
                  <span style={{ fontWeight: 600 }}>{r[0]}</span>
                  <span className="hf-mono" style={{ color: HFQ_INK_3 }}>{r[1]}</span>
                  <span className="hf-mono">{r[2]}</span>
                  <span className="hf-mono" style={{ fontWeight: 600 }}>{r[3]}</span>
                  <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>{r[4]}</span>
                  <QOBadge k={r[5] === 'paid' ? 'paid' : r[5] === 'pending' ? 'pending' : 'paused'}>{r[5].toUpperCase()}</QOBadge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </HFBrowser>
  );
}

Object.assign(window, {
  QuietDeskOrgDash, QuietDeskEvents, QuietDeskEventEdit, QuietDeskOrders,
  QuietDeskAnalytics, QuietDeskPayouts, QuietDeskTeam, QuietDeskScan, QuietDeskSuperAdmin,
});
