// Desktop organizer + super-admin screens.

function DeskOrgDashboard() {
  const nav = ORG_NAV.map(n => ({ ...n, on: n.l === 'Overview' }));
  return (
    <Desk url="ticketiv.com/o/rishabh/dashboard" tab="Dashboard · Ticketiv">
      <Sidebar items={nav} />
      <div className="desk-main">
        <div className="desk-top">
          <div className="col" style={{ gap: 2 }}>
            <div className="crumb">organizations · Rishabh's Events</div>
            <h1>Welcome back, Rishabh ✦</h1>
          </div>
          <span className="btn">↗ Public page</span>
          <span className="btn primary">+ New event</span>
        </div>

        <div className="desk-content">
          <div className="row-cols">
            <KPI label="Tickets sold · 7d" val="182" delta="24% vs prev" />
            <KPI label="Gross · 7d" val="₹91 050" delta="18%" />
            <KPI label="Net (after fees)" val="₹78 421" />
            <KPI label="Refund rate" val="2.1%" delta="0.4pp" deltaDir="down" />
          </div>

          <div className="split-2">
            <div className="chart">
              <div className="row between mb4">
                <b>Sales · last 30 days</b>
                <div className="row gap8 tiny muted">
                  <span><span style={{display:'inline-block',width:10,height:10,background:'var(--accent)',marginRight:4}}></span>Revenue ₹</span>
                  <span><span style={{display:'inline-block',width:10,height:10,background:'var(--ink-3)',marginRight:4}}></span>Tickets</span>
                  <span>•••</span>
                </div>
              </div>
              <svg viewBox="0 0 600 200" style={{ width: '100%', height: 200 }}>
                {/* grid */}
                {[0,1,2,3,4].map(i => (
                  <line key={i} x1="0" x2="600" y1={i*45+10} y2={i*45+10} stroke="var(--ink-4)" strokeDasharray="3 4" strokeWidth="0.8"/>
                ))}
                {/* revenue area */}
                <polyline
                  points="0,160 30,150 60,140 90,120 120,128 150,110 180,98 210,118 240,80 270,75 300,90 330,68 360,55 390,72 420,40 450,52 480,30 510,38 540,20 570,28 600,18"
                  fill="none" stroke="var(--accent)" strokeWidth="2.5" />
                {/* tickets line dashed */}
                <polyline
                  points="0,180 30,170 60,172 90,158 120,164 150,150 180,142 210,148 240,130 270,128 300,134 330,124 360,118 390,124 420,110 450,116 480,104 510,108 540,98 570,102 600,96"
                  fill="none" stroke="var(--ink-3)" strokeWidth="1.6" strokeDasharray="4 4" />
                <text x="0" y="195" fontSize="9" fill="var(--ink-3)" fontFamily="var(--font-mono)">Jul 1</text>
                <text x="280" y="195" fontSize="9" fill="var(--ink-3)" fontFamily="var(--font-mono)">Jul 15</text>
                <text x="570" y="195" fontSize="9" fill="var(--ink-3)" fontFamily="var(--font-mono)">today</text>
              </svg>
            </div>

            <div className="chart">
              <div className="row between mb4"><b>Top events</b><span className="tiny muted">by revenue · 30d</span></div>
              <div className="col gap8">
                {[
                  ["Tribal Tales", 92, "₹38k"],
                  ["River Sound Fest", 78, "₹32k"],
                  ["Open Mic Fridays", 54, "₹14k"],
                  ["Comedy Night", 40, "₹8k"],
                  ["Sunset Set", 28, "₹4k"],
                ].map(([n, w, v]) => (
                  <div key={n} className="col gap2">
                    <div className="row between tiny"><span>{n}</span><span className="kmono">{v}</span></div>
                    <div style={{ height: 6, border: '1px solid var(--ink-4)', borderRadius: 3, background: 'var(--paper-2)' }}>
                      <div style={{ width: w + '%', height: '100%', background: 'var(--accent)', borderRadius: 3 }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="split-2">
            <div className="panel">
              <div className="panel-head">Live & upcoming <span className="grow"></span><span className="tiny muted">3 events</span></div>
              {[
                ["Tribal Tales","Tonight · 3h to start","85 / 120","12 scanned","live"],
                ["Open Mic Friday","Fri 25 · 8 PM","42 / 60","—","on_sale"],
                ["Indie Showcase","Sat 26 · 10 PM","18 / 80","—","on_sale"],
              ].map(([n, w, s, sc, st]) => (
                <div key={n} className="card thin row">
                  <div className="ph" style={{ width: 44, height: 44 }}>img</div>
                  <div className="col grow">
                    <b className="tiny">{n}</b>
                    <div className="tiny muted">{w}</div>
                  </div>
                  <div className="col" style={{ alignItems: 'flex-end' }}>
                    <Badge kind={st === 'live' ? 'acc' : 'soft'}>{st}</Badge>
                    <div className="tiny kmono">{s}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="panel">
              <div className="panel-head">Activity</div>
              <div className="col gap6">
                {[
                  ["✓","Asha booked 2× Regular","2m"],
                  ["⇄","Salman transferred ticket → Vicky","8m"],
                  ["★","New 5★ review on Tribal Tales","21m"],
                  ["↻","Refund processed · ₹450 → Visa","1h"],
                  ["⌖","Gate 1 scanner online · device #4","2h"],
                  ["💸","Payout requested · ₹62 400","yesterday"],
                ].map(([g,t,when]) => (
                  <div key={t} className="row gap8" style={{ padding: '4px 0', borderBottom: '1px dashed var(--ink-4)' }}>
                    <span className="stamp" style={{ width: 22, height: 22 }}>{g}</span>
                    <div className="grow tiny">{t}</div>
                    <span className="tiny muted">{when}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Note bottom={20} right={20} w={150}>
            sidebar persists, content swaps per route
          </Note>
        </div>
      </div>
    </Desk>
  );
}

function DeskEventsList() {
  return (
    <Desk url="ticketiv.com/o/rishabh/events" tab="Events · Ticketiv">
      <Sidebar />
      <div className="desk-main">
        <div className="desk-top">
          <div className="col" style={{ gap: 2 }}><div className="crumb">Rishabh's Events / Events</div><h1>Events</h1></div>
          <div className="filterbar">
            <span className="chip on">All <span className="kmono">23</span></span>
            <span className="chip">Draft <span className="kmono">4</span></span>
            <span className="chip">On sale <span className="kmono">12</span></span>
            <span className="chip">Past <span className="kmono">7</span></span>
          </div>
          <span className="btn primary">+ New event</span>
        </div>

        <div className="desk-content">
          <div className="filterbar">
            <div className="input" style={{ minWidth: 280 }}><span>⌕</span><span className="muted">Search by title, venue, series…</span></div>
            <span className="chip">Series ▾</span>
            <span className="chip">Venue ▾</span>
            <span className="chip">Date range ▾</span>
            <span className="chip">Visibility ▾</span>
            <div className="grow"></div>
            <span className="tiny muted">Sort:</span>
            <span className="chip">Date · soonest ▾</span>
          </div>

          <div className="tbl">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 24 }}><span className="check"></span></th>
                  <th>Event</th>
                  <th>Date · venue</th>
                  <th>Status</th>
                  <th>Sold</th>
                  <th>Gross</th>
                  <th>Visibility</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Tribal Tales", "Wed 30 Aug · Cafe Natarani", "live", "85/120", "₹38 050", "public", "soft"],
                  ["Open Mic Friday", "Fri 25 Jul · Studio X", "on_sale", "42/60", "₹10 500", "public", ""],
                  ["Indie Showcase", "Sat 26 Jul · The Loft", "on_sale", "18/80", "₹14 400", "public", ""],
                  ["River Sound Fest", "Fri 25 → Sun 27 · Riverside", "on_sale", "612/1200", "₹14.6L", "public", "acc"],
                  ["Comedy Night", "Thu 24 Jul · Lol HQ", "paused", "20/100", "₹7 000", "public", "warn"],
                  ["Sunset Set", "Sat 23 Aug · Riverside", "draft", "—", "—", "unlisted", "ink"],
                  ["Tribal Tales · Mumbai", "Sat 09 Sep · Antisocial", "scheduled", "0/200", "—", "public", ""],
                  ["Tech Talks", "Tue 29 Jul · BlueSpace", "sold_out", "120/120", "₹18 000", "public", "ink"],
                ].map(([n,d,s,sold,g,v,k]) => (
                  <tr key={n}>
                    <td><span className="check"></span></td>
                    <td><b>{n}</b></td>
                    <td className="tcell-mono" style={{ fontSize: 11 }}>{d}</td>
                    <td><Badge kind={k}>{s}</Badge></td>
                    <td className="tcell-mono">{sold}</td>
                    <td className="tcell-mono">{g}</td>
                    <td><span className="tiny muted">{v}</span></td>
                    <td><span className="muted">⋯</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="row between tiny muted">
            <span>8 of 23 events</span>
            <div className="row gap6">
              <span className="chip">‹ Prev</span>
              <span className="chip on">1</span>
              <span className="chip">2</span>
              <span className="chip">3</span>
              <span className="chip">Next ›</span>
            </div>
          </div>

          <Note bottom={32} right={20} w={140}>
            multi-select → bulk publish/unpublish/duplicate
          </Note>
        </div>
      </div>
    </Desk>
  );
}

function DeskEventEditor() {
  return (
    <Desk url="ticketiv.com/o/rishabh/events/tribal-tales" tab="Edit · Tribal Tales">
      <Sidebar />
      <div className="desk-main">
        <div className="desk-top">
          <div className="col" style={{ gap: 2 }}>
            <div className="crumb">Events / <b>Tribal Tales</b></div>
            <h1>Tribal Tales</h1>
          </div>
          <Badge kind="acc">live · on sale</Badge>
          <span className="tiny muted kmono">draft saved 2m ago</span>
          <span className="btn">Preview</span>
          <span className="btn">Unpublish</span>
          <span className="btn primary">Save</span>
        </div>

        <div className="desk-content" style={{ paddingTop: 8 }}>
          <div className="tabstrip">
            <span className="t">Basics</span>
            <span className="t">Schedule</span>
            <span className="t on">Tickets &amp; pricing</span>
            <span className="t">Seating</span>
            <span className="t">Attendee fields</span>
            <span className="t">Lineup</span>
            <span className="t">Promo codes</span>
            <span className="t">Settings</span>
          </div>

          <div className="split-main-sb">
            <div className="col" style={{ gap: 14 }}>
              <div className="panel">
                <div className="panel-head">
                  Ticket types
                  <span className="grow"></span>
                  <span className="btn sm">+ Add type</span>
                </div>
                <div className="tbl">
                  <table>
                    <thead>
                      <tr><th></th><th>Name</th><th>Price</th><th>Quota</th><th>Sold</th><th>Channel</th><th>Status</th><th></th></tr>
                    </thead>
                    <tbody>
                      {[
                        ["Regular","₹500","120","85","Online + POS","on_sale","soft"],
                        ["Premium","₹1 200","30","12","Online","paused","warn"],
                        ["VIP","₹2 500","10","10","Online","sold_out","ink"],
                        ["Early bird","₹350","30","30","Online","ended","ink"],
                        ["Comp","₹0","20","7","Comp only","on_sale",""],
                      ].map(([n,p,q,s,c,st,k]) => (
                        <tr key={n}>
                          <td><span className="check"></span></td>
                          <td><b>{n}</b></td>
                          <td className="tcell-mono">{p}</td>
                          <td className="tcell-mono">{q}</td>
                          <td className="tcell-mono">{s}/{q}</td>
                          <td><span className="tiny muted">{c}</span></td>
                          <td><Badge kind={k}>{st}</Badge></td>
                          <td className="muted">⋯</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="panel">
                <div className="panel-head">Channel quotas <span className="tiny muted" style={{ fontWeight: 400 }}>· ticket_type_channels</span></div>
                <div className="tiny muted">Allocate by sales channel; unsold quota releases 2 hrs before doors.</div>
                <div className="row-cols">
                  <div className="card thin">
                    <div className="row between"><b className="tiny">Online</b><span className="kmono tiny">85 / 100</span></div>
                    <div style={{ height: 6, border: '1px solid var(--ink-4)', borderRadius: 3 }}><div style={{ width: '85%', height: '100%', background: 'var(--accent)' }}></div></div>
                  </div>
                  <div className="card thin">
                    <div className="row between"><b className="tiny">POS / box office</b><span className="kmono tiny">14 / 15</span></div>
                    <div style={{ height: 6, border: '1px solid var(--ink-4)', borderRadius: 3 }}><div style={{ width: '93%', height: '100%', background: 'var(--accent)' }}></div></div>
                  </div>
                  <div className="card thin">
                    <div className="row between"><b className="tiny">Comp / guest</b><span className="kmono tiny">7 / 20</span></div>
                    <div style={{ height: 6, border: '1px solid var(--ink-4)', borderRadius: 3 }}><div style={{ width: '35%', height: '100%', background: 'var(--accent)' }}></div></div>
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-head">Pricing rules</div>
                <div className="tiny muted">Discounts, fees, taxes — applied at item or order level. Stack &amp; precedence rules:</div>
                <div className="card thin row">
                  <Badge>%</Badge>
                  <div className="col grow"><b className="tiny">WELCOME10</b><div className="tiny muted">10% off · 124 redemptions · until 30 Sep</div></div>
                  <span className="toggle on"></span>
                </div>
                <div className="card thin row">
                  <Badge>−</Badge>
                  <div className="col grow"><b className="tiny">EARLY100</b><div className="tiny muted">Flat ₹100 off · early-bird only</div></div>
                  <span className="toggle on"></span>
                </div>
                <div className="card thin row">
                  <Badge>+</Badge>
                  <div className="col grow"><b className="tiny">GST 18%</b><div className="tiny muted">applies to all online sales</div></div>
                  <span className="toggle on"></span>
                </div>
              </div>
            </div>

            <div className="col" style={{ gap: 14 }}>
              <div className="panel">
                <div className="panel-head">Snapshot</div>
                <PriceLine label="Tickets sold" value="85 of 120" />
                <PriceLine label="Gross" value="₹38 050" />
                <PriceLine label="Refunds" value="−₹500" />
                <PriceLine label="Fees" value="−₹3 200" />
                <div className="hr"/>
                <PriceLine label="Payout est." value="₹34 350" strong />
              </div>

              <div className="panel">
                <div className="panel-head">Visibility</div>
                <div className="row between"><span className="tiny">Public</span><span className="radio on"></span></div>
                <div className="row between"><span className="tiny">Unlisted</span><span className="radio"></span></div>
                <div className="row between"><span className="tiny">Private (link only)</span><span className="radio"></span></div>
                <div className="hr"/>
                <div className="row between"><span className="tiny">Publish at</span><span className="kmono tiny">22 Jul · 9:00</span></div>
                <div className="row between"><span className="tiny">Unpublish at</span><span className="kmono tiny">30 Aug · 22:00</span></div>
              </div>

              <div className="panel">
                <div className="panel-head">Team on event</div>
                <div className="row gap6"><Avatar size={26} label="RM"/><div className="grow tiny"><b>Rishabh M.</b><div className="muted">organizer_owner</div></div></div>
                <div className="row gap6"><Avatar size={26} label="NS"/><div className="grow tiny"><b>Neha S.</b><div className="muted">event_admin</div></div></div>
                <div className="row gap6"><Avatar size={26} label="AK"/><div className="grow tiny"><b>Anil K.</b><div className="muted">scanner</div></div></div>
                <span className="btn sm">+ Add staff</span>
              </div>
            </div>
          </div>

          <Note bottom={20} left={16} w={170}>
            tabbed editor; each tab is its own savable form
          </Note>
        </div>
      </div>
    </Desk>
  );
}

function DeskOrdersTable() {
  return (
    <Desk url="ticketiv.com/o/rishabh/orders" tab="Orders · Ticketiv">
      <Sidebar items={ORG_NAV.map(n => ({ ...n, on: n.l === 'Orders' }))} />
      <div className="desk-main" style={{ position: 'relative' }}>
        <div className="desk-top">
          <div className="col" style={{ gap: 2 }}><div className="crumb">Rishabh's Events / Orders</div><h1>Orders</h1></div>
          <span className="btn sm">Export CSV</span>
          <span className="btn sm">⇣ Download invoices</span>
        </div>

        <div className="desk-content">
          <div className="row-cols">
            <KPI label="Orders · 7d" val="142" delta="+18" />
            <KPI label="Gross · 7d" val="₹71 200" />
            <KPI label="AOV" val="₹501" />
            <KPI label="Refunds" val="3 · ₹1 350" deltaDir="down" delta="2.1%" />
          </div>

          <div className="filterbar">
            <div className="input" style={{ minWidth: 240 }}><span>⌕</span><span className="muted">Search order, email, name…</span></div>
            <span className="chip on">All</span>
            <span className="chip">Paid</span>
            <span className="chip">Pending</span>
            <span className="chip">Refunded</span>
            <span className="chip">Failed</span>
            <span className="chip">Channel ▾</span>
            <span className="chip">Date ▾</span>
            <div className="grow"></div>
            <span className="tiny muted">328 results</span>
          </div>

          <div className="tbl">
            <table>
              <thead>
                <tr>
                  <th>Order</th><th>Buyer</th><th>Event</th><th>Items</th><th>Total</th><th>Channel</th><th>Provider</th><th>Status</th><th>Created</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["RG7352","Prateek Sharma","Tribal Tales","2× Regular","₹1 018","Online","Paystack","paid","soft","2m"],
                  ["RG7351","Asha Iyer","Tribal Tales","1× Premium","₹1 218","Online","DeltaPay","paid","soft","8m"],
                  ["RG7350","Vicky Kausal","Indie Showcase","1× Regular","₹500","Online","Paystack","pending","warn","12m"],
                  ["RG7349","Walk-in #4","Tribal Tales","2× Regular","₹1 000","POS","Cash","paid","soft","45m"],
                  ["RG7348","Riya M.","Open Mic Friday","1× Regular","₹250","Online","Paystack","paid","soft","1h"],
                  ["RG7347","Manish G.","Tribal Tales","2× Regular","₹1 000","Online","Flutterwave","refunded","ink","3h"],
                  ["RG7346","Priya Shah","Comp · gift","2× Comp","₹0","Comp","—","paid","","1d"],
                  ["RG7345","Smit Modi","Indie Showcase","1× VIP","₹2 500","Online","Paystack","failed","warn","1d"],
                ].map(([id, buy, evt, items, tot, ch, prov, st, k, ago]) => (
                  <tr key={id} style={{ background: id === 'RG7352' ? 'var(--accent-soft)' : 'transparent' }}>
                    <td><b className="tcell-mono">#{id}</b></td>
                    <td>{buy}</td>
                    <td>{evt}</td>
                    <td className="tiny">{items}</td>
                    <td className="tcell-mono">{tot}</td>
                    <td><span className="tiny muted">{ch}</span></td>
                    <td><span className="tiny muted">{prov}</span></td>
                    <td><Badge kind={k}>{st}</Badge></td>
                    <td className="tiny muted">{ago}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* detail drawer */}
        <div className="drawer">
          <div className="row between">
            <div className="hand-h2">Order #RG7352</div>
            <span className="stamp">×</span>
          </div>
          <Badge kind="soft">paid · Paystack</Badge>
          <div className="hr"/>
          <div className="col gap6">
            <div className="row between"><span className="tiny muted">Buyer</span><b>Prateek Sharma</b></div>
            <div className="row between"><span className="tiny muted">Email</span><span className="tiny kmono">prateek@mail.in</span></div>
            <div className="row between"><span className="tiny muted">Phone</span><span className="tiny kmono">+91 98xxxxxxxx</span></div>
            <div className="row between"><span className="tiny muted">Created</span><span className="tiny kmono">11:42:03</span></div>
            <div className="row between"><span className="tiny muted">IP</span><span className="tiny kmono">59.144.x.x</span></div>
          </div>
          <div className="hr"/>
          <b className="tiny">Tickets · 2</b>
          <div className="card thin"><div className="row between"><b className="tiny">Seat C4</b><Badge kind="soft">issued</Badge></div><div className="tiny muted kmono">TKT-9X2K-LM4P</div></div>
          <div className="card thin"><div className="row between"><b className="tiny">Seat C5</b><Badge kind="soft">issued</Badge></div><div className="tiny muted kmono">TKT-9X2K-LM4Q</div></div>
          <div className="hr"/>
          <b className="tiny">Charges (price_rules applied)</b>
          <PriceLine label="2 × Regular" value="₹1 000" />
          <PriceLine label="Booking fee" value="₹100" />
          <PriceLine label="GST 18%" value="₹18" />
          <PriceLine label="WELCOME10" value="−₹100" />
          <PriceLine label="Total paid" value="₹1 018" strong />
          <div className="row gap6 mt8">
            <span className="btn sm">↻ Refund</span>
            <span className="btn sm">⇄ Resend</span>
            <span className="btn sm">View ledger</span>
          </div>
        </div>

        <Note bottom={20} right={380} w={140}>
          row click opens drawer · click-thru to <span className="uline">ledger_entries</span>
        </Note>
      </div>
    </Desk>
  );
}

function DeskAnalytics() {
  return (
    <Desk url="ticketiv.com/o/rishabh/analytics/tribal-tales" tab="Analytics · Tribal Tales">
      <Sidebar items={ORG_NAV.map(n => ({ ...n, on: n.l === 'Analytics' }))} />
      <div className="desk-main">
        <div className="desk-top">
          <div className="col" style={{ gap: 2 }}>
            <div className="crumb">Events / Tribal Tales / Analytics</div>
            <h1>Tribal Tales · analytics</h1>
          </div>
          <span className="chip">Compare ▾</span>
          <span className="chip">Last 30 days ▾</span>
          <span className="btn sm">Export</span>
        </div>

        <div className="desk-content">
          <div className="row-cols">
            <KPI label="Sell-through" val="71%" delta="6pp" />
            <KPI label="Unique buyers" val="63" />
            <KPI label="Conversion · pageview→buy" val="4.2%" delta="0.8pp" />
            <KPI label="Avg ticket value" val="₹448" deltaDir="down" delta="₹12" />
            <KPI label="Refund rate" val="2.1%" />
          </div>

          <div className="split-2">
            <div className="chart">
              <div className="row between mb4"><b>Conversion funnel</b><span className="tiny muted">last 30 days</span></div>
              {[
                ["Event page views", 100, "12 480"],
                ["Picked ticket type", 38, "4 742"],
                ["Reached payment", 14, "1 758"],
                ["Paid", 4.2, "528"],
              ].map(([l, w, n]) => (
                <div key={l} className="col gap2 mt8">
                  <div className="row between tiny"><span>{l}</span><span className="kmono">{n} · {w}%</span></div>
                  <div style={{ height: 14, border: '1.2px solid var(--ink)', borderRadius: 4 }}>
                    <div style={{ width: w + '%', height: '100%', background: 'var(--accent)', borderRadius: 3 }}></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="chart">
              <div className="row between mb4"><b>Sales by hour</b><span className="tiny muted">tickets / hr · last 7d</span></div>
              <BarChart data={[8,5,3,2,1,2,4,12,18,22,15,12,9,8,15,28,42,55,38,28,20,15,12,10]} max={60} h={140} />
              <div className="row between tiny muted kmono"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>
            </div>
          </div>

          <div className="split-3">
            <div className="panel">
              <div className="panel-head">Channel mix</div>
              <div className="row gap12" style={{ alignItems: 'flex-end' }}>
                {[
                  ["Online", 78, '#6b3fbd'],
                  ["POS",    18, '#3a8a55'],
                  ["Comp",   4,  '#c4bfb6'],
                ].map(([l, v, c]) => (
                  <div key={l} className="col" style={{ flex: 1, alignItems: 'center' }}>
                    <div style={{ width: '100%', height: 80, border: '1.2px solid var(--ink)', borderRadius: 4, display: 'flex', alignItems: 'flex-end' }}>
                      <div style={{ width: '100%', height: v + '%', background: c }}></div>
                    </div>
                    <div className="tiny mt4">{l}</div>
                    <div className="kmono tiny muted">{v}%</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="panel">
              <div className="panel-head">Promo redemptions</div>
              <PriceLine label="WELCOME10" value="124 · −₹12 400" />
              <PriceLine label="EARLY100" value="38 · −₹3 800" />
              <PriceLine label="NEW100" value="12 · −₹1 200" />
              <div className="hr"/>
              <PriceLine label="Total discount" value="−₹17 400" strong />
            </div>
            <div className="panel">
              <div className="panel-head">Where buyers came from</div>
              <PriceLine label="Direct" value="42%" />
              <PriceLine label="Instagram" value="28%" />
              <PriceLine label="Friend invite" value="18%" />
              <PriceLine label="Search" value="8%" />
              <PriceLine label="Other" value="4%" />
            </div>
          </div>

          <Note bottom={20} right={20} w={150}>
            metrics joined from <span className="uline">event_metrics_daily</span> + <span className="uline">audit_log</span>
          </Note>
        </div>
      </div>
    </Desk>
  );
}

function DeskScanStation() {
  return (
    <Desk url="ticketiv.com/o/rishabh/scan/tribal-tales" tab="Scan station · Tribal Tales">
      <div className="desk-main" style={{ background: '#1a1815', color: 'var(--paper)' }}>
        <div style={{ padding: '14px 24px', borderBottom: '1.4px solid var(--ink-3)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="col" style={{ gap: 0 }}>
            <div className="tiny" style={{ color: 'var(--ink-4)' }}>SCAN STATION · gate 1</div>
            <div className="hand-h" style={{ color: 'var(--paper)', fontSize: 24 }}>Tribal Tales · live</div>
          </div>
          <div className="grow"></div>
          <span style={{ color: 'var(--accent)' }}>● ONLINE</span>
          <span className="kmono tiny" style={{ color: 'var(--ink-4)' }}>device #4 · operator: Anil K.</span>
          <span className="btn sm" style={{ background: 'transparent', color: 'var(--paper)', borderColor: 'var(--paper)' }}>⤓ End shift</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', flex: 1, overflow: 'hidden' }}>
          {/* main scan area */}
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ position: 'relative', flex: 1, border: '1.4px dashed var(--ink-4)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#26221d' }}>
              <div className="kmono" style={{ color: 'var(--ink-4)' }}>aim QR at camera · or scan handheld</div>
              {[[0,0],[1,0],[0,1],[1,1]].map(([x,y], i) => (
                <div key={i} style={{ position: 'absolute', [x?'right':'left']: 16, [y?'bottom':'top']: 16, width: 28, height: 28, borderTop: y?0:'3px solid var(--accent)', borderBottom: y?'3px solid var(--accent)':0, borderLeft: x?0:'3px solid var(--accent)', borderRight: x?'3px solid var(--accent)':0 }}></div>
              ))}
              <div style={{ position: 'absolute', left: 24, right: 24, top: '50%', height: 2, background: 'var(--accent)', boxShadow: '0 0 12px var(--accent)' }}></div>
            </div>

            {/* last result */}
            <div className="panel" style={{ background: '#1f1c18', borderColor: 'var(--ink-3)', color: 'var(--paper)' }}>
              <div className="row gap12">
                <div className="stamp acc" style={{ width: 56, height: 56, borderRadius: 999, fontSize: 28 }}>✓</div>
                <div className="col grow">
                  <div className="hand-h" style={{ color: 'var(--paper)' }}>VALID · checked in</div>
                  <div>Prateek Sharma · Seat C4 · Regular</div>
                  <div className="kmono tiny" style={{ color: 'var(--ink-4)' }}>TKT-9X2K-LM4P · scanned 3s ago</div>
                </div>
                <span className="btn primary">Next scan</span>
              </div>
            </div>

            {/* quick stats */}
            <div className="row-cols">
              <div className="kpi" style={{ background: '#1f1c18', borderColor: 'var(--ink-3)', color: 'var(--paper)' }}>
                <div className="label" style={{ color: 'var(--ink-4)' }}>Scanned</div>
                <div className="val" style={{ color: 'var(--accent)' }}>214</div>
              </div>
              <div className="kpi" style={{ background: '#1f1c18', borderColor: 'var(--ink-3)', color: 'var(--paper)' }}>
                <div className="label" style={{ color: 'var(--ink-4)' }}>Rejected</div>
                <div className="val" style={{ color: 'var(--paper)' }}>6</div>
              </div>
              <div className="kpi" style={{ background: '#1f1c18', borderColor: 'var(--ink-3)', color: 'var(--paper)' }}>
                <div className="label" style={{ color: 'var(--ink-4)' }}>Capacity</div>
                <div className="val" style={{ color: 'var(--paper)' }}>320</div>
              </div>
              <div className="kpi" style={{ background: '#1f1c18', borderColor: 'var(--ink-3)', color: 'var(--paper)' }}>
                <div className="label" style={{ color: 'var(--ink-4)' }}>Throughput</div>
                <div className="val" style={{ color: 'var(--paper)' }}>42/min</div>
              </div>
            </div>
          </div>

          {/* live feed */}
          <div style={{ borderLeft: '1.4px solid var(--ink-3)', padding: 18, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'auto' }}>
            <b style={{ color: 'var(--paper)' }}>Live feed</b>
            {[
              ["VALID","Prateek S. · C4","3s","ok"],
              ["VALID","Asha I. · C5","12s","ok"],
              ["DUPLICATE","Vicky K. · already in 8:02","42s","rej"],
              ["VALID","Riya M. · GA","1m","ok"],
              ["WRONG EVENT","TKT for Open Mic","2m","rej"],
              ["VALID","Manish G. · F12","2m","ok"],
              ["VALID","Smit M. · F13","3m","ok"],
              ["REVOKED","resold ticket","4m","rej"],
              ["VALID","Anil K. · GA","5m","ok"],
              ["VALID","Neha S. · VIP","5m","ok"],
            ].map(([s,d,t,k], i) => (
              <div key={i} className="row gap8" style={{ padding: '6px 8px', border: '1px solid var(--ink-3)', borderRadius: 6, background: k === 'rej' ? 'rgba(180,40,40,0.16)' : '#1f1c18' }}>
                <span className={`stamp ${k === 'ok' ? 'acc' : ''}`} style={{ width: 22, height: 22, color: k === 'rej' ? '#ff8a7a' : '#fff', borderColor: k === 'rej' ? '#ff8a7a' : 'var(--accent)', background: k === 'rej' ? 'transparent' : 'var(--accent)' }}>
                  {k === 'ok' ? '✓' : '✕'}
                </span>
                <div className="col grow" style={{ gap: 0 }}>
                  <b className="tiny kmono" style={{ color: k === 'rej' ? '#ff8a7a' : 'var(--accent)' }}>{s}</b>
                  <span className="tiny" style={{ color: 'var(--ink-4)' }}>{d}</span>
                </div>
                <span className="tiny" style={{ color: 'var(--ink-4)' }}>{t}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: 20, left: 24 }}>
          <Note style={{ position: 'static', color: '#cdbff0' }} w={200}>
            full-screen kiosk · all states from <span className="uline" style={{ color: '#fff' }}>scans</span> table
          </Note>
        </div>
      </div>
    </Desk>
  );
}

function DeskPayouts() {
  return (
    <Desk url="ticketiv.com/o/rishabh/payouts" tab="Payouts · Ticketiv">
      <Sidebar items={ORG_NAV.map(n => ({ ...n, on: n.l === 'Payouts' }))} />
      <div className="desk-main">
        <div className="desk-top">
          <div className="col" style={{ gap: 2 }}><div className="crumb">Rishabh's Events / Payouts</div><h1>Payouts &amp; ledger</h1></div>
          <span className="btn sm">Statements</span>
          <span className="btn primary">Request payout</span>
        </div>

        <div className="desk-content">
          <div className="row-cols">
            <KPI label="Available balance" val="₹62 400" />
            <KPI label="On hold" val="₹8 100" />
            <KPI label="Lifetime gross" val="₹4.82L" />
            <KPI label="Payout account" val="HDFC ••12" />
          </div>

          <div className="split-2">
            <div className="panel">
              <div className="panel-head">Payouts <span className="grow"></span><span className="tiny muted">last 12 months</span></div>
              <div className="tbl">
                <table>
                  <thead><tr><th>Date</th><th>Amount</th><th>Account</th><th>Status</th><th>Ref</th></tr></thead>
                  <tbody>
                    {[
                      ["18 Jul","₹38 000","HDFC ••12","paid","soft","PO-2401"],
                      ["04 Jul","₹52 100","HDFC ••12","paid","soft","PO-2378"],
                      ["20 Jun","₹41 800","HDFC ••12","paid","soft","PO-2330"],
                      ["06 Jun","₹19 500","HDFC ••12","processing","warn","PO-2308"],
                      ["23 May","₹8 200","HDFC ••12","failed","ink","PO-2245"],
                    ].map(([d,a,ac,s,k,r]) => (
                      <tr key={r}>
                        <td className="tcell-mono tiny">{d}</td>
                        <td className="tcell-mono"><b>{a}</b></td>
                        <td className="tiny muted">{ac}</td>
                        <td><Badge kind={k}>{s}</Badge></td>
                        <td className="tcell-mono tiny muted">{r}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="panel">
              <div className="panel-head">Ledger · double-entry</div>
              <div className="tiny muted">every order, fee, refund &amp; payout · last 8 entries</div>
              <div className="tbl">
                <table>
                  <thead><tr><th>Type</th><th>Event</th><th>Δ</th><th>Bal</th></tr></thead>
                  <tbody>
                    {[
                      ["order_gross","Tribal Tales · #RG7352","+₹1 018","₹72 568"],
                      ["fee_platform","#RG7352","−₹80","₹72 488"],
                      ["fee_processor","#RG7352","−₹20","₹72 468"],
                      ["tax_gst","#RG7352","−₹18","₹72 450"],
                      ["refund","Tribal Tales · #RG7347","−₹500","₹71 950"],
                      ["payout_paid","PO-2401","−₹38 000","₹33 950"],
                      ["order_gross","Open Mic · #RG7348","+₹250","₹34 200"],
                      ["adjustment","manual · ledger fix","+₹100","₹34 300"],
                    ].map((row, i) => (
                      <tr key={i}>
                        <td className="tcell-mono tiny">{row[0]}</td>
                        <td className="tiny">{row[1]}</td>
                        <td className="tcell-mono tiny" style={{ color: row[2].startsWith('+') ? '#1f7a4f' : 'var(--ink-2)' }}>{row[2]}</td>
                        <td className="tcell-mono tiny">{row[3]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <Note bottom={20} right={20} w={150}>
            <span className="uline">payouts</span> + <span className="uline">ledger_entries</span> — reconciliation source of truth
          </Note>
        </div>
      </div>
    </Desk>
  );
}

function DeskSettings() {
  return (
    <Desk url="ticketiv.com/o/rishabh/settings/team" tab="Team · Settings">
      <Sidebar items={ORG_NAV.map(n => ({ ...n, on: n.l === 'Settings' }))} />
      <div className="desk-main">
        <div className="desk-top">
          <div className="col" style={{ gap: 2 }}><div className="crumb">Settings / Team &amp; roles</div><h1>Team &amp; roles</h1></div>
          <span className="btn primary">+ Invite member</span>
        </div>
        <div className="desk-content">
          <div className="tabstrip">
            <span className="t">Org profile</span>
            <span className="t on">Team &amp; roles</span>
            <span className="t">Pricing plan</span>
            <span className="t">Payout accounts</span>
            <span className="t">Devices</span>
            <span className="t">Feature flags</span>
            <span className="t">Webhooks</span>
            <span className="t">Audit log</span>
          </div>

          <div className="panel">
            <div className="panel-head">Members · 8 <span className="grow"></span><div className="input" style={{ padding: '5px 12px' }}><span>⌕</span><span className="muted">filter</span></div></div>
            <div className="tbl">
              <table>
                <thead><tr><th>Member</th><th>Role</th><th>Events scoped</th><th>Joined</th><th>Last active</th><th></th></tr></thead>
                <tbody>
                  {[
                    ["Rishabh M.","RM","organizer_owner","all","12 Jan","just now",""],
                    ["Neha S.","NS","organizer_admin","all","18 Feb","8m",""],
                    ["Anil K.","AK","scanner","Tribal Tales","02 May","2h",""],
                    ["Priya P.","PP","event_admin","Open Mic Friday","12 Mar","yesterday",""],
                    ["Box Office · iPad","BO","pos","all","04 Jul","3m","device"],
                    ["Asha I.","AI","support","all","21 Apr","3d",""],
                    ["Manish G.","MG","organizer_scanner","River Sound Fest","02 Jul","never","warn"],
                    ["Smit M.","SM","read_only","all","18 Jul","just now",""],
                  ].map(([n, ini, role, scope, joined, last, k]) => (
                    <tr key={n}>
                      <td><div className="row gap8"><Avatar size={24} label={ini}/><b className="tiny">{n}</b></div></td>
                      <td><Badge kind={role.includes('owner') ? 'acc' : role === 'scanner' || role.includes('pos') ? 'soft' : ''}>{role}</Badge></td>
                      <td className="tiny muted">{scope}</td>
                      <td className="tiny muted kmono">{joined}</td>
                      <td className="tiny muted">{last}</td>
                      <td className="muted">⋯</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">Role permissions <span className="tiny muted" style={{ fontWeight: 400 }}>· app_role enum · 13 platform actors</span></div>
            <div className="tbl">
              <table>
                <thead><tr><th>Capability</th><th>owner</th><th>admin</th><th>event_admin</th><th>scanner</th><th>pos</th><th>support</th></tr></thead>
                <tbody>
                  {[
                    ["Create / publish events","✓","✓","scope","","","",],
                    ["Manage ticket types","✓","✓","scope","","",""],
                    ["Issue refunds","✓","✓","scope","","","✓"],
                    ["Request payouts","✓","","","","",""],
                    ["Manage team","✓","","","","",""],
                    ["Scan tickets","✓","✓","scope","✓","","",],
                    ["Sell tickets at door","✓","✓","scope","","✓","",],
                    ["View analytics","✓","✓","scope","","","read"],
                  ].map(([cap, ...vals]) => (
                    <tr key={cap}>
                      <td><b className="tiny">{cap}</b></td>
                      {vals.map((v, i) => <td key={i} className="tiny kmono" style={{ color: v === '✓' ? 'var(--accent)' : 'var(--ink-3)' }}>{v}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Note bottom={20} right={20} w={170}>
            <span className="uline">org_members.role</span> + <span className="uline">app_role</span> enum — 13 roles
          </Note>
        </div>
      </div>
    </Desk>
  );
}

function DeskSuperAdmin() {
  return (
    <Desk url="admin.ticketiv.com" tab="Super-admin · Ticketiv">
      <Sidebar items={ADMIN_NAV} org="Ticketiv · platform" role="super_admin" />
      <div className="desk-main">
        <div className="desk-top">
          <div className="col" style={{ gap: 2 }}>
            <div className="crumb">Platform overview · last 7d</div>
            <h1>Super-admin</h1>
          </div>
          <Badge kind="acc">super_admin · Smit M.</Badge>
        </div>
        <div className="desk-content">
          <div className="row-cols">
            <KPI label="Active orgs" val="184" delta="+6" />
            <KPI label="Tickets sold · 7d" val="42 318" delta="+12%" />
            <KPI label="Gross volume · 7d" val="₹2.18 Cr" delta="+9%" />
            <KPI label="Take rate · net" val="6.4%" />
            <KPI label="Open jobs" val="142" deltaDir="down" delta="−8" />
          </div>

          <div className="split-2">
            <div className="panel">
              <div className="panel-head">Provider health <span className="tiny muted" style={{ fontWeight: 400 }}>· last 24h</span></div>
              <div className="tbl">
                <table>
                  <thead><tr><th>Provider</th><th>Success</th><th>Webhooks</th><th>P95 latency</th><th>Status</th></tr></thead>
                  <tbody>
                    {[
                      ["Paystack","98.7%","12 482 / 12 488","612 ms","ok","soft"],
                      ["DeltaPay","94.2%","2 108 / 2 220","1.4 s","degraded","warn"],
                      ["Flutterwave","99.1%","618 / 622","420 ms","ok","soft"],
                      ["Manual / bank","—","—","—","ok","soft"],
                    ].map(([p, s, w, l, st, k]) => (
                      <tr key={p}>
                        <td><b className="tiny">{p}</b></td>
                        <td className="tcell-mono tiny">{s}</td>
                        <td className="tcell-mono tiny">{w}</td>
                        <td className="tcell-mono tiny">{l}</td>
                        <td><Badge kind={k}>{st}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="panel">
              <div className="panel-head">Background jobs <span className="grow"></span><span className="tiny muted">queue depth</span></div>
              <div className="col gap6">
                {[
                  ["send_email_receipt", 22, "ok"],
                  ["scan_audit_replay", 8, "ok"],
                  ["payout_disbursement", 4, "ok"],
                  ["refund_provider_call", 88, "backlog"],
                  ["webhook_retry · deltapay", 20, "retry"],
                ].map(([name, n, st]) => (
                  <div key={name} className="row gap8">
                    <span className="kmono tiny grow">{name}</span>
                    <div style={{ width: 120, height: 10, border: '1.2px solid var(--ink)', borderRadius: 4 }}>
                      <div style={{ width: Math.min(n, 100) + '%', height: '100%', background: st === 'ok' ? 'var(--accent)' : st === 'backlog' ? '#c9531b' : 'var(--ink)', borderRadius: 3 }}></div>
                    </div>
                    <span className="tcell-mono tiny" style={{ width: 30, textAlign: 'right' }}>{n}</span>
                    <Badge kind={st === 'ok' ? 'soft' : 'warn'}>{st}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">Organizations <span className="grow"></span><div className="input" style={{ padding: '5px 12px' }}><span>⌕</span><span className="muted">search 184 orgs…</span></div></div>
            <div className="tbl">
              <table>
                <thead><tr><th>Org</th><th>Plan</th><th>Events live</th><th>7d gross</th><th>Flags</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {[
                    ["Rishabh's Events","Standard","3","₹91k","seated, resale","ok","soft"],
                    ["The Loft","Pro","8","₹2.4L","resale, pos","ok","soft"],
                    ["Comedy Co.","Standard","12","₹1.1L","—","ok","soft"],
                    ["River Sound","Pro","1","₹14.6L","seated, resale, payout_hold","review","warn"],
                    ["Local Fest","Starter","2","₹38k","beta_kiosk","ok","soft"],
                    ["Studio X","Standard","6","₹52k","—","limit","warn"],
                  ].map(([n,p,e,g,f,st,k]) => (
                    <tr key={n}>
                      <td><b className="tiny">{n}</b></td>
                      <td><Badge>{p}</Badge></td>
                      <td className="tcell-mono">{e}</td>
                      <td className="tcell-mono">{g}</td>
                      <td className="tiny muted">{f}</td>
                      <td><Badge kind={k}>{st}</Badge></td>
                      <td className="muted">⋯</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Note bottom={20} right={20} w={170}>
            5-tier admin · gated by <span className="uline">admin_action_catalog.required_role</span>
          </Note>
        </div>
      </div>
    </Desk>
  );
}

Object.assign(window, {
  DeskOrgDashboard, DeskEventsList, DeskEventEditor, DeskOrdersTable,
  DeskAnalytics, DeskScanStation, DeskPayouts, DeskSettings, DeskSuperAdmin
});
