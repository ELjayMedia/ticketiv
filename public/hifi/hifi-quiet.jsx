// Direction B · QUIET — Linear/Vercel clean monochrome
// Mobile home, event detail, ticket.

const HFQ_INK     = '#0a0a0c';
const HFQ_INK_3   = '#6e6c70';
const HFQ_ACC     = '#6b3fbd';
const HFQ_ACC_2   = '#efe7fb';
const HFQ_LINE    = '#ececea';
const HFQ_LINE_2  = '#d8d6d3';

// ── Mobile Home / Discover ──
function QuietHome() {
  const P = HF_PHOTOS;
  return (
    <HFPhone className="hf-quiet">
      <div className="hf-scroll">
        {/* status spacer */}
        <div style={{ height: 56 }}></div>

        {/* Top bar */}
        <div style={{ padding: '8px 20px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: HFQ_ACC, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 12 }}>T</div>
            <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em' }}>ticketiv</span>
          </div>
          <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3, marginLeft: 6, padding: '2px 6px', background: '#f3f1ee', borderRadius: 4 }}>BETA</span>
          <div className="hf-grow"></div>
          <button className="hf-btn ghost" style={{ padding: 8 }}><HFIcon name="search" size={20}/></button>
          <button className="hf-btn ghost" style={{ padding: 8, position: 'relative' }}>
            <HFIcon name="bell" size={20}/>
            <span style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, background: HFQ_ACC, borderRadius: 999 }}></span>
          </button>
        </div>

        {/* Location header */}
        <div style={{ padding: '0 20px 14px' }}>
          <div className="lbl">Showing events near</div>
          <div className="hf-row" style={{ gap: 4, marginTop: 2 }}>
            <div className="h1" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              Ahmedabad <HFIcon name="chevD" size={18}/>
            </div>
            <span className="hf-grow"></span>
            <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>318 events</span>
          </div>
        </div>

        {/* Filter row */}
        <div className="hf-scrollx" style={{ padding: '0 20px 18px', gap: 6 }}>
          <span className="hf-chip on">This weekend</span>
          <span className="hf-chip">Music</span>
          <span className="hf-chip">Comedy</span>
          <span className="hf-chip">Free</span>
          <span className="hf-chip">Tonight</span>
          <span className="hf-chip">
            <HFIcon name="filter" size={12}/> Filters
          </span>
        </div>

        {/* Editor's pick hero */}
        <div style={{ padding: '0 20px 24px' }}>
          <div className="hf-row" style={{ marginBottom: 8, gap: 6 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: HFQ_ACC, fontWeight: 600 }}>
              <HFIcon name="spark" size={12}/> Editor's pick
            </span>
            <span style={{ flex: 1 }}></span>
            <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>UPDATED 2 H AGO</span>
          </div>

          <div className="hf-card" style={{ overflow: 'hidden', borderRadius: 12 }}>
            <HFPhoto src={P.crowd_smoke} h={220} dim>
              <div className="hf-row" style={{ marginTop: 'auto', gap: 8 }}>
                <span className="hf-chip" style={{ background: 'rgba(255,255,255,0.95)', borderColor: 'transparent', color: HFQ_INK, fontSize: 11 }}>3-day festival</span>
                <span className="hf-chip" style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)', color: '#fff', fontSize: 11 }}>22 artists</span>
              </div>
            </HFPhoto>
            <div style={{ padding: 16 }}>
              <div className="h2">River Sound Fest</div>
              <div className="hf-row" style={{ gap: 8, marginTop: 6, color: HFQ_INK_3, fontSize: 13 }}>
                <span className="hf-row" style={{ gap: 4 }}><HFIcon name="cal" size={14}/> Fri 25 → Sun 27</span>
                <span>·</span>
                <span className="hf-row" style={{ gap: 4 }}><HFIcon name="pin" size={14}/> Riverside Park</span>
              </div>
              <div className="hf-divider" style={{ margin: '14px 0' }}></div>
              <div className="hf-row">
                <div className="hf-col" style={{ flex: 1 }}>
                  <div className="lbl">3-day pass from</div>
                  <div className="hf-mono" style={{ fontSize: 18, fontWeight: 600, marginTop: 2 }}>₹2,400</div>
                </div>
                <button className="hf-btn accent sm">
                  Get passes <HFIcon name="arrowR" size={14}/>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tonight section header */}
        <div style={{ padding: '0 20px 12px' }}>
          <div className="hf-between">
            <div className="hf-row" style={{ gap: 8 }}>
              <span className="hf-live-dot"></span>
              <div className="h3">Happening tonight</div>
            </div>
            <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>12</span>
          </div>
        </div>

        {/* Event rows — dense */}
        <div style={{ padding: '0 20px 6px' }}>
          {[
            { p: P.dj_console, t: "Tribal Tales", sub: "Sunset set · DJ Fun", time: "20:00", venue: "Cafe Natarani", price: 500, sale: "5 left", goingN: 5, faces: [P.face_1, P.face_2, P.face_3] },
            { p: P.singer_red, t: "Stand-up · A.Khan", sub: "Comedy",          time: "21:30", venue: "Comedy Club",     price: 350, sale: null,        goingN: 0, faces: [] },
            { p: P.crowd_lights, t: "Indie Showcase", sub: "5-band line-up",   time: "22:00", venue: "The Loft",         price: 800, sale: "few left", goingN: 2, faces: [P.face_4, P.face_5] },
          ].map((e, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: i < 2 ? `1px solid ${HFQ_LINE}` : 0 }}>
              <div style={{ width: 56, height: 56, flexShrink: 0, borderRadius: 8, overflow: 'hidden' }}>
                <HFPhoto src={e.p} h={56}/>
              </div>
              <div className="hf-col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
                <div className="hf-row" style={{ gap: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: '-0.01em' }} className="hf-truncate">{e.t}</span>
                  {e.sale && <span className="hf-chip" style={{ padding: '1px 6px', fontSize: 10, color: HFQ_ACC, borderColor: HFQ_ACC_2, background: HFQ_ACC_2 }}>{e.sale}</span>}
                </div>
                <div className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>{e.time} · {e.venue}</div>
                <div className="hf-row" style={{ gap: 4, marginTop: 2 }}>
                  {e.faces.length > 0 && (
                    <div className="hf-stack">
                      {e.faces.map((f, j) => <HFAvatar key={j} src={f} size={16}/>)}
                    </div>
                  )}
                  {e.goingN > 0 && <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>{e.goingN} going</span>}
                </div>
              </div>
              <div className="hf-col" style={{ alignItems: 'flex-end', gap: 6 }}>
                <span className="hf-mono" style={{ fontSize: 13, fontWeight: 600 }}>₹{e.price}</span>
                <button className="hf-btn xs" style={{ background: HFQ_INK, color: '#fff', borderColor: HFQ_INK }}>Book</button>
              </div>
            </div>
          ))}
        </div>

        {/* Subtle banner */}
        <div style={{ margin: '14px 20px', padding: 14, background: '#f7f5f1', borderRadius: 10, border: `1px solid ${HFQ_LINE}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 999, background: HFQ_ACC_2, color: HFQ_ACC, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <HFIcon name="zap" size={18}/>
          </div>
          <div className="hf-col" style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>5 of your friends are going to events this week</div>
            <div className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>See who · 3 invites pending</div>
          </div>
          <HFIcon name="chevR" size={18}/>
        </div>

        {/* Weekend section */}
        <div style={{ padding: '14px 20px 12px' }}>
          <div className="hf-between" style={{ marginBottom: 12 }}>
            <div className="h3">This weekend</div>
            <span className="hf-mono" style={{ fontSize: 11, color: HFQ_ACC }}>see all 24 ›</span>
          </div>
        </div>

        {/* horizontal cards */}
        <div className="hf-scrollx" style={{ padding: '0 20px 18px', gap: 10 }}>
          {[
            { p: P.fest_river, t: "Sunset Set",   d: "Sat 23 · 18:00", price: 600, badge: null },
            { p: P.theatre_curtain, t: "A Doll's House", d: "Sun 27 · 19:00", price: 650, badge: "Theatre" },
            { p: P.workshop, t: "Mixology Class", d: "Sat 23 · 17:00", price: 1200, badge: "Workshop" },
          ].map((e, i) => (
            <div key={i} className="hf-card" style={{ width: 200, flexShrink: 0, borderRadius: 12 }}>
              <div style={{ position: 'relative' }}>
                <HFPhoto src={e.p} h={110}/>
                {e.badge && (
                  <span className="hf-chip" style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(255,255,255,0.95)', borderColor: 'transparent', fontSize: 10 }}>{e.badge}</span>
                )}
                <button style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 999, background: 'rgba(255,255,255,0.95)', border: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><HFIcon name="heart" size={14}/></button>
              </div>
              <div style={{ padding: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>{e.t}</div>
                <div className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3, marginTop: 2 }}>{e.d}</div>
                <div className="hf-divider" style={{ margin: '10px 0' }}></div>
                <div className="hf-between">
                  <span className="hf-mono" style={{ fontSize: 12, fontWeight: 600 }}>from ₹{e.price}</span>
                  <HFIcon name="arrowR" size={14}/>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Categories minimal */}
        <div style={{ padding: '6px 20px 24px' }}>
          <div className="h3" style={{ marginBottom: 10 }}>Browse by category</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              ["music", "Music", 142],
              ["fire", "Comedy", 38],
              ["spark", "Theatre", 24],
              ["wallet", "Free", 18],
              ["zap", "Festival", 8],
              ["clock", "Tonight", 12],
              ["pin", "Near me", 64],
              ["plus", "More", null],
            ].map(([icon, label, n], i) => (
              <div key={i} className="hf-card" style={{ padding: '10px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, borderRadius: 10 }}>
                <div style={{ color: HFQ_ACC }}><HFIcon name={icon} size={18}/></div>
                <div style={{ fontSize: 11, fontWeight: 600 }}>{label}</div>
                {n != null && <div className="hf-mono" style={{ fontSize: 9, color: HFQ_INK_3 }}>{n}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="hf-tabbar">
        <div className="tab on"><HFIcon name="spark" size={20} stroke={2}/>Discover</div>
        <div className="tab"><HFIcon name="search" size={20}/>Search</div>
        <div className="tab"><HFIcon name="ticket" size={20}/>Tickets</div>
        <div className="tab"><HFIcon name="user" size={20}/>You</div>
      </div>
    </HFPhone>
  );
}

// ── Mobile Event detail ──
function QuietEvent() {
  const P = HF_PHOTOS;
  return (
    <HFPhone className="hf-quiet">
      <div className="hf-scroll">
        {/* Hero */}
        <div style={{ position: 'relative' }}>
          <HFPhoto src={P.dj_set} h={360} dim>
            <div className="hf-row" style={{ alignItems: 'flex-start', gap: 8 }}>
              <button style={{ width: 36, height: 36, borderRadius: 999, background: 'rgba(255,255,255,0.95)', border: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <HFIcon name="chevL" size={18}/>
              </button>
              <span className="hf-grow"></span>
              <button style={{ width: 36, height: 36, borderRadius: 999, background: 'rgba(255,255,255,0.95)', border: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><HFIcon name="share" size={18}/></button>
              <button style={{ width: 36, height: 36, borderRadius: 999, background: 'rgba(255,255,255,0.95)', border: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><HFIcon name="heart" size={18}/></button>
            </div>
            <div style={{ marginTop: 'auto' }}>
              <span className="hf-chip" style={{ background: 'rgba(255,255,255,0.95)', borderColor: 'transparent', color: HFQ_INK, fontSize: 11 }}>Music · DJ set</span>
              <div className="h1" style={{ color: '#fff', marginTop: 10, fontSize: 30 }}>Tribal Tales</div>
              <div className="hf-mono" style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 4 }}>SUNSET SET · DJ FUN + 1</div>
            </div>
          </HFPhoto>
        </div>

        {/* Meta block */}
        <div style={{ padding: '18px 20px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="hf-card" style={{ padding: 12, borderRadius: 10 }}>
              <div className="lbl">When</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>Wed 30 Aug</div>
              <div className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3, marginTop: 2 }}>15:50 → 17:50</div>
            </div>
            <div className="hf-card" style={{ padding: 12, borderRadius: 10 }}>
              <div className="lbl">Where</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>Cafe Natarani</div>
              <div className="hf-mono" style={{ fontSize: 11, color: HFQ_ACC, marginTop: 2 }}>12 km · directions ↗</div>
            </div>
          </div>
        </div>

        {/* Lineup */}
        <div style={{ padding: '18px 20px 0' }}>
          <div className="hf-between" style={{ marginBottom: 12 }}>
            <div className="h3">Lineup</div>
            <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>2 artists</span>
          </div>
          <div className="hf-col" style={{ gap: 8 }}>
            {[
              [P.face_4, "DJ Fun",   "Headliner · 16:30", true],
              [P.face_2, "Riya M.",  "Opener · 15:50",    false],
            ].map(([img, n, role, headliner], i) => (
              <div key={i} className="hf-card" style={{ padding: 10, display: 'flex', alignItems: 'center', gap: 12, borderRadius: 10 }}>
                <HFAvatar src={img} size={40}/>
                <div className="hf-col" style={{ flex: 1, gap: 2 }}>
                  <div className="hf-row" style={{ gap: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{n}</span>
                    {headliner && <span className="hf-chip accent" style={{ fontSize: 10, padding: '1px 6px' }}>Headliner</span>}
                  </div>
                  <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>{role}</span>
                </div>
                <button className="hf-btn xs">Follow</button>
              </div>
            ))}
          </div>
        </div>

        {/* About */}
        <div style={{ padding: '20px 20px 0' }}>
          <div className="h3" style={{ marginBottom: 10 }}>About</div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: '#2a2a2e' }}>
            Sunset music night with rotating DJ set. Food trucks on-site.
            Outdoor lawn — bring a hoodie. <span style={{ color: HFQ_ACC, fontWeight: 600 }}>read more</span>
          </p>
        </div>

        {/* Inline metadata grid */}
        <div style={{ padding: '20px 20px 0' }}>
          <div className="hf-card" style={{ padding: 14, borderRadius: 10 }}>
            {[
              ["Duration", "3 hours"],
              ["Language", "English, Hindi"],
              ["Age limit", "18+"],
              ["Entry", "QR + photo ID"],
              ["Re-entry", "Not permitted"],
              ["Refund window", "48 hours before"],
            ].map(([k, v], i, arr) => (
              <div key={k} className="hf-row" style={{ padding: '6px 0', borderBottom: i < arr.length - 1 ? `1px solid ${HFQ_LINE}` : 0 }}>
                <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3, flex: 1 }}>{k}</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Organizer */}
        <div style={{ padding: '20px' }}>
          <div className="hf-card" style={{ padding: 14, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
            <HFAvatar src={P.face_6} size={44}/>
            <div className="hf-col" style={{ flex: 1, gap: 2 }}>
              <div className="hf-row" style={{ gap: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>Rishabh Mehta</span>
                <span className="hf-chip" style={{ padding: '1px 6px', fontSize: 10, background: HFQ_ACC_2, color: HFQ_ACC, borderColor: 'transparent' }}>Verified</span>
              </div>
              <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>@rishabh · 23 events · ★ 4.8</span>
            </div>
            <button className="hf-btn xs">Follow</button>
          </div>
        </div>

        {/* Going */}
        <div style={{ padding: '0 20px 20px' }}>
          <div className="hf-card" style={{ padding: 14, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="hf-stack">
              {[P.face_1, P.face_2, P.face_3, P.face_7, P.face_8].map((f, i) => <HFAvatar key={i} src={f} size={28}/>)}
            </div>
            <div className="hf-col" style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Farah, Salman + 3</div>
              <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>5 friends going</span>
            </div>
            <button className="hf-btn xs">Invite</button>
          </div>
        </div>

        <div style={{ height: 100 }}></div>
      </div>

      {/* Sticky bottom CTA */}
      <div style={{ borderTop: `1px solid ${HFQ_LINE}`, background: '#fff', padding: '14px 20px 28px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="hf-col">
          <div className="lbl">From</div>
          <div className="hf-mono" style={{ fontSize: 20, fontWeight: 600 }}>₹500</div>
        </div>
        <button className="hf-btn accent" style={{ flex: 1, padding: 14, fontSize: 14, borderRadius: 10 }}>
          Get tickets <HFIcon name="arrowR" size={16}/>
        </button>
      </div>
    </HFPhone>
  );
}

// ── Mobile Ticket ──
function QuietTicket() {
  const P = HF_PHOTOS;
  return (
    <HFPhone className="hf-quiet">
      <div className="hf-scroll" style={{ background: HFQ_INK }}>
        <div style={{ height: 56 }}></div>

        {/* Top bar */}
        <div style={{ padding: '8px 20px 14px', display: 'flex', alignItems: 'center', gap: 10, color: '#fff' }}>
          <button style={{ background: 'rgba(255,255,255,0.1)', border: 0, color: '#fff', width: 32, height: 32, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><HFIcon name="chevL" size={18}/></button>
          <div className="hf-grow" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Your ticket</div>
            <div className="hf-mono" style={{ fontSize: 11, opacity: 0.7 }}>1 of 2 · #RG7352</div>
          </div>
          <button style={{ background: 'rgba(255,255,255,0.1)', border: 0, color: '#fff', width: 32, height: 32, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><HFIcon name="share" size={18}/></button>
        </div>

        {/* Card */}
        <div style={{ padding: '16px 20px' }}>
          <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 40px -10px rgba(0,0,0,0.4)' }}>
            <div style={{ padding: 18 }}>
              <div className="hf-row" style={{ gap: 10, marginBottom: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden' }}>
                  <HFPhoto src={P.dj_set} h={40}/>
                </div>
                <div className="hf-col">
                  <span className="lbl">Event</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Tribal Tales</span>
                </div>
                <span className="hf-grow"></span>
                <span className="hf-chip" style={{ background: HFQ_ACC_2, color: HFQ_ACC, borderColor: 'transparent', fontSize: 10, padding: '2px 8px' }}>Valid</span>
              </div>

              <div className="hf-divider"></div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, padding: '14px 0' }}>
                <div className="hf-col">
                  <span className="lbl">Date</span>
                  <span className="hf-mono" style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>30 Aug</span>
                </div>
                <div className="hf-col">
                  <span className="lbl">Time</span>
                  <span className="hf-mono" style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>15:50</span>
                </div>
                <div className="hf-col">
                  <span className="lbl">Doors</span>
                  <span className="hf-mono" style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>15:00</span>
                </div>
                <div className="hf-col">
                  <span className="lbl">Name</span>
                  <span style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>Prateek S.</span>
                </div>
                <div className="hf-col">
                  <span className="lbl">Seat</span>
                  <span className="hf-mono" style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>C-4</span>
                </div>
                <div className="hf-col">
                  <span className="lbl">Type</span>
                  <span style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>Regular</span>
                </div>
              </div>

              <div className="hf-divider"></div>

              <div className="hf-row" style={{ padding: '14px 0 0', gap: 4 }}>
                <HFIcon name="pin" size={14}/>
                <div className="hf-col" style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Cafe Natarani</span>
                  <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>Shahibaug, Ahmedabad · 12 km</span>
                </div>
                <button className="hf-btn xs">Maps</button>
              </div>
            </div>

            {/* perforation simulated with notches */}
            <div style={{ position: 'relative', height: 22, background: HFQ_INK }}>
              <div style={{ position: 'absolute', left: -11, top: 0, width: 22, height: 22, borderRadius: 999, background: HFQ_INK }}></div>
              <div style={{ position: 'absolute', right: -11, top: 0, width: 22, height: 22, borderRadius: 999, background: HFQ_INK }}></div>
              <div style={{ position: 'absolute', left: 22, right: 22, top: 11, height: 1, borderTop: `2px dashed ${HFQ_LINE_2}` }}></div>
            </div>

            <div style={{ padding: 18, textAlign: 'center' }}>
              <div className="lbl" style={{ marginBottom: 14 }}>Scan at gate</div>
              <div style={{ display: 'inline-block', padding: 10, background: '#fafafa', borderRadius: 12, border: `1px solid ${HFQ_LINE}` }}>
                <QRPattern size={150}/>
              </div>
              <div className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3, marginTop: 12, letterSpacing: '0.04em' }}>TKT-9X2K-LM4P</div>
              <div className="hf-row" style={{ justifyContent: 'center', gap: 14, marginTop: 12 }}>
                <button className="hf-btn xs"><HFIcon name="wallet" size={14}/> Wallet</button>
                <button className="hf-btn xs"><HFIcon name="download" size={14}/> Save</button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ padding: '12px 20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 500, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
            <HFIcon name="arrowUR" size={16}/> Transfer
          </button>
          <button style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 500, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
            <HFIcon name="copy" size={16}/> Resell
          </button>
        </div>

        {/* Pagination dots */}
        <div className="hf-row" style={{ justifyContent: 'center', gap: 6, paddingBottom: 24 }}>
          <span style={{ width: 24, height: 6, borderRadius: 999, background: '#fff' }}></span>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.3)' }}></span>
        </div>
      </div>
    </HFPhone>
  );
}

window.QuietHome = QuietHome;
window.QuietEvent = QuietEvent;
window.QuietTicket = QuietTicket;
