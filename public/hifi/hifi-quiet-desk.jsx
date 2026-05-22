// QUIET direction · desktop event detail + checkout.

// ── Desktop event detail ──
function QuietDeskEvent() {
  const P = HF_PHOTOS;
  return (
    <HFBrowser url="ticketiv.com/e/tribal-tales-aug-30" tabs={["Tribal Tales · Ticketiv", "Calendar", "Inbox"]}>
      <div className="hf-quiet hf-consumer-desk" style={{ background: '#fafafa', color: HFQ_INK, minHeight: '100%' }}>
        {/* Top nav (slimmed) */}
        <div style={{ borderBottom: `1px solid ${HFQ_LINE}`, background: '#fff', padding: '12px 40px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="hf-row" style={{ gap: 8 }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: HFQ_ACC, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>T</div>
            <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.02em' }}>ticketiv</span>
          </div>
          <span style={{ width: 1, height: 16, background: HFQ_LINE }}></span>
          <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>Discover › Music › Tribal Tales</span>
          <span style={{ flex: 1 }}></span>
          <button className="hf-btn xs"><HFIcon name="share" size={14}/> Share</button>
          <button className="hf-btn xs"><HFIcon name="heart" size={14}/> Save</button>
          <HFAvatar src={P.face_5} size={28}/>
        </div>

        {/* Hero photo */}
        <div style={{ padding: '24px 40px 0' }}>
          <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden' }}>
            <HFPhoto src={P.dj_set} h={420} dim>
              <div style={{ marginTop: 'auto' }}>
                <span className="hf-chip" style={{ background: 'rgba(255,255,255,0.95)', borderColor: 'transparent', color: HFQ_INK, fontSize: 11 }}>Music · DJ set</span>
                <div className="h1" style={{ color: '#fff', marginTop: 14, fontSize: 56, letterSpacing: '-0.025em' }}>Tribal Tales</div>
                <div className="hf-mono" style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, marginTop: 4 }}>SUNSET SET BY DJ FUN + 1 OPENER · 4TH EDITION</div>
              </div>
            </HFPhoto>
          </div>
        </div>

        {/* Two column */}
        <div style={{ padding: '32px 40px', display: 'grid', gridTemplateColumns: '1fr 380px', gap: 32, alignItems: 'flex-start' }}>
          {/* Left */}
          <div className="hf-col" style={{ gap: 28 }}>
            {/* Meta strip */}
            <div className="hf-card" style={{ padding: 0, borderRadius: 12, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
              {[
                ["cal",   "When",     "Wed 30 Aug",      "15:50 → 17:50"],
                ["pin",   "Where",    "Cafe Natarani",   "Shahibaug · 12km"],
                ["clock", "Duration", "3 hours",         "Doors at 15:00"],
                ["globe", "Language", "English, Hindi",  "Subtitles on request"],
              ].map(([i, l, v, sub], idx, arr) => (
                <div key={l} style={{ padding: 16, borderRight: idx < arr.length - 1 ? `1px solid ${HFQ_LINE}` : 0 }}>
                  <div className="hf-row" style={{ gap: 6, color: HFQ_INK_3, marginBottom: 6 }}>
                    <HFIcon name={i} size={14}/>
                    <span className="lbl">{l}</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{v}</div>
                  <div className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3, marginTop: 2 }}>{sub}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div>
              <div style={{ borderBottom: `1px solid ${HFQ_LINE}`, display: 'flex', gap: 24 }}>
                {['About', 'Lineup', 'Venue', 'Reviews', 'FAQ'].map((t, i) => (
                  <div key={t} style={{
                    padding: '10px 0',
                    fontSize: 14, fontWeight: 500,
                    color: i === 0 ? HFQ_INK : HFQ_INK_3,
                    borderBottom: i === 0 ? `2px solid ${HFQ_ACC}` : '2px solid transparent',
                    marginBottom: -1,
                  }}>{t} {i === 3 && <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>24</span>}</div>
                ))}
              </div>

              <div style={{ padding: '20px 0' }}>
                <div className="h2" style={{ fontSize: 20 }}>About this show</div>
                <p style={{ fontSize: 14, lineHeight: 1.65, color: '#2a2a2e', marginTop: 12, maxWidth: 640 }}>
                  Sunset music night with rotating DJ set. Food trucks on-site. Outdoor lawn — bring a hoodie!
                  Curated by Rishabh Mehta for the 4th edition of the Tribal Tales tour. Last entry at 19:00, no re-entry.
                </p>
                <div className="hf-row" style={{ gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                  {['Outdoor', 'Food on-site', '18+', 'Wheelchair access', 'Cash bar', 'Photography allowed'].map(c => (
                    <span key={c} className="hf-chip" style={{ fontSize: 12 }}>{c}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Lineup */}
            <div>
              <div className="hf-between" style={{ marginBottom: 14 }}>
                <div className="h2" style={{ fontSize: 20 }}>Lineup</div>
                <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>2 artists · set times below</span>
              </div>
              <div className="hf-row" style={{ gap: 12, flexWrap: 'wrap' }}>
                {[
                  [P.face_4, "DJ Fun",   "Headliner",   "16:30 — 17:50", true,  "2.4k followers"],
                  [P.face_2, "Riya M.",  "Opener",      "15:50 — 16:30", false, "840 followers"],
                ].map(([img, n, role, time, hl, foll], i) => (
                  <div key={i} className="hf-card" style={{ padding: 14, borderRadius: 12, flex: 1, minWidth: 240, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <HFAvatar src={img} size={48}/>
                    <div className="hf-col" style={{ flex: 1, gap: 2 }}>
                      <div className="hf-row" style={{ gap: 6 }}>
                        <span style={{ fontSize: 15, fontWeight: 600 }}>{n}</span>
                        {hl && <span className="hf-chip accent" style={{ fontSize: 10, padding: '1px 6px' }}>Headliner</span>}
                      </div>
                      <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>{role} · {time}</span>
                      <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3, marginTop: 2 }}>{foll}</span>
                    </div>
                    <button className="hf-btn xs">Follow</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Venue */}
            <div>
              <div className="h2" style={{ fontSize: 20, marginBottom: 14 }}>Venue</div>
              <div className="hf-card" style={{ padding: 0, borderRadius: 12, overflow: 'hidden', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                <div style={{ height: 220, position: 'relative', background: '#e8e6e2', overflow: 'hidden' }}>
                  <svg viewBox="0 0 400 220" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                    {/* roads */}
                    <path d="M-10 60 Q 100 70 200 80 Q 300 90 410 70" stroke={HFQ_LINE_2} strokeWidth="6" fill="none" strokeLinecap="round"/>
                    <path d="M-10 140 Q 120 130 220 145 Q 320 160 410 140" stroke={HFQ_LINE_2} strokeWidth="6" fill="none" strokeLinecap="round"/>
                    <path d="M150 -10 L 180 230" stroke={HFQ_LINE_2} strokeWidth="4" fill="none"/>
                    <path d="M280 -10 L 310 230" stroke={HFQ_LINE_2} strokeWidth="4" fill="none"/>
                    {/* blocks */}
                    {[[40,90],[80,160],[210,30],[230,180],[340,90]].map(([x,y], i) => (
                      <rect key={i} x={x} y={y} width="40" height="30" fill="#d8d6d3"/>
                    ))}
                    {/* pin */}
                    <circle cx="200" cy="110" r="14" fill={HFQ_ACC} opacity="0.2"/>
                    <circle cx="200" cy="110" r="7" fill={HFQ_ACC} stroke="#fff" strokeWidth="2"/>
                  </svg>
                </div>
                <div className="hf-col" style={{ padding: 18, gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>Cafe Natarani</span>
                  <span className="hf-mono" style={{ fontSize: 12, color: HFQ_INK_3 }}>Lawn 4, Shahibaug · Ahmedabad 380004</span>
                  <div className="hf-divider"></div>
                  <div className="hf-col" style={{ gap: 4 }}>
                    {[
                      ['check', 'Wheelchair accessible'],
                      ['check', 'Outdoor venue · open lawn'],
                      ['check', 'Cash bar on premises'],
                      ['close', 'No re-entry once scanned'],
                    ].map(([i, t]) => (
                      <div key={t} className="hf-row" style={{ gap: 6, fontSize: 12 }}>
                        <HFIcon name={i} size={14} style={{ color: i === 'check' ? HFQ_ACC : HFQ_INK_3 }}/>
                        <span>{t}</span>
                      </div>
                    ))}
                  </div>
                  <div className="hf-row" style={{ gap: 6, marginTop: 'auto' }}>
                    <button className="hf-btn xs"><HFIcon name="map" size={12}/> Directions</button>
                    <button className="hf-btn xs">Street view</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Reviews */}
            <div>
              <div className="hf-between" style={{ marginBottom: 14 }}>
                <div className="h2" style={{ fontSize: 20 }}>Reviews</div>
                <div className="hf-row" style={{ gap: 8 }}>
                  <span style={{ fontSize: 22, fontWeight: 600, color: HFQ_ACC }}>4.8</span>
                  <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3, alignSelf: 'flex-end', marginBottom: 4 }}>· 124 ratings · 24 written</span>
                </div>
              </div>
              <div className="hf-row" style={{ gap: 12, flexWrap: 'wrap' }}>
                {[
                  [P.face_3, "Asha I.",  "★★★★★", "Magical vibe. Great food trucks. Will return."],
                  [P.face_6, "Manish G.", "★★★★☆", "Loved the music — wished it ran longer."],
                  [P.face_8, "Priya P.",  "★★★★★", "Outdoors at sunset, exactly what it says on the tin. 10/10."],
                ].map(([img, n, s, q], i) => (
                  <div key={i} className="hf-card" style={{ padding: 14, borderRadius: 12, flex: 1, minWidth: 200 }}>
                    <div className="hf-row" style={{ gap: 8, marginBottom: 8 }}>
                      <HFAvatar src={img} size={28}/>
                      <div className="hf-col">
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{n}</span>
                        <span style={{ fontSize: 12, color: HFQ_ACC, letterSpacing: '0.05em' }}>{s}</span>
                      </div>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: '#2a2a2e' }}>{q}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right · sticky checkout */}
          <div className="hf-col" style={{ gap: 14, position: 'sticky', top: 24 }}>
            <div className="hf-card" style={{ borderRadius: 14, padding: 18 }}>
              <div className="hf-between">
                <div className="hf-col">
                  <span className="lbl">From</span>
                  <span className="hf-mono" style={{ fontSize: 28, fontWeight: 600, marginTop: 2, letterSpacing: '-0.02em' }}>₹500</span>
                </div>
                <span className="hf-chip" style={{ background: '#fdf0ec', color: '#c1422b', borderColor: 'transparent', fontSize: 11, fontWeight: 600 }}>5 left at this price</span>
              </div>
              <div className="hf-divider" style={{ margin: '14px 0' }}></div>
              <div className="hf-col" style={{ gap: 6 }}>
                {[
                  { name: "Regular", price: 500, sub: "5 left", on: true },
                  { name: "Premium", price: 1200, sub: "18 of 30", on: false },
                  { name: "VIP",     price: 2500, sub: "sold out", on: false, gone: true },
                ].map((t, i) => (
                  <div key={i} style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: `1px solid ${t.on ? HFQ_ACC : HFQ_LINE}`,
                    background: t.on ? HFQ_ACC_2 : '#fff',
                    opacity: t.gone ? 0.5 : 1,
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <span style={{
                      width: 14, height: 14, borderRadius: 999,
                      border: `2px solid ${t.on ? HFQ_ACC : HFQ_LINE_2}`,
                      flexShrink: 0,
                      position: 'relative',
                    }}>
                      {t.on && <span style={{ position: 'absolute', inset: 2, borderRadius: 999, background: HFQ_ACC }}></span>}
                    </span>
                    <div className="hf-col" style={{ flex: 1 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</span>
                      <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>{t.sub}</span>
                    </div>
                    <span className="hf-mono" style={{ fontSize: 13, fontWeight: 600, textDecoration: t.gone ? 'line-through' : 'none' }}>₹{t.price}</span>
                  </div>
                ))}
              </div>
              <div className="hf-divider" style={{ margin: '14px 0' }}></div>
              <div className="hf-row" style={{ gap: 10 }}>
                <span className="lbl" style={{ flex: 1 }}>Quantity</span>
                <button style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${HFQ_LINE_2}`, background: '#fff' }}><HFIcon name="minus" size={12}/></button>
                <span className="hf-mono" style={{ fontSize: 14, fontWeight: 600, minWidth: 16, textAlign: 'center' }}>2</span>
                <button style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${HFQ_INK}`, background: HFQ_INK, color: '#fff' }}><HFIcon name="plus" size={12}/></button>
              </div>
              <div className="hf-divider" style={{ margin: '14px 0' }}></div>
              {[
                ["2 × Regular", "₹1,000"],
                ["Booking fee", "₹100"],
                ["GST 18%", "₹18"],
              ].map(([l, v]) => (
                <div key={l} className="hf-row" style={{ padding: '3px 0' }}>
                  <span className="hf-mono" style={{ fontSize: 12, color: HFQ_INK_3, flex: 1 }}>{l}</span>
                  <span className="hf-mono" style={{ fontSize: 12 }}>{v}</span>
                </div>
              ))}
              <div className="hf-row" style={{ marginTop: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>Total</span>
                <span className="hf-mono" style={{ fontSize: 16, fontWeight: 600 }}>₹1,118</span>
              </div>
              <button className="hf-btn accent" style={{ width: '100%', marginTop: 14, padding: 14, borderRadius: 10 }}>
                Continue to checkout <HFIcon name="arrowR" size={14}/>
              </button>
              <div className="hf-row" style={{ gap: 12, justifyContent: 'center', marginTop: 10, fontSize: 11, color: HFQ_INK_3 }}>
                <span className="hf-row" style={{ gap: 4 }}><HFIcon name="zap" size={12}/> holds 8 min</span>
                <span>·</span>
                <span>↺ refundable 48h</span>
              </div>
            </div>

            <div className="hf-card" style={{ borderRadius: 12, padding: 14 }}>
              <div className="hf-row" style={{ gap: 10, alignItems: 'center' }}>
                <HFAvatar src={P.face_6} size={36}/>
                <div className="hf-col" style={{ flex: 1, gap: 1 }}>
                  <div className="hf-row" style={{ gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Rishabh Mehta</span>
                    <span className="hf-chip" style={{ padding: '1px 6px', fontSize: 9, background: HFQ_ACC_2, color: HFQ_ACC, borderColor: 'transparent' }}>✓</span>
                  </div>
                  <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>23 events · ★ 4.8</span>
                </div>
                <button className="hf-btn xs">Follow</button>
              </div>
            </div>

            <div className="hf-card" style={{ borderRadius: 12, padding: 14 }}>
              <div className="lbl" style={{ marginBottom: 8 }}>Going (8)</div>
              <div className="hf-row" style={{ gap: 8 }}>
                <div className="hf-stack">
                  {[P.face_1, P.face_2, P.face_3, P.face_7, P.face_8].map((f, i) => <HFAvatar key={i} src={f} size={26}/>)}
                </div>
                <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>+ 3 friends</span>
              </div>
              <button className="hf-btn xs" style={{ width: '100%', marginTop: 10 }}>Invite friends</button>
            </div>
          </div>
        </div>
      </div>
    </HFBrowser>
  );
}

// ── Desktop checkout ──
function QuietDeskCheckout() {
  const P = HF_PHOTOS;
  return (
    <HFBrowser url="ticketiv.com/checkout/RG7352" tabs={["Checkout · Ticketiv"]}>
      <div className="hf-quiet hf-consumer-desk" style={{ background: '#fafafa', color: HFQ_INK, minHeight: '100%' }}>
        {/* Top nav */}
        <div style={{ borderBottom: `1px solid ${HFQ_LINE}`, background: '#fff', padding: '12px 40px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="hf-row" style={{ gap: 8 }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: HFQ_ACC, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>T</div>
            <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.02em' }}>ticketiv</span>
          </div>
          <span style={{ width: 1, height: 16, background: HFQ_LINE }}></span>
          <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>‹ back to event</span>
          <span style={{ flex: 1 }}></span>
          {/* Stepper */}
          <div className="hf-row" style={{ gap: 8 }}>
            {['Cart', 'Details', 'Payment', 'Done'].map((s, i) => (
              <React.Fragment key={s}>
                <span style={{
                  width: 22, height: 22, borderRadius: 999,
                  background: i <= 1 ? HFQ_ACC : '#fff',
                  border: i > 1 ? `1px solid ${HFQ_LINE_2}` : 0,
                  color: i <= 1 ? '#fff' : HFQ_INK_3,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                  fontFamily: 'var(--hf-font-mono)',
                }}>{i+1}</span>
                <span className="hf-mono" style={{ fontSize: 11, color: i === 1 ? HFQ_INK : HFQ_INK_3, fontWeight: i === 1 ? 600 : 400 }}>{s.toUpperCase()}</span>
                {i < 3 && <span style={{ width: 24, height: 1, background: HFQ_LINE }}></span>}
              </React.Fragment>
            ))}
          </div>
          <span style={{ width: 1, height: 16, background: HFQ_LINE }}></span>
          <span className="hf-mono" style={{ fontSize: 11, color: HFQ_ACC, fontWeight: 600 }}>HOLDS FOR 8:42</span>
        </div>

        {/* Body */}
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 40px', display: 'grid', gridTemplateColumns: '1fr 360px', gap: 32 }}>
          {/* Form column */}
          <div className="hf-col" style={{ gap: 18 }}>
            {/* Buyer */}
            <div className="hf-card" style={{ padding: 20, borderRadius: 12 }}>
              <div className="hf-between" style={{ marginBottom: 14 }}>
                <div className="h2" style={{ fontSize: 18 }}>Buyer details</div>
                <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>1 of 3</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="hf-col" style={{ gap: 4 }}>
                  <span className="lbl">Full name</span>
                  <div style={{ padding: '10px 12px', border: `1px solid ${HFQ_ACC}`, borderRadius: 8, fontSize: 14, fontWeight: 500, background: '#fff', boxShadow: `0 0 0 3px ${HFQ_ACC_2}` }}>Prateek Sharma<span style={{ width: 1.5, height: 14, background: HFQ_ACC, display: 'inline-block', marginLeft: 1, verticalAlign: 'middle' }}></span></div>
                </div>
                <div className="hf-col" style={{ gap: 4 }}>
                  <span className="lbl">Email</span>
                  <div style={{ padding: '10px 12px', border: `1px solid ${HFQ_LINE_2}`, borderRadius: 8, fontSize: 14, fontWeight: 500, background: '#fff' }}>prateek@mail.in</div>
                </div>
                <div className="hf-col" style={{ gap: 4 }}>
                  <span className="lbl">Phone (+91)</span>
                  <div style={{ padding: '10px 12px', border: `1px solid ${HFQ_LINE_2}`, borderRadius: 8, fontSize: 14, fontWeight: 500, background: '#fff' }}>98xxxxxxxx</div>
                </div>
                <div className="hf-col" style={{ gap: 4 }}>
                  <span className="lbl">Country</span>
                  <div style={{ padding: '10px 12px', border: `1px solid ${HFQ_LINE_2}`, borderRadius: 8, fontSize: 14, fontWeight: 500, background: '#fff', display: 'flex', alignItems: 'center' }}>
                    India
                    <span style={{ flex: 1 }}></span>
                    <HFIcon name="chevD" size={14} style={{ color: HFQ_INK_3 }}/>
                  </div>
                </div>
              </div>
            </div>

            {/* Attendees */}
            <div className="hf-card" style={{ padding: 20, borderRadius: 12 }}>
              <div className="hf-between" style={{ marginBottom: 14 }}>
                <div className="h2" style={{ fontSize: 18 }}>Attendee details <span className="hf-mono" style={{ fontSize: 12, fontWeight: 500, color: HFQ_INK_3 }}>· 2 attendees</span></div>
                <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>2 of 3</span>
              </div>

              {/* Attendee 1 */}
              <div style={{ background: HFQ_ACC_2, border: `1px solid ${HFQ_ACC}`, borderRadius: 10, padding: 14, marginBottom: 10 }}>
                <div className="hf-row" style={{ marginBottom: 8 }}>
                  <span className="hf-row" style={{ gap: 6 }}>
                    <span style={{ width: 20, height: 20, borderRadius: 6, background: HFQ_ACC, color: '#fff', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--hf-font-mono)' }}>1</span>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>Ticket 1 · Seat C-4 · Regular</span>
                  </span>
                  <span style={{ flex: 1 }}></span>
                  <span className="hf-mono" style={{ fontSize: 11, color: HFQ_ACC, fontWeight: 600 }}><HFIcon name="check" size={11} stroke={3}/> SAME AS BUYER</span>
                </div>
                <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>Prateek Sharma · prateek@mail.in</span>
              </div>

              {/* Attendee 2 */}
              <div style={{ border: `1px solid ${HFQ_LINE}`, borderRadius: 10, padding: 14 }}>
                <div className="hf-row" style={{ marginBottom: 12 }}>
                  <span className="hf-row" style={{ gap: 6 }}>
                    <span style={{ width: 20, height: 20, borderRadius: 6, background: HFQ_INK, color: '#fff', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--hf-font-mono)' }}>2</span>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>Ticket 2 · Seat C-5 · Regular</span>
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    ["Name", "Riya M.", false],
                    ["Phone", "+91 99xxxxxxxx", false],
                    ["T-shirt size · custom_field", "M", true],
                    ["Dietary (optional)", "—", false],
                  ].map(([l, v, dropdown], i) => (
                    <div key={i} className="hf-col" style={{ gap: 4 }}>
                      <span className="lbl">{l}</span>
                      <div style={{ padding: '8px 12px', border: `1px solid ${HFQ_LINE_2}`, borderRadius: 8, fontSize: 13, fontWeight: 500, background: '#fff', display: 'flex', alignItems: 'center' }}>
                        {v}
                        {dropdown && <><span style={{ flex: 1 }}></span><HFIcon name="chevD" size={12} style={{ color: HFQ_INK_3 }}/></>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Promo */}
            <div className="hf-card" style={{ padding: 20, borderRadius: 12 }}>
              <div className="hf-between" style={{ marginBottom: 12 }}>
                <div className="h2" style={{ fontSize: 18 }}>Promo code</div>
                <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>3 of 3</span>
              </div>
              <div className="hf-row" style={{ gap: 8 }}>
                <div style={{ flex: 1, padding: '10px 12px', border: `1px solid ${HFQ_LINE_2}`, borderRadius: 8, fontSize: 14, fontFamily: 'var(--hf-font-mono)', fontWeight: 600, background: '#fff' }}>WELCOME10</div>
                <button className="hf-btn">Apply</button>
              </div>
              <div style={{ marginTop: 10, padding: '10px 12px', background: HFQ_ACC_2, border: `1px solid ${HFQ_ACC}`, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 24, height: 24, borderRadius: 999, background: HFQ_ACC, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><HFIcon name="check" size={12} stroke={3}/></div>
                <div className="hf-col" style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>WELCOME10 applied</span>
                  <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>10% off · saved ₹100</span>
                </div>
                <span style={{ fontSize: 12, color: HFQ_ACC, fontWeight: 600 }}>Remove</span>
              </div>
            </div>

            <div className="hf-row" style={{ gap: 8 }}>
              <button className="hf-btn" style={{ flex: 1 }}>Back</button>
              <button className="hf-btn accent" style={{ flex: 2 }}>
                Continue to payment <HFIcon name="arrowR" size={14}/>
              </button>
            </div>
          </div>

          {/* Sticky summary */}
          <div className="hf-card" style={{ padding: 18, borderRadius: 12, alignSelf: 'flex-start', position: 'sticky', top: 24 }}>
            <div className="hf-row" style={{ gap: 10, marginBottom: 12 }}>
              <div style={{ width: 56, height: 56, borderRadius: 10, overflow: 'hidden' }}>
                <HFPhoto src={P.dj_set} h={56}/>
              </div>
              <div className="hf-col" style={{ flex: 1, gap: 2 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>Tribal Tales</span>
                <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>WED 30 AUG · 15:50</span>
                <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>Seats C-4, C-5</span>
              </div>
            </div>

            <div className="hf-divider"></div>

            <div className="hf-col" style={{ gap: 4, padding: '12px 0' }}>
              {[
                ["2 × Regular", "₹1,000"],
                ["Booking fee", "₹100"],
                ["GST 18%", "₹18"],
                ["WELCOME10", "−₹100", HFQ_ACC],
              ].map(([l, v, c]) => (
                <div key={l} className="hf-row" style={{ padding: '3px 0' }}>
                  <span className="hf-mono" style={{ fontSize: 12, color: HFQ_INK_3, flex: 1 }}>{l}</span>
                  <span className="hf-mono" style={{ fontSize: 12, color: c || HFQ_INK }}>{v}</span>
                </div>
              ))}
            </div>

            <div className="hf-divider"></div>

            <div className="hf-row" style={{ marginTop: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>Total</span>
              <span className="hf-mono" style={{ fontSize: 20, fontWeight: 600 }}>₹1,018</span>
            </div>

            <div style={{ marginTop: 14, padding: 12, background: '#fafafa', borderRadius: 8 }}>
              <div className="hf-row" style={{ gap: 6, color: HFQ_ACC, fontSize: 11, fontWeight: 600 }}>
                <HFIcon name="zap" size={12}/>
                <span>Your seats are held for 8:42</span>
              </div>
            </div>

            <div className="hf-row" style={{ gap: 8, marginTop: 12, color: HFQ_INK_3, fontSize: 10, fontFamily: 'var(--hf-font-mono)' }}>
              <HFIcon name="check" size={12}/>
              <span>Free transfer · partial refund · QR + wallet</span>
            </div>
          </div>
        </div>
      </div>
    </HFBrowser>
  );
}

window.QuietDeskEvent = QuietDeskEvent;
window.QuietDeskCheckout = QuietDeskCheckout;
