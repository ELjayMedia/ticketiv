// Direction A · LOUD — brutalist concert poster
// Mobile home, event detail, ticket.

const HFL_INK     = '#0a0908';
const HFL_ACCENT  = '#d6ff3a';
const HFL_HOT     = '#ff3b00';
const HFL_PAPER   = '#f4f1e8';

// ─── Mobile Home / Discover ────────────────────────────────────
function LoudHome() {
  const P = HF_PHOTOS;
  return (
    <HFPhone className="hf-loud">
      <div className="hf-scroll">
        {/* status spacer */}
        <div style={{ height: 58 }}></div>

        {/* Top bar */}
        <div style={{ padding: '8px 20px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="display-md" style={{ fontSize: 22, flex: 1, letterSpacing: '-0.02em' }}>
            <span style={{ background: HFL_INK, color: HFL_PAPER, padding: '2px 10px 4px', display: 'inline-block' }}>TICKETIV</span>
          </div>
          <div className="hf-row" style={{ gap: 2 }}>
            <button className="hf-btn ghost" style={{ padding: 8 }}><HFIcon name="search" size={20}/></button>
            <button className="hf-btn ghost" style={{ padding: 8, position: 'relative' }}>
              <HFIcon name="bell" size={20}/>
              <span style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, background: HFL_HOT, borderRadius: 999 }}></span>
            </button>
          </div>
        </div>

        {/* City + sort */}
        <div style={{ padding: '0 20px 14px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div className="hf-col" style={{ gap: 0 }}>
            <div className="lbl">SHOWING EVENTS IN</div>
            <div className="display-lg" style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              AHMEDABAD
              <HFIcon name="chevD" size={20}/>
            </div>
          </div>
          <div className="hf-mono" style={{ fontSize: 11, color: '#6c6862' }}>318 EVENTS</div>
        </div>

        {/* Hero featured */}
        <div style={{ padding: '0 20px 16px' }}>
          <div style={{ position: 'relative' }}>
            <HFPhoto src={P.crowd_smoke} ratio="4/5" heavy>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ background: HFL_ACCENT, color: HFL_INK, padding: '6px 10px', fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="hf-live-dot" style={{ background: HFL_INK }}></span> LIVE TONIGHT
                </div>
                <div style={{ color: '#fff', textAlign: 'right' }}>
                  <div className="hf-mono" style={{ fontSize: 11, opacity: 0.85 }}>FRI 25 JUL · DOORS 7</div>
                </div>
              </div>
              <div style={{ marginTop: 'auto' }}>
                <div className="lbl" style={{ color: HFL_ACCENT, opacity: 0.9 }}>HEADLINER · DJ FUN +3</div>
                <div className="display-xl" style={{ color: '#fff', fontSize: 64, lineHeight: 0.85, letterSpacing: '-0.01em' }}>RIVER<br/>SOUND<br/>FEST</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
                  <div className="hf-mono" style={{ color: '#fff', fontSize: 12 }}>FROM ₹2,400</div>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.3)' }}></div>
                  <button style={{ background: HFL_ACCENT, color: HFL_INK, padding: '10px 14px', fontWeight: 700, fontSize: 13, border: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    GET PASSES <HFIcon name="arrowR" size={14}/>
                  </button>
                </div>
              </div>
            </HFPhoto>
          </div>
        </div>

        {/* Marquee strip */}
        <div style={{ background: HFL_INK, color: HFL_PAPER, padding: '10px 0', overflow: 'hidden', marginBottom: 20 }}>
          <div className="marquee" style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.04em' }}>
            <span style={{ color: HFL_ACCENT }}>●</span> 12 EVENTS TONIGHT
            <span>★</span> SUNSET SET · 6PM
            <span style={{ color: HFL_ACCENT }}>●</span> COMEDY · A.KHAN · 9PM
            <span>★</span> INDIE @ THE LOFT · 10PM
            <span style={{ color: HFL_ACCENT }}>●</span> 12 EVENTS TONIGHT
          </div>
        </div>

        {/* Categories */}
        <div className="hf-scrollx" style={{ padding: '0 20px 18px', gap: 6 }}>
          <span className="hf-chip on">ALL · 318</span>
          <span className="hf-chip">MUSIC · 142</span>
          <span className="hf-chip">COMEDY · 38</span>
          <span className="hf-chip">THEATRE · 24</span>
          <span className="hf-chip">FESTIVAL · 8</span>
          <span className="hf-chip">FOOD · 22</span>
        </div>

        {/* Section header */}
        <div style={{ padding: '0 20px 12px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div className="display-md" style={{ fontSize: 30 }}>THIS<br/>WEEKEND</div>
          <div className="hf-mono" style={{ fontSize: 11, color: '#6c6862' }}>24 EVENTS ↗</div>
        </div>

        {/* Event row (large card style) */}
        <div style={{ padding: '0 20px 12px' }}>
          <div className="hf-card" style={{ borderColor: HFL_INK, borderWidth: 1.5 }}>
            <div style={{ position: 'relative' }}>
              <HFPhoto src={P.dj_console} ratio="16/9" />
              <div style={{ position: 'absolute', top: 10, right: 10, background: HFL_INK, color: HFL_PAPER, padding: '4px 8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>5 LEFT</div>
            </div>
            <div style={{ padding: 14, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{ textAlign: 'center', flexShrink: 0, borderRight: '1.5px solid #0a0908', paddingRight: 14 }}>
                <div className="display-lg" style={{ fontSize: 42, color: HFL_INK }}>30</div>
                <div className="lbl">AUG · WED</div>
              </div>
              <div className="hf-col" style={{ gap: 4, flex: 1 }}>
                <div className="display-md" style={{ fontSize: 22 }}>TRIBAL TALES</div>
                <div className="hf-mono" style={{ fontSize: 11, color: '#2b2926' }}>15:50 → 17:50 · CAFE NATARANI</div>
                <div className="hf-row" style={{ gap: 8, marginTop: 4 }}>
                  <div className="hf-stack">
                    <HFAvatar src={P.face_1} size={20} ring={HFL_PAPER}/>
                    <HFAvatar src={P.face_2} size={20} ring={HFL_PAPER}/>
                    <HFAvatar src={P.face_3} size={20} ring={HFL_PAPER}/>
                  </div>
                  <span className="hf-mono" style={{ fontSize: 10, color: '#6c6862' }}>+5 FRIENDS</span>
                </div>
              </div>
              <div className="hf-col" style={{ alignItems: 'flex-end' }}>
                <div className="lbl">FROM</div>
                <div className="display-md" style={{ fontSize: 22 }}>₹500</div>
              </div>
            </div>
          </div>
        </div>

        {/* List rows */}
        <div style={{ padding: '0 20px 12px' }}>
          {[
            { p: P.singer_red,    d: "25", m: "JUL", w: "FRI", t: "STAND-UP NIGHT", sub: "21:30 · COMEDY CLUB", price: "₹350", tag: null },
            { p: P.crowd_lights,  d: "26", m: "JUL", w: "SAT", t: "INDIE SHOWCASE", sub: "22:00 · THE LOFT",     price: "₹800", tag: "FEW" },
            { p: P.theatre_curtain, d: "27", m: "JUL", w: "SUN", t: "A DOLL'S HOUSE", sub: "19:00 · NATARANI",     price: "₹650", tag: null },
          ].map((e, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '14px 0', borderBottom: '1.5px solid #0a0908', alignItems: 'center' }}>
              <div style={{ width: 70, height: 70, flexShrink: 0, border: '1.5px solid ' + HFL_INK }}>
                <HFPhoto src={e.p} h={68} />
              </div>
              <div className="hf-col" style={{ gap: 2, flex: 1 }}>
                <div className="hf-mono" style={{ fontSize: 10, color: '#6c6862', letterSpacing: '0.06em' }}>{e.w} · {e.d} {e.m}</div>
                <div className="display-md" style={{ fontSize: 18 }}>{e.t}</div>
                <div className="hf-mono" style={{ fontSize: 11, color: '#2b2926' }}>{e.sub}</div>
              </div>
              <div className="hf-col" style={{ alignItems: 'flex-end', gap: 4 }}>
                {e.tag && <span style={{ background: HFL_HOT, color: '#fff', padding: '2px 6px', fontSize: 9, fontWeight: 700, letterSpacing: '0.05em' }}>{e.tag}</span>}
                <div className="hf-mono" style={{ fontSize: 13, fontWeight: 600 }}>{e.price}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Following section */}
        <div style={{ padding: '8px 20px 14px', background: HFL_INK, color: HFL_PAPER, margin: '0' }}>
          <div className="hf-between" style={{ marginBottom: 12 }}>
            <div className="display-md" style={{ fontSize: 18, color: HFL_PAPER }}>FROM SERIES YOU FOLLOW</div>
            <span className="hf-mono" style={{ fontSize: 10, color: HFL_ACCENT }}>SEE ALL ↗</span>
          </div>
          <div className="hf-scrollx" style={{ gap: 10 }}>
            {[
              { p: P.dj_neon, t: "TRIBAL TALES", n: "8 EVENTS"},
              { p: P.comedy_club, t: "COMEDY CO.", n: "12 EVENTS"},
              { p: P.fest_river, t: "RIVER SOUND", n: "1 EVENT"},
            ].map((s, i) => (
              <div key={i} style={{ width: 140, flexShrink: 0 }}>
                <HFPhoto src={s.p} ratio="1/1"/>
                <div className="hf-col" style={{ paddingTop: 6, gap: 1 }}>
                  <div className="display-md" style={{ fontSize: 14, color: HFL_PAPER }}>{s.t}</div>
                  <div className="hf-mono" style={{ fontSize: 10, color: HFL_ACCENT }}>{s.n} · FOLLOWING</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: 24 }}></div>
      </div>

      {/* Tab bar */}
      <div className="hf-tabbar">
        <div className="tab on"><HFIcon name="spark" size={20}/>DISCOVER</div>
        <div className="tab"><HFIcon name="search" size={20}/>SEARCH</div>
        <div className="tab"><HFIcon name="ticket" size={20}/>TICKETS</div>
        <div className="tab"><HFIcon name="user" size={20}/>YOU</div>
      </div>
    </HFPhone>
  );
}

// ─── Mobile Event detail ───────────────────────────────────────
function LoudEvent() {
  const P = HF_PHOTOS;
  return (
    <HFPhone className="hf-loud">
      <div className="hf-scroll">
        {/* Hero photo with floating controls */}
        <div style={{ position: 'relative' }}>
          <HFPhoto src={P.dj_set} h={420} heavy>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <button style={{ width: 38, height: 38, background: HFL_PAPER, border: '1.5px solid ' + HFL_INK, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <HFIcon name="chevL" size={18}/>
              </button>
              <div className="hf-row" style={{ gap: 6 }}>
                <button style={{ width: 38, height: 38, background: HFL_PAPER, border: '1.5px solid ' + HFL_INK, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><HFIcon name="share" size={18}/></button>
                <button style={{ width: 38, height: 38, background: HFL_ACCENT, border: '1.5px solid ' + HFL_INK, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><HFIcon name="heart" size={18}/></button>
              </div>
            </div>
            <div style={{ marginTop: 'auto' }}>
              <div style={{ display: 'inline-block', background: HFL_ACCENT, color: HFL_INK, padding: '4px 10px', fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', marginBottom: 12 }}>★ EDITOR'S PICK</div>
              <div className="display-xl" style={{ color: '#fff', fontSize: 58, lineHeight: 0.85 }}>TRIBAL<br/>TALES</div>
              <div className="hf-mono" style={{ color: '#fff', fontSize: 12, marginTop: 8, opacity: 0.9 }}>SUNSET SET BY DJ FUN +1 OPENER</div>
            </div>
          </HFPhoto>
        </div>

        {/* Date + venue block */}
        <div style={{ background: HFL_INK, color: HFL_PAPER }}>
          <div style={{ display: 'flex', alignItems: 'stretch' }}>
            <div style={{ flex: 1, padding: '18px 20px', borderRight: '1.5px solid ' + HFL_PAPER }}>
              <div className="lbl" style={{ color: HFL_ACCENT }}>DATE</div>
              <div className="display-md" style={{ fontSize: 28, color: HFL_PAPER, marginTop: 4 }}>WED 30<br/>AUG</div>
              <div className="hf-mono" style={{ fontSize: 11, color: HFL_PAPER, opacity: 0.7, marginTop: 4 }}>15:50 → 17:50</div>
            </div>
            <div style={{ flex: 1, padding: '18px 20px' }}>
              <div className="lbl" style={{ color: HFL_ACCENT }}>VENUE</div>
              <div className="display-md" style={{ fontSize: 18, color: HFL_PAPER, marginTop: 4 }}>CAFE NATARANI</div>
              <div className="hf-mono" style={{ fontSize: 11, color: HFL_PAPER, opacity: 0.7, marginTop: 4 }}>SHAHIBAUG · 12 KM</div>
              <div style={{ marginTop: 8, color: HFL_ACCENT, fontSize: 11, fontFamily: 'var(--hf-font-mono)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <HFIcon name="map" size={12}/> DIRECTIONS
              </div>
            </div>
          </div>
        </div>

        {/* Lineup */}
        <div style={{ padding: '20px' }}>
          <div className="hf-between" style={{ marginBottom: 12 }}>
            <div className="display-md" style={{ fontSize: 20 }}>LINEUP</div>
            <span className="hf-mono" style={{ fontSize: 11, color: '#6c6862' }}>2 ARTISTS</span>
          </div>
          <div className="hf-col" style={{ gap: 12 }}>
            <div className="hf-row" style={{ gap: 12 }}>
              <div style={{ position: 'relative', width: 60, height: 60, flexShrink: 0, border: '1.5px solid ' + HFL_INK }}>
                <HFPhoto src={P.face_4} h={58}/>
              </div>
              <div className="hf-col" style={{ flex: 1 }}>
                <div className="display-md" style={{ fontSize: 16 }}>DJ FUN</div>
                <div className="hf-mono" style={{ fontSize: 10, color: '#6c6862' }}>HEADLINER · 16:30 — 17:50</div>
              </div>
              <div style={{ background: HFL_ACCENT, padding: '4px 8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em' }}>FOLLOW</div>
            </div>
            <div className="hf-row" style={{ gap: 12 }}>
              <div style={{ width: 60, height: 60, flexShrink: 0, border: '1.5px solid ' + HFL_INK }}>
                <HFPhoto src={P.face_2} h={58}/>
              </div>
              <div className="hf-col" style={{ flex: 1 }}>
                <div className="display-md" style={{ fontSize: 16 }}>RIYA M.</div>
                <div className="hf-mono" style={{ fontSize: 10, color: '#6c6862' }}>OPENER · 15:50 — 16:30</div>
              </div>
              <div style={{ padding: '4px 8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', border: '1.5px solid ' + HFL_INK }}>FOLLOW</div>
            </div>
          </div>
        </div>

        <hr className="rule"/>

        {/* About + meta grid */}
        <div style={{ padding: '20px' }}>
          <div className="display-md" style={{ fontSize: 20, marginBottom: 10 }}>ABOUT</div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: '#2b2926' }}>
            Sunset music night with rotating DJ set. Food trucks on-site. Outdoor lawn — bring a hoodie!
            4th edition of the Tribal Tales tour.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 18, paddingTop: 18, borderTop: '1.5px dashed ' + HFL_INK }}>
            <div className="hf-col"><div className="lbl">DURATION</div><div style={{ fontSize: 14, fontWeight: 600 }}>3 HRS</div></div>
            <div className="hf-col"><div className="lbl">LANGUAGE</div><div style={{ fontSize: 14, fontWeight: 600 }}>EN · HI</div></div>
            <div className="hf-col"><div className="lbl">AGE</div><div style={{ fontSize: 14, fontWeight: 600 }}>18+</div></div>
            <div className="hf-col"><div className="lbl">ENTRY</div><div style={{ fontSize: 14, fontWeight: 600 }}>QR</div></div>
            <div className="hf-col"><div className="lbl">RE-ENTRY</div><div style={{ fontSize: 14, fontWeight: 600 }}>NO</div></div>
            <div className="hf-col"><div className="lbl">REFUND</div><div style={{ fontSize: 14, fontWeight: 600 }}>48H</div></div>
          </div>
        </div>

        {/* Going */}
        <div style={{ padding: '0 20px 20px' }}>
          <div className="hf-card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="hf-stack">
              <HFAvatar src={P.face_1} size={32} ring={HFL_PAPER}/>
              <HFAvatar src={P.face_2} size={32} ring={HFL_PAPER}/>
              <HFAvatar src={P.face_3} size={32} ring={HFL_PAPER}/>
              <HFAvatar src={P.face_4} size={32} ring={HFL_PAPER}/>
              <HFAvatar src={P.face_5} size={32} ring={HFL_PAPER}/>
            </div>
            <div className="hf-col" style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>FARAH +4 OTHERS</div>
              <div className="hf-mono" style={{ fontSize: 11, color: '#6c6862' }}>5 OF YOUR FRIENDS GOING</div>
            </div>
            <button className="hf-btn xs" style={{ background: HFL_ACCENT, borderColor: HFL_INK }}>INVITE</button>
          </div>
        </div>

        <div style={{ height: 100 }}></div>
      </div>

      {/* Sticky bottom CTA */}
      <div style={{ borderTop: '1.5px solid ' + HFL_INK, background: HFL_PAPER, padding: '14px 20px 28px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="hf-col">
          <div className="lbl">FROM</div>
          <div className="display-md" style={{ fontSize: 28, lineHeight: 0.9 }}>₹500</div>
        </div>
        <button style={{ flex: 1, background: HFL_INK, color: HFL_ACCENT, border: 0, padding: '14px', fontSize: 15, fontWeight: 800, letterSpacing: '0.04em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          GET TICKETS <HFIcon name="arrowR" size={18}/>
        </button>
      </div>
    </HFPhone>
  );
}

// ─── Mobile Ticket (QR) ────────────────────────────────────────
function LoudTicket() {
  const P = HF_PHOTOS;
  return (
    <HFPhone className="hf-loud" >
      <div className="hf-scroll" style={{ background: HFL_INK }}>
        {/* status spacer */}
        <div style={{ height: 58 }}></div>

        {/* top bar */}
        <div style={{ padding: '8px 20px 14px', display: 'flex', alignItems: 'center', gap: 10, color: HFL_PAPER }}>
          <button style={{ background: 'transparent', border: 0, color: HFL_PAPER, cursor: 'pointer' }}><HFIcon name="chevL" size={22}/></button>
          <div className="hf-grow" style={{ textAlign: 'center' }}>
            <div className="lbl" style={{ color: HFL_ACCENT }}>YOUR TICKET</div>
            <div className="hf-mono" style={{ fontSize: 11, color: HFL_PAPER, opacity: 0.8 }}>1 OF 2 · #RG7352</div>
          </div>
          <button style={{ background: 'transparent', border: 0, color: HFL_PAPER, cursor: 'pointer' }}><HFIcon name="share" size={22}/></button>
        </div>

        {/* Ticket stub */}
        <div style={{ padding: '20px' }}>
          <div className="ticket-stub" style={{ background: HFL_PAPER }}>
            {/* Event photo strip */}
            <div style={{ position: 'relative' }}>
              <HFPhoto src={P.dj_set} h={120} heavy>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%' }}>
                  <div style={{ background: HFL_ACCENT, color: HFL_INK, padding: '3px 8px', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em' }}>VALID</div>
                  <span className="hf-mono" style={{ color: '#fff', fontSize: 10 }}>SHAHIBAUG · 12 KM</span>
                </div>
              </HFPhoto>
            </div>

            {/* Main info */}
            <div style={{ padding: '16px 18px 0' }}>
              <div className="lbl">EVENT</div>
              <div className="display-lg" style={{ fontSize: 32, marginTop: 2 }}>TRIBAL<br/>TALES</div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, marginTop: 16 }}>
                <div className="hf-col" style={{ flex: 1 }}>
                  <div className="lbl">DATE</div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>WED 30 AUG</div>
                </div>
                <div className="hf-col" style={{ flex: 1 }}>
                  <div className="lbl">TIME</div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>15:50</div>
                </div>
                <div className="hf-col" style={{ flex: 1 }}>
                  <div className="lbl">DOORS</div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>15:00</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, marginTop: 14 }}>
                <div className="hf-col" style={{ flex: 1 }}>
                  <div className="lbl">NAME</div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>PRATEEK SHARMA</div>
                </div>
                <div className="hf-col" style={{ flex: 1 }}>
                  <div className="lbl">SEAT</div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>C-4</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, marginTop: 14 }}>
                <div className="hf-col" style={{ flex: 1 }}>
                  <div className="lbl">TYPE</div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>REGULAR</div>
                </div>
                <div className="hf-col" style={{ flex: 1 }}>
                  <div className="lbl">ORDER</div>
                  <div className="hf-mono" style={{ fontSize: 12, fontWeight: 700, marginTop: 2 }}>#RG7352</div>
                </div>
              </div>
            </div>

            {/* perforation + QR */}
            <div style={{ marginTop: 22, position: 'relative' }}>
              <div className="perf" style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: -10, top: -10, width: 20, height: 20, background: HFL_INK, borderRadius: 999 }}></div>
                <div style={{ position: 'absolute', right: -10, top: -10, width: 20, height: 20, background: HFL_INK, borderRadius: 999 }}></div>
              </div>
              <div style={{ padding: '24px 18px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
                {/* QR */}
                <div style={{ width: 130, height: 130, background: '#fff', border: '1.5px solid ' + HFL_INK, padding: 8, flexShrink: 0 }}>
                  <QRPattern size={114}/>
                </div>
                <div className="hf-col" style={{ flex: 1, gap: 6 }}>
                  <div className="lbl">SCAN AT GATE</div>
                  <div className="hf-mono" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.02em' }}>TKT-9X2K-LM4P</div>
                  <div style={{ height: 1, background: HFL_INK, margin: '6px 0' }}></div>
                  <div className="hf-mono" style={{ fontSize: 9, color: '#6c6862', letterSpacing: '0.05em' }}>BRIGHTNESS AUTO-MAX</div>
                  <div className="hf-row" style={{ gap: 4, marginTop: 2 }}>
                    <button className="hf-btn xs" style={{ background: HFL_ACCENT, borderColor: HFL_INK, padding: '4px 8px', fontSize: 10 }}>WALLET</button>
                    <button className="hf-btn xs" style={{ padding: '4px 8px', fontSize: 10 }}>SHARE</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: '0 20px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button className="hf-btn" style={{ background: 'transparent', color: HFL_PAPER, borderColor: HFL_PAPER }}>
            <HFIcon name="arrowUR" size={16}/> TRANSFER
          </button>
          <button className="hf-btn" style={{ background: 'transparent', color: HFL_PAPER, borderColor: HFL_PAPER }}>
            <HFIcon name="copy" size={16}/> RESELL
          </button>
        </div>

        {/* Ticket 2 preview */}
        <div style={{ padding: '0 20px 30px' }}>
          <div className="hf-row" style={{ gap: 8, color: HFL_PAPER, opacity: 0.5, marginBottom: 6, justifyContent: 'center' }}>
            <span className="hf-mono" style={{ fontSize: 10, letterSpacing: '0.1em' }}>SWIPE FOR TICKET 2 ↓</span>
          </div>
          <div style={{ background: HFL_PAPER, border: '1.5px solid ' + HFL_PAPER, height: 30, transform: 'scale(0.94)', opacity: 0.4 }}></div>
        </div>
      </div>
    </HFPhone>
  );
}

// QR placeholder pattern
function QRPattern({ size = 110 }) {
  // generate a deterministic blocky pattern
  const cells = 13;
  const cell = size / cells;
  const seed = "TKT-9X2K-LM4P";
  const cellArr = [];
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      // corner finder squares
      const inFinder = (
        (x < 3 && y < 3) || (x > cells - 4 && y < 3) || (x < 3 && y > cells - 4)
      );
      if (inFinder) continue;
      const h = (seed.charCodeAt((x + y * 7) % seed.length) ^ (x * 13 + y * 7)) % 3;
      if (h === 0) cellArr.push([x, y]);
    }
  }
  const finder = (cx, cy) => (
    <g key={`${cx}-${cy}`}>
      <rect x={cx*cell} y={cy*cell} width={cell*3} height={cell*3} fill="#0a0908"/>
      <rect x={(cx+0.4)*cell} y={(cy+0.4)*cell} width={cell*2.2} height={cell*2.2} fill="#fff"/>
      <rect x={(cx+0.9)*cell} y={(cy+0.9)*cell} width={cell*1.2} height={cell*1.2} fill="#0a0908"/>
    </g>
  );
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {finder(0, 0)}
      {finder(cells - 3, 0)}
      {finder(0, cells - 3)}
      {cellArr.map(([x, y], i) => (
        <rect key={i} x={x*cell + 0.5} y={y*cell + 0.5} width={cell - 1} height={cell - 1} fill="#0a0908"/>
      ))}
    </svg>
  );
}

window.LoudHome = LoudHome;
window.LoudEvent = LoudEvent;
window.LoudTicket = LoudTicket;
window.QRPattern = QRPattern;
