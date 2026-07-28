// Desktop discover — both directions (LOUD + QUIET).

// ── LOUD desktop ──
function LoudDesktop() {
  const P = HF_PHOTOS;
  return (
    <HFBrowser url="ticketiv.app" tabs={["Ticketiv · Discover Ahmedabad", "BookMyShow", "Spotify"]}>
      <div className="hf-loud" style={{ background: HFL_PAPER, color: HFL_INK, minHeight: '100%' }}>
        {/* Top nav */}
        <div style={{ borderBottom: '1.5px solid ' + HFL_INK, background: HFL_PAPER, padding: '14px 32px', display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ background: HFL_INK, color: HFL_PAPER, padding: '5px 12px 7px', fontSize: 22, fontWeight: 900, letterSpacing: '0.02em', fontFamily: 'var(--hf-font-display)' }}>TICKETIV</div>
          <div style={{ display: 'flex', gap: 18, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            <span style={{ borderBottom: '2px solid ' + HFL_INK }}>Discover</span>
            <span style={{ color: '#6c6862' }}>Series</span>
            <span style={{ color: '#6c6862' }}>Calendar</span>
            <span style={{ color: '#6c6862' }}>Organizers</span>
          </div>
          <span style={{ flex: 1 }}></span>
          <div style={{ background: 'transparent', border: '1.5px solid ' + HFL_INK, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 8, width: 320 }}>
            <HFIcon name="search" size={16}/>
            <span style={{ fontSize: 13, color: '#6c6862' }}>Search events, artists, venues</span>
            <span style={{ marginLeft: 'auto', fontFamily: 'var(--hf-font-mono)', fontSize: 11, color: '#6c6862', background: HFL_PAPER, padding: '1px 6px', border: '1px solid ' + HFL_INK }}>⌘K</span>
          </div>
          <button className="hf-btn xs" style={{ borderColor: HFL_INK }}>EN ▾</button>
          <button style={{ background: HFL_ACCENT, padding: '7px 14px', border: '1.5px solid ' + HFL_INK, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em' }}>FOR ORGANIZERS ↗</button>
        </div>

        {/* Marquee */}
        <div style={{ background: HFL_INK, color: HFL_PAPER, padding: '8px 0', borderBottom: '1.5px solid ' + HFL_INK }}>
          <div className="marquee" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            <span style={{ color: HFL_ACCENT }}>●</span> LIVE TONIGHT · 12 EVENTS
            <span>★</span> TRIBAL TALES · 20:00 · 5 LEFT
            <span style={{ color: HFL_ACCENT }}>●</span> RIVER SOUND FEST · 2 DAYS
            <span>★</span> COMEDY · A.KHAN · 21:30
            <span style={{ color: HFL_ACCENT }}>●</span> NEW: SUNSET SET · TIX OPEN
            <span>★</span> 318 EVENTS THIS WEEK
            <span style={{ color: HFL_ACCENT }}>●</span> LIVE TONIGHT · 12 EVENTS
          </div>
        </div>

        {/* Hero strip */}
        <div style={{ padding: '24px 32px', borderBottom: '1.5px solid ' + HFL_INK }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 0, border: '1.5px solid ' + HFL_INK }}>
            <div style={{ position: 'relative', height: 380 }}>
              <HFPhoto src={P.crowd_smoke} h={380} heavy>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: HFL_ACCENT, color: HFL_INK, padding: '5px 10px', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em' }}>
                    <span className="hf-live-dot" style={{ background: HFL_INK }}></span> 3-DAY FESTIVAL · TIX OPEN
                  </div>
                  <div style={{ color: '#fff', textAlign: 'right' }}>
                    <div className="lbl" style={{ color: '#fff' }}>HEADLINER</div>
                    <div className="hf-mono" style={{ fontSize: 14, fontWeight: 700 }}>DJ FUN + 21 MORE</div>
                  </div>
                </div>
                <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 32 }}>
                  <div>
                    <div className="lbl" style={{ color: HFL_ACCENT }}>FRI 25 → SUN 27 JUL · RIVERSIDE PARK</div>
                    <div className="display-xl" style={{ color: '#fff', fontSize: 92, lineHeight: 0.85, letterSpacing: '-0.02em', marginTop: 8 }}>RIVER<br/>SOUND<br/>FEST</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="lbl" style={{ color: '#fff' }}>3-DAY PASS</div>
                    <div className="display-lg" style={{ color: '#fff', fontSize: 56, marginTop: 4 }}>₹2,400</div>
                    <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button style={{ background: HFL_PAPER, color: HFL_INK, padding: '12px 20px', border: '1.5px solid ' + HFL_PAPER, fontSize: 13, fontWeight: 700, letterSpacing: '0.04em' }}>LINEUP</button>
                      <button style={{ background: HFL_ACCENT, color: HFL_INK, padding: '12px 20px', border: '1.5px solid ' + HFL_ACCENT, fontSize: 13, fontWeight: 800, letterSpacing: '0.04em' }}>GET PASSES →</button>
                    </div>
                  </div>
                </div>
              </HFPhoto>
            </div>
            {/* side info */}
            <div style={{ background: HFL_PAPER, borderLeft: '1.5px solid ' + HFL_INK, padding: 20, display: 'flex', flexDirection: 'column' }}>
              <div className="lbl">YOUR CITY</div>
              <div className="display-md" style={{ fontSize: 24, marginTop: 4 }}>AHMEDABAD</div>
              <div className="hf-mono" style={{ fontSize: 11, color: '#6c6862', marginTop: 4 }}>318 EVENTS · 47 VENUES · 12 LIVE NOW</div>

              <hr className="dashrule" style={{ margin: '18px 0 12px' }}/>

              <div className="lbl" style={{ marginBottom: 8 }}>TONIGHT · 12</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  ["20:00", "TRIBAL TALES", "5 LEFT"],
                  ["21:30", "STAND-UP · A.KHAN", "OPEN"],
                  ["22:00", "INDIE @ THE LOFT", "OPEN"],
                  ["23:00", "AFTER-HOURS · RAW", "FEW"],
                ].map(([t, n, s], i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                    <span className="hf-mono" style={{ fontSize: 11, fontWeight: 700, width: 44 }}>{t}</span>
                    <span style={{ fontWeight: 700, fontSize: 13, flex: 1 }}>{n}</span>
                    <span className="hf-mono" style={{ fontSize: 9, color: s === '5 LEFT' || s === 'FEW' ? HFL_HOT : '#6c6862', fontWeight: 700 }}>{s}</span>
                  </div>
                ))}
              </div>

              <span style={{ marginTop: 'auto', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', color: HFL_INK, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                SEE ALL TONIGHT <HFIcon name="arrowR" size={12}/>
              </span>
            </div>
          </div>
        </div>

        {/* Filter / sort row */}
        <div style={{ padding: '22px 32px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="hf-chip on">ALL · 318</span>
          <span className="hf-chip">MUSIC · 142</span>
          <span className="hf-chip">COMEDY · 38</span>
          <span className="hf-chip">THEATRE · 24</span>
          <span className="hf-chip">FESTIVAL · 8</span>
          <span className="hf-chip">FOOD · 22</span>
          <span className="hf-chip">WORKSHOP · 14</span>
          <span className="hf-chip">FREE</span>
          <span style={{ flex: 1 }}></span>
          <span className="hf-mono" style={{ fontSize: 11, color: '#6c6862' }}>SORT: SOONEST ▾</span>
          <span style={{ width: 1, height: 18, background: HFL_INK }}></span>
          <div className="hf-mono" style={{ fontSize: 11, color: '#6c6862', display: 'flex', gap: 6 }}>
            VIEW: <span style={{ color: HFL_INK, fontWeight: 700 }}>GRID</span> / LIST / MAP
          </div>
        </div>

        {/* Big section header */}
        <div style={{ padding: '12px 32px 18px', display: 'flex', alignItems: 'flex-end', gap: 16 }}>
          <div className="display-xl" style={{ fontSize: 76, lineHeight: 0.85 }}>THIS<br/>WEEK</div>
          <div className="hf-mono" style={{ fontSize: 11, color: '#6c6862', marginBottom: 4 }}>24 EVENTS<br/>JUL 21 → 27</div>
        </div>

        {/* Big grid */}
        <div style={{ padding: '0 32px 32px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {[
            { p: P.dj_console,      d: "30", m: "AUG", w: "WED", t: "TRIBAL TALES",    sub: "DJ SET · 20:00 · CAFE NATARANI", price: "₹500",  tag: "5 LEFT",  cat: "MUSIC" },
            { p: P.singer_red,      d: "25", m: "JUL", w: "FRI", t: "STAND-UP NIGHT",  sub: "A.KHAN · 21:30 · COMEDY CLUB",   price: "₹350",  tag: null,      cat: "COMEDY" },
            { p: P.crowd_lights,    d: "26", m: "JUL", w: "SAT", t: "INDIE SHOWCASE",  sub: "5 BANDS · 22:00 · THE LOFT",     price: "₹800",  tag: "FEW",     cat: "MUSIC" },
            { p: P.theatre_curtain, d: "27", m: "JUL", w: "SUN", t: "A DOLL'S HOUSE",  sub: "DRAMA · 19:00 · NATARANI",       price: "₹650",  tag: null,      cat: "THEATRE" },
            { p: P.fest_river,      d: "23", m: "AUG", w: "SAT", t: "SUNSET SET",      sub: "DJ NIGHT · 18:00 · RIVERSIDE",   price: "₹600",  tag: "NEW",     cat: "MUSIC" },
            { p: P.workshop,        d: "23", m: "JUL", w: "WED", t: "MIXOLOGY",        sub: "CLASS · 17:00 · LOFT KITCHEN",   price: "₹1,200",tag: null,      cat: "WORKSHOP" },
            { p: P.comedy_club,     d: "26", m: "JUL", w: "SAT", t: "ROAST BATTLE",    sub: "COMEDY · 21:00 · LOL HQ",        price: "₹450",  tag: null,      cat: "COMEDY" },
            { p: P.guitar_solo,     d: "29", m: "JUL", w: "TUE", t: "ACOUSTIC HOUR",   sub: "FOLK · 19:00 · BLUESPACE",       price: "FREE",  tag: "FREE",    cat: "MUSIC" },
          ].map((e, i) => (
            <div key={i} className="hf-card" style={{ borderColor: HFL_INK, borderWidth: 1.5 }}>
              <div style={{ position: 'relative' }}>
                <HFPhoto src={e.p} ratio="4/3"/>
                <span style={{ position: 'absolute', top: 10, left: 10, background: HFL_PAPER, color: HFL_INK, padding: '3px 8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', border: '1.5px solid ' + HFL_INK }}>{e.cat}</span>
                {e.tag && <span style={{ position: 'absolute', top: 10, right: 10, background: e.tag === 'FREE' ? HFL_ACCENT : HFL_HOT, color: e.tag === 'FREE' ? HFL_INK : '#fff', padding: '3px 8px', fontSize: 10, fontWeight: 800, letterSpacing: '0.05em' }}>{e.tag}</span>}
              </div>
              <div style={{ padding: 14, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ textAlign: 'center', flexShrink: 0, borderRight: '1.5px solid ' + HFL_INK, paddingRight: 12, minWidth: 50 }}>
                  <div className="display-lg" style={{ fontSize: 28, lineHeight: 1 }}>{e.d}</div>
                  <div className="hf-mono" style={{ fontSize: 9, fontWeight: 700 }}>{e.m}·{e.w}</div>
                </div>
                <div className="hf-col" style={{ flex: 1 }}>
                  <div className="display-md" style={{ fontSize: 16 }}>{e.t}</div>
                  <div className="hf-mono" style={{ fontSize: 10, color: '#6c6862', marginTop: 2 }}>{e.sub}</div>
                  <div className="hf-row" style={{ marginTop: 8, justifyContent: 'space-between' }}>
                    <span className="hf-mono" style={{ fontSize: 13, fontWeight: 700 }}>{e.price}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: HFL_INK }}>GET →</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer band */}
        <div style={{ background: HFL_INK, color: HFL_PAPER, padding: '24px 32px', display: 'flex', gap: 32 }}>
          <div className="display-lg" style={{ color: HFL_PAPER, fontSize: 40, lineHeight: 0.9 }}>FIND<br/>WHAT'S<br/>NEXT.</div>
          <div className="hf-mono" style={{ fontSize: 11, color: HFL_PAPER, flex: 1, opacity: 0.7, alignSelf: 'flex-end' }}>
            DISCOVER · TICKETS · TRANSFERS · RESALE · CALENDAR<br/>
            FOR ARTISTS · FOR ORGANIZERS · API · TERMS
          </div>
          <div className="hf-col" style={{ alignItems: 'flex-end', gap: 6, alignSelf: 'flex-end' }}>
            <span style={{ background: HFL_ACCENT, color: HFL_INK, padding: '8px 14px', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em' }}>GET THE APP ↓</span>
            <span className="hf-mono" style={{ fontSize: 10, color: HFL_PAPER, opacity: 0.5 }}>v2.4.1 · 2025</span>
          </div>
        </div>
      </div>
    </HFBrowser>
  );
}

// ── QUIET desktop ──
function QuietDesktop() {
  const P = HF_PHOTOS;
  const slides = [
    { p: P.crowd_smoke,    badge: "3-day festival", title: "River Sound Fest",      meta: "Fri 25 → Sun 27 Jul · Riverside Park",     cta: "Get passes",  price: "from ₹2,400" },
    { p: P.dj_console,     badge: "Editor's pick",  title: "Tribal Tales",          meta: "Wed 30 Aug · 15:50 · Cafe Natarani",       cta: "Book now",    price: "from ₹500"   },
    { p: P.singer_red,     badge: "Tonight",        title: "Stand-up · A.Khan",     meta: "Fri 25 Jul · 21:30 · Comedy Club",         cta: "Get tickets", price: "₹350"        },
  ];
  return (
    <HFBrowser url="ticketiv.app" tabs={["Ticketiv · Discover", "Acme co", "Inbox · Gmail"]}>
      <div className="hf-quiet hf-consumer-desk" style={{ background: '#fafafa', color: HFQ_INK, minHeight: '100%' }}>
        {/* Top nav */}
        <div style={{ borderBottom: `1px solid ${HFQ_LINE}`, background: '#ffffff', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 7, background: HFQ_ACC, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13 }}>T</div>
            <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em' }}>ticketiv</span>
            <span className="hf-mono" style={{ fontSize: 10, padding: '2px 6px', background: HFQ_ACC_2, color: HFQ_ACC, borderRadius: 4, fontWeight: 600 }}>BETA</span>
          </div>
          <div style={{ display: 'flex', gap: 18, fontSize: 14, fontWeight: 500 }}>
            <span style={{ color: HFQ_INK, fontWeight: 600 }}>Discover</span>
            <span style={{ color: HFQ_INK_3 }}>Calendar</span>
            <span style={{ color: HFQ_INK_3 }}>Series</span>
            <span style={{ color: HFQ_INK_3 }}>Organizers</span>
          </div>
          <span style={{ flex: 1 }}></span>
          <div style={{ background: '#fafafa', border: `1px solid ${HFQ_LINE}`, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8, width: 260, borderRadius: 8 }}>
            <HFIcon name="search" size={14}/>
            <span style={{ fontSize: 13, color: HFQ_INK_3, flex: 1 }}>Search events, artists…</span>
            <span style={{ marginLeft: 'auto', fontFamily: 'var(--hf-font-mono)', fontSize: 10, color: HFQ_INK_3, background: '#ffffff', padding: '1px 6px', border: `1px solid ${HFQ_LINE}`, borderRadius: 4 }}>⌘K</span>
          </div>
          <span style={{ width: 1, height: 20, background: HFQ_LINE }}></span>
          <button className="hf-btn xs">For organizers ↗</button>
          <HFAvatar src={P.face_5} size={28}/>
        </div>

        {/* Location switcher */}
        <div style={{ padding: '20px 24px 8px', display: 'flex', alignItems: 'flex-end', gap: 16 }}>
          <div className="hf-col">
            <div className="lbl">Showing events in</div>
            <div className="hf-row" style={{ gap: 6, marginTop: 4 }}>
              <div className="h1" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                Ahmedabad
                <HFIcon name="chevD" size={20}/>
              </div>
            </div>
          </div>
          <span style={{ flex: 1 }}></span>
          <div className="hf-row" style={{ gap: 8 }}>
            <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>318 events · 47 venues</span>
            <span style={{ width: 1, height: 16, background: HFQ_LINE }}></span>
            <div className="hf-seg" style={{ borderRadius: 8 }}>
              <span className="on">Grid</span>
              <span>List</span>
              <span>Map</span>
            </div>
          </div>
        </div>

        {/* Rotating slider banner */}
        <div style={{ padding: '12px 24px 24px' }}>
          <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', height: 320 }}>
            <HFPhoto src={slides[0].p} h={320} dim>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', width: '100%', gap: 24 }}>
                <div className="hf-col" style={{ gap: 10 }}>
                  <span className="hf-chip" style={{ background: 'rgba(255,255,255,0.95)', borderColor: 'transparent', color: HFQ_INK, fontSize: 11, alignSelf: 'flex-start' }}>{slides[0].badge}</span>
                  <div className="h1" style={{ color: '#fff', fontSize: 44, letterSpacing: '-0.025em' }}>{slides[0].title}</div>
                  <div className="hf-mono" style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12 }}>{slides[0].meta.toUpperCase()}</div>
                </div>
                <div className="hf-col" style={{ alignItems: 'flex-end', gap: 10 }}>
                  <span className="hf-mono" style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{slides[0].price}</span>
                  <button className="hf-btn accent" style={{ padding: '12px 18px' }}>
                    {slides[0].cta} <HFIcon name="arrowR" size={14}/>
                  </button>
                </div>
              </div>
            </HFPhoto>

            {/* Prev/next */}
            <button style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 40, height: 40, borderRadius: 999, background: 'rgba(255,255,255,0.95)', border: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <HFIcon name="chevL" size={18}/>
            </button>
            <button style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', width: 40, height: 40, borderRadius: 999, background: 'rgba(255,255,255,0.95)', border: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <HFIcon name="chevR" size={18}/>
            </button>

            {/* Dot indicators */}
            <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
              {slides.map((_, i) => (
                <span key={i} style={{
                  width: i === 0 ? 24 : 6, height: 6, borderRadius: 999,
                  background: i === 0 ? '#fff' : 'rgba(255,255,255,0.45)',
                  transition: 'all 0.3s',
                }}></span>
              ))}
            </div>

            {/* Slide counter */}
            <div style={{ position: 'absolute', top: 14, right: 14, padding: '4px 8px', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', borderRadius: 999, color: '#fff', fontSize: 11, fontFamily: 'var(--hf-font-mono)', fontWeight: 600 }}>
              01 / 0{slides.length}
            </div>
          </div>
        </div>

        {/* Filter chips */}
        <div style={{ padding: '0 24px 20px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className="hf-chip on">All <span className="hf-mono" style={{ marginLeft: 4, opacity: 0.7 }}>318</span></span>
          <span className="hf-chip">Music <span className="hf-mono" style={{ marginLeft: 4, color: HFQ_INK_3 }}>142</span></span>
          <span className="hf-chip">Comedy <span className="hf-mono" style={{ marginLeft: 4, color: HFQ_INK_3 }}>38</span></span>
          <span className="hf-chip">Theatre <span className="hf-mono" style={{ marginLeft: 4, color: HFQ_INK_3 }}>24</span></span>
          <span className="hf-chip">Festival <span className="hf-mono" style={{ marginLeft: 4, color: HFQ_INK_3 }}>8</span></span>
          <span className="hf-chip">Food</span>
          <span className="hf-chip">Free</span>
          <span className="hf-chip"><HFIcon name="filter" size={12}/> More</span>
          <span style={{ flex: 1 }}></span>
          <span className="hf-chip">This weekend ▾</span>
          <span className="hf-chip">Sort: Soonest ▾</span>
        </div>

        {/* Section header */}
        <div style={{ padding: '0 24px 16px' }}>
          <div className="hf-between">
            <div>
              <div className="h2" style={{ fontSize: 22 }}>This week in Ahmedabad</div>
              <div className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3, marginTop: 2 }}>Jul 21 → Jul 27 · 24 events</div>
            </div>
            <span className="hf-mono" style={{ fontSize: 11, color: HFQ_ACC, fontWeight: 600 }}>SEE ALL ›</span>
          </div>
        </div>

        {/* Event grid — 3 col now fits 980 better */}
        <div style={{ padding: '0 24px 32px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { p: P.dj_console,      t: "Tribal Tales",    sub: "DJ set · DJ Fun",     d: "Wed 30 Aug · 20:00", venue: "Cafe Natarani",    price: "₹500",  cat: "Music",   sale: "5 left",  goingN: 5 },
            { p: P.singer_red,      t: "Stand-up Night",  sub: "A.Khan + 3 openers", d: "Fri 25 Jul · 21:30", venue: "Comedy Club",      price: "₹350",  cat: "Comedy",  sale: null,      goingN: 0 },
            { p: P.crowd_lights,    t: "Indie Showcase",  sub: "5-band line-up",      d: "Sat 26 Jul · 22:00", venue: "The Loft",          price: "₹800",  cat: "Music",   sale: "few left", goingN: 2 },
            { p: P.theatre_curtain, t: "A Doll's House",  sub: "Ibsen revival",       d: "Sun 27 Jul · 19:00", venue: "Natarani Stage",   price: "₹650",  cat: "Theatre", sale: null,      goingN: 0 },
            { p: P.fest_river,      t: "Sunset Set",      sub: "DJ night by river",   d: "Sat 23 Aug · 18:00", venue: "Riverside Park",   price: "₹600",  cat: "Music",   sale: "new",     goingN: 1 },
            { p: P.workshop,        t: "Mixology Class",  sub: "3-hr hands-on",       d: "Wed 23 Jul · 17:00", venue: "Loft Kitchen",     price: "₹1,200",cat: "Workshop",sale: null,      goingN: 0 },
            { p: P.comedy_club,     t: "Roast Battle",    sub: "8 comedians",         d: "Sat 26 Jul · 21:00", venue: "Lol HQ",            price: "₹450",  cat: "Comedy",  sale: null,      goingN: 0 },
            { p: P.guitar_solo,     t: "Acoustic Hour",   sub: "Folk by candlelight", d: "Tue 29 Jul · 19:00", venue: "BlueSpace",         price: "Free",  cat: "Music",   sale: "free",    goingN: 3 },
            { p: P.band_stage,      t: "Open Mic Friday", sub: "Singer-songwriters",  d: "Fri 25 Jul · 20:00", venue: "Studio X",          price: "₹250",  cat: "Music",   sale: null,      goingN: 0 },
          ].map((e, i) => (
            <div key={i} className="hf-card" style={{ borderRadius: 12 }}>
              <div style={{ position: 'relative' }}>
                <HFPhoto src={e.p} ratio="4/3"/>
                <span className="hf-chip" style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(255,255,255,0.95)', borderColor: 'transparent', fontSize: 10 }}>{e.cat}</span>
                {e.sale && <span className="hf-chip" style={{ position: 'absolute', top: 10, right: 10, background: e.sale === 'free' ? HFQ_ACC_2 : '#fff', color: e.sale === 'free' ? HFQ_ACC : (e.sale === 'few left' || e.sale === '5 left' ? '#c1422b' : HFQ_INK), borderColor: 'transparent', fontSize: 10, fontWeight: 600 }}>{e.sale}</span>}
                <button style={{ position: 'absolute', bottom: 10, right: 10, width: 30, height: 30, borderRadius: 999, background: 'rgba(255,255,255,0.95)', border: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><HFIcon name="heart" size={14}/></button>
              </div>
              <div style={{ padding: 14 }}>
                <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>{e.t}</div>
                <div className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3, marginTop: 2 }}>{e.sub}</div>
                <div className="hf-divider" style={{ margin: '10px 0' }}></div>
                <div className="hf-col" style={{ gap: 4 }}>
                  <div className="hf-row" style={{ gap: 4, fontSize: 11, color: HFQ_INK_3 }}>
                    <HFIcon name="cal" size={12}/>
                    <span className="hf-mono">{e.d}</span>
                  </div>
                  <div className="hf-row" style={{ gap: 4, fontSize: 11, color: HFQ_INK_3 }}>
                    <HFIcon name="pin" size={12}/>
                    <span className="hf-mono">{e.venue}</span>
                  </div>
                </div>
                <div className="hf-divider" style={{ margin: '10px 0' }}></div>
                <div className="hf-between">
                  <span className="hf-mono" style={{ fontSize: 13, fontWeight: 600 }}>{e.price}</span>
                  {e.goingN > 0 ? (
                    <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>{e.goingN} friend{e.goingN > 1 ? 's' : ''} going</span>
                  ) : (
                    <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>book ›</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ borderTop: `1px solid ${HFQ_LINE}`, padding: '20px 24px', background: '#fff', display: 'flex', alignItems: 'center', gap: 20 }}>
          <div className="hf-row" style={{ gap: 8 }}>
            <div style={{ width: 18, height: 18, borderRadius: 5, background: HFQ_ACC }}></div>
            <span style={{ fontSize: 13, fontWeight: 600 }}>ticketiv</span>
          </div>
          <span style={{ flex: 1 }}></span>
          <div className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3, display: 'flex', gap: 16 }}>
            <span>Discover</span><span>Tickets</span><span>Transfers</span><span>Resale</span><span>Calendar</span>
          </div>
          <span style={{ width: 1, height: 16, background: HFQ_LINE }}></span>
          <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>v2.4.1 · 2025</span>
        </div>
      </div>
    </HFBrowser>
  );
}

window.LoudDesktop = LoudDesktop;
window.QuietDesktop = QuietDesktop;
