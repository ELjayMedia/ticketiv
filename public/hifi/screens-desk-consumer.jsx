// Desktop consumer screens: Discover, Event detail, Checkout, My account.

function DeskDiscover() {
  const events = [
    { t: "Tribal Tales", d: "Wed 30 Aug", v: "Cafe Natarani", p: "₹500", tag: "5 left" },
    { t: "Sunset Set", d: "Sat 23 Jul", v: "Riverside", p: "₹600" },
    { t: "Open Mic Friday", d: "Fri 25 Jul", v: "Studio X", p: "₹250" },
    { t: "Indie Showcase", d: "Sat 23 Jul", v: "The Loft", p: "₹800" },
    { t: "Comedy Night", d: "Thu 24 Jul", v: "Lol HQ", p: "₹350" },
    { t: "Art After Dark", d: "Fri 25 Jul", v: "Gallery One", p: "Free", tag: "free" },
    { t: "River Sound Fest", d: "Fri 25 → Sun 27", v: "Riverside", p: "from ₹2.4k", tag: "festival" },
    { t: "Tech Talks", d: "Tue 29 Jul", v: "BlueSpace", p: "₹150" },
  ];
  return (
    <Desk url="ticketiv.app/ahmedabad" tab="Discover · Ahmedabad" variant="desk-consumer">
      <div className="desk-main">
        {/* top bar */}
        <div style={{ borderBottom: '1.4px solid var(--ink)', padding: '10px 22px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="brand" style={{ fontFamily: 'var(--font-script)', fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, padding: 0, border: 0 }}>
            <span className="stamp acc" style={{ width: 22, height: 22 }}>T</span> ticketiv
          </div>
          <div className="chip">◉ Ahmedabad ▾</div>
          <div className="input" style={{ flex: 1, maxWidth: 460, padding: '5px 14px' }}>
            <span>⌕</span><span className="muted">Search events, artists, venues…</span>
          </div>
          <div className="row gap8">
            <span className="stamp">♡</span>
            <span className="stamp">🔔</span>
            <Avatar size={28} label="SM" />
          </div>
        </div>

        <div className="desk-content" style={{ padding: '14px 22px' }}>
          {/* category bar */}
          <div className="chips" style={{ flexWrap: 'nowrap', overflowX: 'auto' }}>
            <span className="chip on">All</span>
            <span className="chip">Music</span>
            <span className="chip">Comedy</span>
            <span className="chip">Theatre</span>
            <span className="chip">Sports</span>
            <span className="chip">Food</span>
            <span className="chip">Workshop</span>
            <span className="chip">Art</span>
            <span className="chip">Festivals</span>
            <span className="chip">Free</span>
            <span className="chip">This weekend</span>
          </div>

          {/* hero */}
          <div className="dcard" style={{ padding: 0, position: 'relative' }}>
            <div className="ph" style={{ height: 240, borderRadius: '10px 10px 0 0', borderTop: 0, borderLeft: 0, borderRight: 0 }}>hero · River Sound Fest</div>
            <div style={{ position: 'absolute', left: 24, bottom: 18, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
              <Badge kind="acc">3-DAY FESTIVAL</Badge>
              <div className="hand-h" style={{ fontSize: 32, color: '#fff' }}>River Sound Fest</div>
              <div className="tiny">Fri 25 → Sun 27 Jul · 22 artists · Riverside Park</div>
              <div className="row gap6 mt8">
                <span className="btn primary">Get passes</span>
                <span className="btn ghost" style={{ background: 'rgba(255,255,255,0.85)' }}>See lineup</span>
              </div>
            </div>
          </div>

          <div className="row between">
            <div className="hand-h">Happening soon in Ahmedabad</div>
            <div className="row gap8 tiny muted">
              <span>Sort: Soonest ▾</span>
              <span>·</span>
              <span>14 results</span>
            </div>
          </div>

          {/* event grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {events.map((e, i) => (
              <div key={i} className="eventcard">
                <div className="ph">
                  {e.tag && <span className="badge soft" style={{ position: 'absolute', top: 8, left: 8 }}>{e.tag}</span>}
                  <span style={{ position: 'absolute', top: 8, right: 8 }} className="stamp">♡</span>
                  event photo
                </div>
                <div className="info">
                  <b>{e.t}</b>
                  <div className="tiny muted">⏱ {e.d}</div>
                  <div className="tiny muted">◉ {e.v}</div>
                  <div className="row between mt4">
                    <span className="kmono">{e.p}</span>
                    <span className="btn sm">View</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Note bottom={20} right={20} w={170}>
            cards driven by <span className="uline">events</span> w/ city + visibility filters · 3-up at lg, 4-up at xl
          </Note>
        </div>
      </div>
    </Desk>
  );
}

function DeskEventDetail() {
  return (
    <Desk url="ticketiv.app/e/tribal-tales-aug-30" tab="Tribal Tales · Ticketiv" variant="desk-consumer">
      <div className="desk-main">
        <div style={{ padding: '8px 22px', borderBottom: '1.4px solid var(--ink)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="muted tiny">‹ Discover / Music /</span>
          <b className="tiny">Tribal Tales</b>
          <div className="grow"></div>
          <span className="btn sm">↗ Share</span>
          <span className="btn sm">♡ Save</span>
        </div>

        <div className="desk-content" style={{ padding: '18px 22px' }}>
          <div className="split-main-sb">
            {/* main */}
            <div className="col" style={{ gap: 14 }}>
              <div className="ph" style={{ height: 320, borderRadius: 10 }}>event hero photo</div>

              <div>
                <div className="hand-h" style={{ fontSize: 32 }}>Tribal Tales · sunset set by DJ Fun</div>
                <div className="row gap8 mt4">
                  <Badge kind="soft">Music</Badge>
                  <Badge>18+</Badge>
                  <span className="tiny muted">Hosted by <b className="acc">Rishabh Mehta</b></span>
                </div>
              </div>

              <div className="row gap12 tiny">
                <div className="row gap6"><span className="stamp">📅</span><div><b>Wed 30 Aug 2025</b><div className="muted">3:50 PM → 5:50 PM</div></div></div>
                <div className="row gap6"><span className="stamp">◉</span><div><b>Cafe Natarani</b><div className="muted">Ahmedabad · 12km</div></div></div>
                <div className="row gap6"><span className="stamp">⏱</span><div><b>3 hours</b><div className="muted">English, Hindi</div></div></div>
              </div>

              <div className="tabstrip">
                <span className="t on">About</span>
                <span className="t">Lineup</span>
                <span className="t">Venue</span>
                <span className="t">Reviews <span className="muted">12</span></span>
              </div>

              <div className="panel">
                <div className="panel-head">About</div>
                <div style={{ lineHeight: 1.5 }}>
                  Sunset music night with rotating DJ set. Food trucks on-site. Outdoor lawn — bring a hoodie!
                  Last entry 7 PM. Re-entry not permitted.
                </div>
                <div className="row gap12 mt8">
                  <Badge>★ 4.8 · 124 reviews</Badge>
                  <Badge>↻ refund 48h before</Badge>
                </div>
              </div>

              <div className="panel">
                <div className="panel-head">Lineup <span className="muted" style={{ fontSize: 12 }}>· 2 artists</span></div>
                <div className="row gap12">
                  <div className="row gap8"><Avatar size={40} label="DJ"/><div><b>DJ Fun</b><div className="tiny muted">Headliner</div></div></div>
                  <div className="row gap8"><Avatar size={40} label="RM"/><div><b>Riya M.</b><div className="tiny muted">Opener</div></div></div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-head">Venue</div>
                <div className="row gap12">
                  <div className="ph" style={{ width: 260, height: 140 }}>map preview</div>
                  <div className="col" style={{ flex: 1 }}>
                    <b>Cafe Natarani</b>
                    <div className="tiny muted">Lawn no. 4, Shahibaug · Ahmedabad 380004</div>
                    <div className="tiny">Wheelchair accessible · Bar on premises · Outdoor</div>
                    <div className="row gap6 mt8">
                      <span className="btn sm">Open in maps</span>
                      <span className="btn sm">Directions</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* sidebar: sticky checkout */}
            <div className="col" style={{ gap: 14 }}>
              <div className="panel" style={{ position: 'sticky', top: 14 }}>
                <div className="row between">
                  <div className="col" style={{ gap: 0 }}>
                    <div className="tiny muted">From</div>
                    <div className="hand-h">₹500</div>
                  </div>
                  <Badge kind="soft">5 left at this price</Badge>
                </div>

                <div className="hr"/>

                {[
                  ["Regular","₹500","5 left","on"],
                  ["Premium","₹1 200","18 of 30","off"],
                  ["VIP","₹2 500","sold out","gone"],
                  ["Early bird","₹350","ended","gone"],
                ].map(([n, p, s, st], i) => (
                  <div key={n} className="card thin row" style={{ borderRadius: 8, borderColor: st === 'on' ? 'var(--accent)' : 'var(--ink-4)', background: st === 'on' ? 'var(--accent-soft)' : 'var(--paper)' }}>
                    <span className={`radio ${st === 'on' ? 'on' : ''}`}></span>
                    <div className="col grow"><b className="tiny">{n}</b><div className="tiny muted">{s}</div></div>
                    <div className="kmono tiny" style={{ textDecoration: st === 'gone' ? 'line-through' : 'none', color: st === 'gone' ? 'var(--ink-3)' : 'inherit' }}>{p}</div>
                  </div>
                ))}

                <div className="row between">
                  <span className="tiny muted">Quantity</span>
                  <div className="row gap8"><span className="stamp">−</span><b>2</b><span className="stamp">+</span></div>
                </div>

                <div className="hr"/>

                <PriceLine label="2 × Regular" value="₹1 000" />
                <PriceLine label="Booking fee" value="₹100" />
                <PriceLine label="Total" value="₹1 100" strong />

                <div className="btn primary block">Book now</div>
                <div className="tiny muted txt-c">Free transfer · partial refund · QR + Apple Wallet</div>
              </div>

              <div className="panel">
                <div className="panel-head">Going (8)</div>
                <div className="row gap2">
                  <div className="stack">
                    {["FK","SK","AK","RK"].map(l => <Avatar key={l} size={28} label={l} />)}
                  </div>
                  <div className="tiny muted" style={{ marginLeft: 6 }}>+ 4 friends</div>
                </div>
                <span className="btn sm">Invite friends</span>
              </div>
            </div>
          </div>

          <Note bottom={14} left={16} w={180}>
            sticky sidebar collapses to bottom bar &lt; 900px
          </Note>
        </div>
      </div>
    </Desk>
  );
}

function DeskCheckout() {
  return (
    <Desk url="ticketiv.app/checkout/RG7352" tab="Checkout · Ticketiv" variant="desk-consumer">
      <div className="desk-main">
        <div style={{ padding: '10px 22px', borderBottom: '1.4px solid var(--ink)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span className="muted tiny">‹ back to event</span>
          <div className="grow row center gap6">
            {["Seats","Details","Payment","Done"].map((s, i) => (
              <React.Fragment key={s}>
                <span className={`stamp ${i <= 1 ? 'acc' : ''}`} style={{ width: 22, height: 22, borderRadius: 999, fontSize: 11 }}>{i+1}</span>
                <span className={`tiny ${i === 1 ? '' : 'muted'}`} style={{ fontWeight: i===1 ? 700 : 400 }}>{s}</span>
                {i < 3 && <span className="muted">—</span>}
              </React.Fragment>
            ))}
          </div>
          <span className="kmono tiny acc">holds for 8:42</span>
        </div>

        <div className="desk-content" style={{ padding: '18px 22px' }}>
          <div className="split-main-sb">
            <div className="col" style={{ gap: 14 }}>
              <div className="panel">
                <div className="panel-head">Buyer</div>
                <div className="row gap8">
                  <div className="col" style={{ flex: 1 }}><div className="tiny muted">Full name</div><div className="field">Prateek Sharma</div></div>
                  <div className="col" style={{ flex: 1 }}><div className="tiny muted">Email</div><div className="field">prateek@mail.in</div></div>
                  <div className="col" style={{ width: 200 }}><div className="tiny muted">Phone (+91)</div><div className="field">98xxxxxxxx</div></div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-head">Attendees <span className="tiny muted">· custom fields set by organizer</span></div>

                <div className="card thin" style={{ borderColor: 'var(--accent)', background: 'var(--accent-soft)' }}>
                  <div className="row between">
                    <b className="tiny">Ticket 1 · Seat C4 · Regular</b>
                    <span className="tiny acc">Same as buyer ✓</span>
                  </div>
                </div>

                <div className="card thin">
                  <div className="row between">
                    <b className="tiny">Ticket 2 · Seat C5 · Regular</b>
                    <span className="tiny muted">Fill below</span>
                  </div>
                  <div className="row gap8">
                    <div className="col" style={{ flex: 1 }}><div className="tiny muted">Name</div><div className="field">…</div></div>
                    <div className="col" style={{ flex: 1 }}><div className="tiny muted">Phone</div><div className="field">…</div></div>
                  </div>
                  <div className="row gap8">
                    <div className="col" style={{ flex: 1 }}><div className="tiny muted">T-shirt size · jsonb</div><div className="field">M ▾</div></div>
                    <div className="col" style={{ flex: 1 }}><div className="tiny muted">Dietary (optional)</div><div className="field">…</div></div>
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-head">Promo code</div>
                <div className="row gap8">
                  <div className="field grow kmono" style={{ borderRadius: 999 }}>WELCOME10</div>
                  <span className="btn">Apply</span>
                </div>
                <div className="card soft thin row">
                  <span className="stamp acc">✓</span>
                  <div className="grow"><b className="tiny">WELCOME10 applied</b><div className="tiny muted">10% off — saved ₹100</div></div>
                  <span className="tiny acc">Remove</span>
                </div>
              </div>
            </div>

            <div className="col" style={{ gap: 14 }}>
              <div className="panel">
                <div className="panel-head">Order summary</div>
                <div className="row gap8">
                  <div className="ph" style={{ width: 60, height: 60 }}>img</div>
                  <div className="col"><b>Tribal Tales</b><div className="tiny muted">Wed 30 Aug · 3:50 PM</div><div className="tiny muted">Seats C4, C5</div></div>
                </div>
                <div className="hr"/>
                <PriceLine label="2 × Regular" value="₹1 000" />
                <PriceLine label="Booking fee" value="₹100" />
                <PriceLine label="GST (18%)" value="₹18" />
                <PriceLine label="WELCOME10" value="−₹100" />
                <div className="hr"/>
                <PriceLine label="Total" value="₹1 018" strong />
              </div>

              <div className="panel">
                <div className="panel-head">Payment method</div>
                <div className="card thin row"><span className="radio on"></span><div className="grow"><b className="tiny">Visa •••• 4242</b><div className="tiny muted">Exp 12/27</div></div></div>
                <div className="card thin row"><span className="radio"></span><div className="grow">UPI · Paystack</div></div>
                <div className="card thin row"><span className="radio"></span><div className="grow">Card · DeltaPay</div></div>
                <div className="card thin row"><span className="radio"></span><div className="grow">Wallet · Flutterwave</div></div>

                <div className="row gap6 tiny muted">
                  <span className="check on">✓</span> Accept refund &amp; cancellation policy
                </div>

                <div className="btn primary block">Pay ₹1 018</div>
              </div>
            </div>
          </div>
          <Note bottom={20} left={16} w={200}>
            single-page checkout — server-side <span className="uline">payment_attempts</span> per submit
          </Note>
        </div>
      </div>
    </Desk>
  );
}

function DeskMyAccount() {
  return (
    <Desk url="ticketiv.app/account/tickets" tab="My account · Ticketiv" variant="desk-consumer">
      <div className="desk-main">
        <div style={{ padding: '10px 22px', borderBottom: '1.4px solid var(--ink)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="brand" style={{ fontFamily: 'var(--font-script)', fontSize: 22, fontWeight: 700, padding: 0, border: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="stamp acc" style={{ width: 22, height: 22 }}>T</span> ticketiv
          </div>
          <div className="grow"></div>
          <span className="stamp">♡</span>
          <span className="stamp">🔔</span>
          <Avatar size={28} label="SM" />
        </div>

        <div className="split-sb-main" style={{ flex: 1, gap: 0, padding: 0 }}>
          <div className="side" style={{ borderRight: '1.4px solid var(--ink)', width: '100%' }}>
            <div className="group">Account</div>
            <div className="nav"><span className="stamp">🎟</span> Tickets</div>
            <div className="nav on"><span className="stamp">📅</span> Upcoming</div>
            <div className="nav"><span className="stamp">⏳</span> Past</div>
            <div className="nav"><span className="stamp">⇄</span> Transfers</div>
            <div className="nav"><span className="stamp">↻</span> Refunds</div>
            <div className="sep"></div>
            <div className="group">You</div>
            <div className="nav"><span className="stamp">👤</span> Profile</div>
            <div className="nav"><span className="stamp">👥</span> Friends · 10</div>
            <div className="nav"><span className="stamp">💳</span> Payment methods</div>
            <div className="nav"><span className="stamp">🔔</span> Notifications</div>
            <div className="nav"><span className="stamp">🌐</span> Language</div>
          </div>

          <div className="desk-content" style={{ padding: '18px 22px', overflow: 'auto' }}>
            <div className="row between">
              <div className="hand-h" style={{ fontSize: 26 }}>Upcoming tickets</div>
              <div className="row gap6">
                <span className="btn sm">Add to wallet</span>
                <span className="btn sm">Export ics</span>
              </div>
            </div>

            <div className="row-cols">
              <KPI label="Upcoming" val="4" />
              <KPI label="Friends going" val="6" />
              <KPI label="Saved" val="12" />
              <KPI label="Spent · YTD" val="₹4 350" />
            </div>

            <div className="dcard">
              <div className="head">
                <b>Wed 30 Aug · 3:50 PM</b>
                <Badge kind="acc">in 4 days</Badge>
                <div className="grow"></div>
                <span className="tiny muted">Order #RG7352</span>
              </div>
              <div className="row" style={{ padding: 14, gap: 14 }}>
                <div className="ph" style={{ width: 160, height: 110 }}>event photo</div>
                <div className="col" style={{ flex: 1, gap: 4 }}>
                  <b style={{ fontSize: 16 }}>Tribal Tales</b>
                  <div className="tiny muted">◉ Cafe Natarani · Ahmedabad</div>
                  <div className="tiny muted">Seats C4, C5 · Regular · 2 tickets</div>
                  <div className="row gap6 mt8">
                    <Badge kind="soft">issued</Badge>
                    <Badge>QR ready</Badge>
                  </div>
                </div>
                <div className="col" style={{ gap: 6 }}>
                  <span className="btn primary sm">Show QR</span>
                  <span className="btn sm">Transfer</span>
                  <span className="btn sm">Resell</span>
                  <span className="btn sm">Refund</span>
                </div>
              </div>
            </div>

            <div className="dcard">
              <div className="head">
                <b>Fri 25 Jul · 8 PM</b>
                <div className="grow"></div>
                <span className="tiny muted">Order #RG7301</span>
              </div>
              <div className="row" style={{ padding: 14, gap: 14 }}>
                <div className="ph" style={{ width: 160, height: 110 }}>photo</div>
                <div className="col" style={{ flex: 1 }}>
                  <b>Open Mic Friday</b>
                  <div className="tiny muted">◉ Studio X · 1 ticket</div>
                  <Badge kind="soft">issued</Badge>
                </div>
                <div className="col" style={{ gap: 6 }}>
                  <span className="btn primary sm">Show QR</span>
                  <span className="btn sm">Transfer</span>
                </div>
              </div>
            </div>

            <div className="dcard">
              <div className="head">
                <Badge kind="warn">action needed</Badge>
                <b>Salman sent you a ticket</b>
                <div className="grow"></div>
                <span className="tiny muted">expires in 22h</span>
              </div>
              <div className="row" style={{ padding: 14, gap: 14 }}>
                <div className="ph" style={{ width: 100, height: 70 }}>photo</div>
                <div className="col grow">
                  <b>Indie Showcase · Sat 26</b>
                  <div className="tiny muted">1 ticket · seat F12 · ₹0 (gift)</div>
                </div>
                <div className="row gap6">
                  <span className="btn sm">Decline</span>
                  <span className="btn primary sm">Accept transfer</span>
                </div>
              </div>
            </div>

            <Note bottom={20} right={20} w={170}>
              merges past tickets, transfers received, and refund-in-flight states into one timeline
            </Note>
          </div>
        </div>
      </div>
    </Desk>
  );
}

Object.assign(window, { DeskDiscover, DeskEventDetail, DeskCheckout, DeskMyAccount });
