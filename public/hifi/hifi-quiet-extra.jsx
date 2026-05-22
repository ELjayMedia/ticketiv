// QUIET direction · extended mobile consumer screens.
// Search, Checkout, Order confirmation, My tickets, Transfer.

// ── Search results ──
function QuietSearch() {
  const P = HF_PHOTOS;
  return (
    <HFPhone className="hf-quiet">
      <div className="hf-scroll">
        <div style={{ height: 56 }}></div>

        {/* Search bar */}
        <div style={{ padding: '8px 20px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button style={{ background: 'transparent', border: 0, color: HFQ_INK, cursor: 'pointer' }}><HFIcon name="chevL" size={22}/></button>
          <div style={{ flex: 1, background: '#f3f1ee', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <HFIcon name="search" size={16}/>
            <span style={{ fontSize: 14, fontWeight: 500 }}>djs &amp; live music</span>
            <span style={{ width: 1.5, height: 14, background: HFQ_ACC, marginLeft: 1, animation: 'hf-blink 1s infinite' }}></span>
            <span style={{ flex: 1 }}></span>
            <HFIcon name="close" size={14} style={{ color: HFQ_INK_3 }}/>
          </div>
        </div>

        {/* Active filters */}
        <div className="hf-scrollx" style={{ padding: '0 20px 14px', gap: 6 }}>
          <span className="hf-chip" style={{ background: HFQ_ACC_2, borderColor: 'transparent', color: HFQ_ACC, fontWeight: 600 }}>Music · 142 <HFIcon name="close" size={10}/></span>
          <span className="hf-chip" style={{ background: HFQ_ACC_2, borderColor: 'transparent', color: HFQ_ACC, fontWeight: 600 }}>This weekend <HFIcon name="close" size={10}/></span>
          <span className="hf-chip" style={{ background: HFQ_ACC_2, borderColor: 'transparent', color: HFQ_ACC, fontWeight: 600 }}>under ₹1k <HFIcon name="close" size={10}/></span>
          <span className="hf-chip"><HFIcon name="plus" size={12}/> Add filter</span>
        </div>

        {/* Result count */}
        <div style={{ padding: '0 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>14 results · 4 venues</span>
          <span className="hf-mono" style={{ fontSize: 11, color: HFQ_ACC, fontWeight: 600 }}>Sort: Relevance ▾</span>
        </div>

        {/* Result rows */}
        <div style={{ padding: '0 20px' }}>
          {[
            { p: P.dj_console, t: "Tribal Tales", sub: "Sunset set · DJ Fun", time: "Wed 30 · 20:00", venue: "Cafe Natarani", price: 500, dist: "12 km", tag: "5 left", hl: true },
            { p: P.crowd_lights, t: "Indie Showcase", sub: "5-band live", time: "Sat 26 · 22:00", venue: "The Loft", price: 800, dist: "8 km", tag: "few left", hl: false },
            { p: P.fest_river, t: "Sunset Set", sub: "DJ night by river", time: "Sat 23 · 18:00", venue: "Riverside", price: 600, dist: "15 km", tag: "new", hl: false },
            { p: P.guitar_solo, t: "Acoustic Hour", sub: "Folk by candlelight", time: "Tue 29 · 19:00", venue: "BlueSpace", price: 0, dist: "4 km", tag: "free", hl: false },
            { p: P.band_stage, t: "Open Mic Friday", sub: "Singer-songwriters", time: "Fri 25 · 20:00", venue: "Studio X", price: 250, dist: "6 km", tag: null, hl: false },
          ].map((e, i, arr) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '14px 0', borderBottom: i < arr.length - 1 ? `1px solid ${HFQ_LINE}` : 0 }}>
              <div style={{ width: 76, height: 76, flexShrink: 0, borderRadius: 10, overflow: 'hidden', position: 'relative' }}>
                <HFPhoto src={e.p} h={76}/>
                {e.hl && <span style={{ position: 'absolute', top: 6, left: 6, padding: '1px 5px', fontSize: 9, fontWeight: 700, background: '#fff', borderRadius: 4 }}>★</span>}
              </div>
              <div className="hf-col" style={{ flex: 1, gap: 3, minWidth: 0 }}>
                <div className="hf-row" style={{ gap: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: '-0.01em' }} className="hf-truncate">
                    {e.hl && <mark style={{ background: HFQ_ACC_2, color: HFQ_ACC, padding: '1px 2px', borderRadius: 2 }}>DJ</mark>}{e.hl ? ' ' : ''}{e.t}
                  </span>
                </div>
                <div className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>{e.sub}</div>
                <div className="hf-row" style={{ gap: 4, marginTop: 2, fontSize: 11, color: HFQ_INK_3 }}>
                  <span className="hf-mono">{e.time}</span>
                  <span>·</span>
                  <span className="hf-mono">{e.venue}</span>
                </div>
                <div className="hf-row" style={{ marginTop: 4, gap: 6 }}>
                  {e.tag && <span className="hf-chip" style={{ fontSize: 10, padding: '1px 6px', background: e.tag === 'free' ? HFQ_ACC_2 : '#fdf0ec', color: e.tag === 'free' ? HFQ_ACC : '#c1422b', borderColor: 'transparent', fontWeight: 600 }}>{e.tag}</span>}
                  <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>· {e.dist}</span>
                </div>
              </div>
              <div className="hf-col" style={{ alignItems: 'flex-end', gap: 6 }}>
                <span className="hf-mono" style={{ fontSize: 13, fontWeight: 600 }}>
                  {e.price === 0 ? 'Free' : `₹${e.price}`}
                </span>
                <button className="hf-btn xs" style={{ background: HFQ_INK, color: '#fff', borderColor: HFQ_INK }}>Book</button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: '16px 20px' }}>
          <div className="hf-divider"></div>
          <div className="lbl" style={{ marginTop: 14 }}>Or browse by</div>
          <div className="hf-row" style={{ gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <span className="hf-chip">@djfun</span>
            <span className="hf-chip">@a.khan</span>
            <span className="hf-chip">@theloft</span>
            <span className="hf-chip">Cafe Natarani</span>
            <span className="hf-chip">Riverside Park</span>
          </div>
        </div>

        <div style={{ height: 30 }}></div>
      </div>
    </HFPhone>
  );
}

// ── Checkout (dense single-page) ──
function QuietCheckout() {
  const P = HF_PHOTOS;
  return (
    <HFPhone className="hf-quiet">
      <div className="hf-scroll">
        <div style={{ height: 56 }}></div>

        {/* Top */}
        <div style={{ padding: '8px 20px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button style={{ background: 'transparent', border: 0, color: HFQ_INK, cursor: 'pointer' }}><HFIcon name="close" size={22}/></button>
          <div className="hf-col" style={{ flex: 1, gap: 0 }}>
            <span className="h3" style={{ fontSize: 15 }}>Checkout</span>
            <span className="hf-mono" style={{ fontSize: 10, color: HFQ_ACC, fontWeight: 600 }}>HOLDS FOR 8:42</span>
          </div>
          <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>1/1</span>
        </div>

        {/* Event ribbon */}
        <div style={{ margin: '0 20px 18px', padding: 12, background: HFQ_INK, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 6, overflow: 'hidden' }}>
            <HFPhoto src={P.dj_set} h={40}/>
          </div>
          <div className="hf-col" style={{ flex: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Tribal Tales</span>
            <span className="hf-mono" style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>WED 30 AUG · CAFE NATARANI</span>
          </div>
          <HFIcon name="chevR" size={16} style={{ color: 'rgba(255,255,255,0.5)' }}/>
        </div>

        {/* Ticket type */}
        <div style={{ padding: '0 20px 16px' }}>
          <div className="lbl" style={{ marginBottom: 8 }}>Ticket type</div>
          <div className="hf-col" style={{ gap: 6 }}>
            {[
              { name: "Regular", price: 500, sub: "5 left at this price", on: true },
              { name: "Premium", price: 1200, sub: "front rows · 18 left", on: false, en: true },
              { name: "VIP", price: 2500, sub: "meet & greet · sold out", on: false, en: false },
            ].map((t, i) => (
              <div key={i} className="hf-card" style={{
                padding: 12,
                borderRadius: 10,
                borderColor: t.on ? HFQ_ACC : HFQ_LINE,
                background: t.on ? HFQ_ACC_2 : '#fff',
                opacity: t.en === false ? 0.5 : 1,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{
                  width: 18, height: 18, borderRadius: 999,
                  border: `2px solid ${t.on ? HFQ_ACC : HFQ_LINE_2}`,
                  background: '#fff',
                  position: 'relative',
                  flexShrink: 0,
                }}>
                  {t.on && <span style={{ position: 'absolute', inset: 3, borderRadius: 999, background: HFQ_ACC }}></span>}
                </span>
                <div className="hf-col" style={{ flex: 1 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{t.name}</span>
                  <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>{t.sub}</span>
                </div>
                <span className="hf-mono" style={{ fontSize: 14, fontWeight: 600, textDecoration: t.en === false ? 'line-through' : 'none' }}>₹{t.price}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quantity */}
        <div style={{ padding: '0 20px 16px' }}>
          <div className="hf-card" style={{ padding: '10px 12px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>Quantity</span>
            <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>max 4</span>
            <button style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${HFQ_LINE_2}`, background: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><HFIcon name="minus" size={14}/></button>
            <span className="hf-mono" style={{ fontSize: 16, fontWeight: 600, minWidth: 20, textAlign: 'center' }}>2</span>
            <button style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${HFQ_INK}`, background: HFQ_INK, color: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><HFIcon name="plus" size={14}/></button>
          </div>
        </div>

        {/* Promo */}
        <div style={{ padding: '0 20px 16px' }}>
          <div className="hf-card" style={{ padding: '10px 12px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10, borderColor: HFQ_ACC_2, background: '#fbf7ff' }}>
            <div style={{ width: 28, height: 28, borderRadius: 999, background: HFQ_ACC, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>%</div>
            <div className="hf-col" style={{ flex: 1 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>WELCOME10 applied</span>
              <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>10% off · saved ₹100</span>
            </div>
            <span style={{ color: HFQ_ACC, fontSize: 12, fontWeight: 600 }}>Remove</span>
          </div>
        </div>

        {/* Payment */}
        <div style={{ padding: '0 20px 16px' }}>
          <div className="lbl" style={{ marginBottom: 8 }}>Pay with</div>
          <div className="hf-col" style={{ gap: 6 }}>
            <div className="hf-card" style={{ padding: 12, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12, borderColor: HFQ_ACC }}>
              <span style={{ width: 16, height: 16, borderRadius: 999, border: `2px solid ${HFQ_ACC}`, position: 'relative', flexShrink: 0 }}>
                <span style={{ position: 'absolute', inset: 2, borderRadius: 999, background: HFQ_ACC }}></span>
              </span>
              <div style={{ width: 40, height: 26, background: '#1a1f71', borderRadius: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em' }}>VISA</div>
              <div className="hf-col" style={{ flex: 1 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>•••• •••• •••• 4242</span>
                <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>Exp 12/27</span>
              </div>
            </div>
            <div className="hf-card" style={{ padding: 12, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 16, height: 16, borderRadius: 999, border: `2px solid ${HFQ_LINE_2}`, flexShrink: 0 }}></span>
              <div style={{ width: 40, height: 26, background: 'linear-gradient(135deg, #ff5f00, #f79e1b)', borderRadius: 4 }}></div>
              <div className="hf-col" style={{ flex: 1 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>UPI · Paystack</span>
                <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>scan or paste link</span>
              </div>
            </div>
            <div className="hf-card" style={{ padding: 12, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 16, height: 16, borderRadius: 999, border: `2px solid ${HFQ_LINE_2}`, flexShrink: 0 }}></span>
              <HFIcon name="plus" size={20}/>
              <span style={{ flex: 1, fontSize: 13, color: HFQ_INK_3 }}>Add new payment method</span>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div style={{ padding: '0 20px 16px' }}>
          <div className="hf-card" style={{ padding: 14, borderRadius: 10, background: '#fafafa' }}>
            {[
              ["2 × Regular", "₹1,000"],
              ["Booking fee", "₹100"],
              ["GST 18%", "₹18"],
              ["WELCOME10", "−₹100"],
            ].map(([l, v]) => (
              <div key={l} className="hf-row" style={{ padding: '4px 0' }}>
                <span className="hf-mono" style={{ fontSize: 12, color: HFQ_INK_3, flex: 1 }}>{l}</span>
                <span className="hf-mono" style={{ fontSize: 12, color: l === 'WELCOME10' ? HFQ_ACC : HFQ_INK }}>{v}</span>
              </div>
            ))}
            <div className="hf-divider" style={{ margin: '8px 0' }}></div>
            <div className="hf-row">
              <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>Total</span>
              <span className="hf-mono" style={{ fontSize: 16, fontWeight: 600 }}>₹1,018</span>
            </div>
          </div>
        </div>

        <div style={{ padding: '0 20px 14px', display: 'flex', alignItems: 'center', gap: 6, color: HFQ_INK_3 }}>
          <HFIcon name="check" size={14}/>
          <span style={{ fontSize: 11 }}>I accept refund &amp; cancellation policy</span>
        </div>

        <div style={{ height: 80 }}></div>
      </div>

      {/* Sticky pay */}
      <div style={{ borderTop: `1px solid ${HFQ_LINE}`, background: '#fff', padding: '14px 20px 28px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="hf-col">
          <span className="lbl">Total</span>
          <span className="hf-mono" style={{ fontSize: 18, fontWeight: 600 }}>₹1,018</span>
        </div>
        <button className="hf-btn accent" style={{ flex: 1, padding: 14, fontSize: 14, borderRadius: 10 }}>
          Pay ₹1,018 <HFIcon name="arrowR" size={16}/>
        </button>
      </div>
    </HFPhone>
  );
}

// ── Order confirmation ──
function QuietConfirm() {
  const P = HF_PHOTOS;
  return (
    <HFPhone className="hf-quiet">
      <div className="hf-scroll" style={{ background: '#fafafa' }}>
        <div style={{ height: 56 }}></div>

        {/* Top close + share */}
        <div style={{ padding: '8px 20px 24px', display: 'flex', alignItems: 'center' }}>
          <span className="hf-grow"></span>
          <button style={{ background: 'transparent', border: 0, color: HFQ_INK, cursor: 'pointer' }}><HFIcon name="close" size={22}/></button>
        </div>

        {/* Success */}
        <div style={{ padding: '0 20px 24px', textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: 999,
            background: HFQ_ACC_2, color: HFQ_ACC,
            margin: '0 auto 18px',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <HFIcon name="check" size={36} stroke={2.4}/>
          </div>
          <div className="h1" style={{ fontSize: 26 }}>You're going.</div>
          <div className="hf-mono" style={{ fontSize: 12, color: HFQ_INK_3, marginTop: 8 }}>2 TICKETS · ORDER #RG7352</div>
        </div>

        {/* Event card */}
        <div style={{ padding: '0 20px 16px' }}>
          <div className="hf-card" style={{ borderRadius: 14, overflow: 'hidden' }}>
            <HFPhoto src={P.dj_set} h={140} dim>
              <div style={{ marginTop: 'auto' }}>
                <div className="h2" style={{ color: '#fff', fontSize: 22 }}>Tribal Tales</div>
                <div className="hf-mono" style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 4 }}>SUNSET SET BY DJ FUN</div>
              </div>
            </HFPhoto>
            <div style={{ padding: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                <div className="hf-col">
                  <span className="lbl">When</span>
                  <span style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>30 Aug</span>
                  <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>15:50</span>
                </div>
                <div className="hf-col">
                  <span className="lbl">Seats</span>
                  <span className="hf-mono" style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>C-4, C-5</span>
                  <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>Regular</span>
                </div>
                <div className="hf-col">
                  <span className="lbl">Total</span>
                  <span className="hf-mono" style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>₹1,018</span>
                  <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>Visa ••42</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Next steps */}
        <div style={{ padding: '0 20px 16px' }}>
          <div className="lbl" style={{ marginBottom: 8 }}>Next</div>
          <div className="hf-col" style={{ gap: 6 }}>
            {[
              ["wallet", "Add to Apple Wallet", "Show ticket without unlocking"],
              ["cal",    "Add to calendar",     "Reminder 3h before"],
              ["share",  "Invite friends",      "5 friends already going"],
            ].map(([icon, t, sub]) => (
              <div key={t} className="hf-card" style={{ padding: 12, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 999, background: HFQ_ACC_2, color: HFQ_ACC, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <HFIcon name={icon} size={16}/>
                </div>
                <div className="hf-col" style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{t}</span>
                  <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>{sub}</span>
                </div>
                <HFIcon name="chevR" size={16}/>
              </div>
            ))}
          </div>
        </div>

        {/* Receipt */}
        <div style={{ padding: '0 20px 30px' }}>
          <div className="hf-row" style={{ gap: 6, color: HFQ_INK_3, fontSize: 11, fontFamily: 'var(--hf-font-mono)', justifyContent: 'center' }}>
            <HFIcon name="fileText" size={12}/>
            Receipt sent to prateek@mail.in
          </div>
        </div>

        <div style={{ height: 80 }}></div>
      </div>

      <div style={{ borderTop: `1px solid ${HFQ_LINE}`, background: '#fff', padding: '14px 20px 28px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="hf-btn" style={{ flex: 1, padding: 14, borderRadius: 10 }}>Done</button>
        <button className="hf-btn accent" style={{ flex: 1, padding: 14, borderRadius: 10 }}>
          View ticket <HFIcon name="arrowR" size={16}/>
        </button>
      </div>
    </HFPhone>
  );
}

// ── My tickets list ──
function QuietMyTickets() {
  const P = HF_PHOTOS;
  return (
    <HFPhone className="hf-quiet">
      <div className="hf-scroll">
        <div style={{ height: 56 }}></div>

        {/* Top */}
        <div style={{ padding: '8px 20px 14px', display: 'flex', alignItems: 'flex-end', gap: 10 }}>
          <div className="hf-col" style={{ flex: 1 }}>
            <div className="lbl">My tickets</div>
            <div className="h1" style={{ marginTop: 2 }}>Upcoming · 4</div>
          </div>
          <button className="hf-btn ghost" style={{ padding: 8 }}><HFIcon name="search" size={20}/></button>
          <button className="hf-btn ghost" style={{ padding: 8 }}><HFIcon name="download" size={20}/></button>
        </div>

        {/* Segmented */}
        <div style={{ padding: '0 20px 18px' }}>
          <div className="hf-seg" style={{ width: '100%', display: 'flex' }}>
            <span className="on" style={{ flex: 1, textAlign: 'center' }}>Upcoming</span>
            <span style={{ flex: 1, textAlign: 'center' }}>Past · 12</span>
            <span style={{ flex: 1, textAlign: 'center' }}>Transfers · 1</span>
          </div>
        </div>

        {/* Featured upcoming ticket */}
        <div style={{ padding: '0 20px 16px' }}>
          <div className="hf-card" style={{ borderRadius: 14, overflow: 'hidden', borderColor: HFQ_ACC }}>
            <div style={{ background: HFQ_ACC_2, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="hf-live-dot"></span>
              <span className="hf-mono" style={{ fontSize: 11, color: HFQ_ACC, fontWeight: 600 }}>IN 4 DAYS</span>
              <span className="hf-grow"></span>
              <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>#RG7352</span>
            </div>
            <div style={{ padding: 14 }}>
              <div className="hf-row" style={{ gap: 12 }}>
                <div style={{ width: 56, height: 56, borderRadius: 10, overflow: 'hidden' }}>
                  <HFPhoto src={P.dj_set} h={56}/>
                </div>
                <div className="hf-col" style={{ flex: 1 }}>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>Tribal Tales</span>
                  <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>WED 30 AUG · 15:50</span>
                  <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>Cafe Natarani · seats C-4, C-5</span>
                </div>
              </div>
              <div className="hf-divider" style={{ margin: '12px 0' }}></div>
              <div className="hf-row" style={{ gap: 6 }}>
                <button className="hf-btn xs" style={{ background: HFQ_INK, color: '#fff', borderColor: HFQ_INK, flex: 1 }}><HFIcon name="qr" size={14}/> Show QR</button>
                <button className="hf-btn xs"><HFIcon name="arrowUR" size={14}/></button>
                <button className="hf-btn xs"><HFIcon name="copy" size={14}/></button>
                <button className="hf-btn xs"><HFIcon name="cal" size={14}/></button>
              </div>
            </div>
          </div>
        </div>

        {/* Other upcoming */}
        {[
          { p: P.singer_red, t: "Stand-up · A.Khan", d: "Fri 25 Jul · 21:30", v: "Comedy Club", n: 1, status: "issued" },
          { p: P.crowd_lights, t: "Indie Showcase", d: "Sat 26 Jul · 22:00", v: "The Loft", n: 1, status: "issued" },
          { p: P.fest_river, t: "Sunset Set", d: "Sat 23 Aug · 18:00", v: "Riverside", n: 2, status: "transferred" },
        ].map((e, i) => (
          <div key={i} style={{ padding: '0 20px', marginBottom: 8 }}>
            <div className="hf-card" style={{ padding: 12, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                <HFPhoto src={e.p} h={48}/>
              </div>
              <div className="hf-col" style={{ flex: 1, gap: 2 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{e.t}</span>
                <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>{e.d} · {e.v}</span>
                <div className="hf-row" style={{ gap: 4, marginTop: 2 }}>
                  <span className="hf-chip" style={{ padding: '1px 6px', fontSize: 9, background: e.status === 'transferred' ? '#fdf0ec' : HFQ_ACC_2, color: e.status === 'transferred' ? '#c1422b' : HFQ_ACC, borderColor: 'transparent', fontWeight: 600 }}>{e.status === 'transferred' ? '↗ Transferred' : `${e.n} ticket${e.n > 1 ? 's' : ''}`}</span>
                </div>
              </div>
              <HFIcon name="chevR" size={16} style={{ color: HFQ_INK_3 }}/>
            </div>
          </div>
        ))}

        {/* Inbound transfer */}
        <div style={{ padding: '14px 20px 0' }}>
          <div className="lbl" style={{ marginBottom: 8 }}>Action needed</div>
          <div className="hf-card" style={{ padding: 14, borderRadius: 10, borderColor: '#fde2c1', background: '#fdf6ed' }}>
            <div className="hf-row" style={{ gap: 12 }}>
              <HFAvatar src={P.face_3} size={36}/>
              <div className="hf-col" style={{ flex: 1 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Salman sent you a ticket</span>
                <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>Indie Showcase · expires in 22h</span>
              </div>
            </div>
            <div className="hf-row" style={{ gap: 6, marginTop: 12 }}>
              <button className="hf-btn xs" style={{ flex: 1 }}>Decline</button>
              <button className="hf-btn xs accent" style={{ flex: 1 }}>Accept transfer</button>
            </div>
          </div>
        </div>

        <div style={{ height: 100 }}></div>
      </div>

      <div className="hf-tabbar">
        <div className="tab"><HFIcon name="spark" size={20}/>Discover</div>
        <div className="tab"><HFIcon name="search" size={20}/>Search</div>
        <div className="tab on"><HFIcon name="ticket" size={20} stroke={2}/>Tickets</div>
        <div className="tab"><HFIcon name="user" size={20}/>You</div>
      </div>
    </HFPhone>
  );
}

// ── Transfer flow ──
function QuietTransfer() {
  const P = HF_PHOTOS;
  return (
    <HFPhone className="hf-quiet">
      <div className="hf-scroll">
        <div style={{ height: 56 }}></div>

        {/* Top */}
        <div style={{ padding: '8px 20px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button style={{ background: 'transparent', border: 0, color: HFQ_INK, cursor: 'pointer' }}><HFIcon name="chevL" size={22}/></button>
          <div className="hf-col" style={{ flex: 1, gap: 0 }}>
            <span className="h3" style={{ fontSize: 15 }}>Transfer ticket</span>
            <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>FREE · NO FEE</span>
          </div>
        </div>

        {/* Selected ticket */}
        <div style={{ padding: '0 20px 18px' }}>
          <div className="hf-card" style={{ padding: 12, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden' }}>
              <HFPhoto src={P.dj_set} h={44}/>
            </div>
            <div className="hf-col" style={{ flex: 1 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Tribal Tales · Seat C-5</span>
              <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>WED 30 AUG · REGULAR · ₹500</span>
            </div>
          </div>
        </div>

        {/* Recipient */}
        <div style={{ padding: '0 20px 8px' }}>
          <div className="lbl" style={{ marginBottom: 8 }}>Send to</div>
          <div style={{ background: '#fff', border: `1px solid ${HFQ_LINE}`, borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <HFIcon name="search" size={16} style={{ color: HFQ_INK_3 }}/>
            <span style={{ fontSize: 14, fontWeight: 500, color: HFQ_INK_3 }}>@handle, name, or phone</span>
          </div>
        </div>

        {/* Friends list */}
        <div style={{ padding: '14px 20px 0' }}>
          <div className="hf-between" style={{ marginBottom: 8 }}>
            <span className="lbl">Recent</span>
            <span className="hf-mono" style={{ fontSize: 11, color: HFQ_ACC, fontWeight: 600 }}>All friends ›</span>
          </div>
          {[
            { src: P.face_2, n: "Farah Khan", h: "@farah · 2 mutual events", on: true },
            { src: P.face_3, n: "Salman Khan", h: "@salman · sent you a ticket once", on: false },
            { src: P.face_4, n: "Vicky Kausal", h: "@vicky · also going", on: false, going: true },
            { src: P.face_5, n: "Amir Khan", h: "@amir", on: false },
            { src: P.face_6, n: "Rishi Kapoor", h: "@rishi", on: false },
          ].map((f, i, arr) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < arr.length - 1 ? `1px solid ${HFQ_LINE}` : 0 }}>
              <HFAvatar src={f.src} size={36}/>
              <div className="hf-col" style={{ flex: 1 }}>
                <div className="hf-row" style={{ gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{f.n}</span>
                  {f.going && <span className="hf-chip" style={{ padding: '1px 6px', fontSize: 9, background: HFQ_ACC_2, color: HFQ_ACC, borderColor: 'transparent', fontWeight: 600 }}>going</span>}
                </div>
                <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>{f.h}</span>
              </div>
              <span style={{
                width: 22, height: 22, borderRadius: 999,
                border: `2px solid ${f.on ? HFQ_ACC : HFQ_LINE_2}`,
                background: f.on ? HFQ_ACC : '#fff',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                flexShrink: 0,
              }}>
                {f.on && <HFIcon name="check" size={12} stroke={3}/>}
              </span>
            </div>
          ))}
        </div>

        {/* Note */}
        <div style={{ padding: '20px 20px 0' }}>
          <div className="lbl" style={{ marginBottom: 8 }}>Add a note (optional)</div>
          <div className="hf-card" style={{ padding: 12, borderRadius: 10, minHeight: 70 }}>
            <span style={{ fontSize: 14, color: HFQ_INK }}>See you at the gate ✨</span>
            <span style={{ width: 1, height: 14, background: HFQ_ACC, display: 'inline-block', marginLeft: 2, animation: 'hf-blink 1s infinite' }}></span>
          </div>
        </div>

        {/* How it works */}
        <div style={{ padding: '18px 20px 0' }}>
          <div className="hf-card" style={{ padding: 14, borderRadius: 10, background: '#fafafa' }}>
            <div className="lbl" style={{ marginBottom: 8 }}>How it works</div>
            <div className="hf-col" style={{ gap: 8 }}>
              {[
                ["1", "Recipient gets a request on Ticketiv"],
                ["2", "They have 24h to accept"],
                ["3", "Your QR is revoked, theirs is issued"],
              ].map(([n, t]) => (
                <div key={n} className="hf-row" style={{ gap: 10 }}>
                  <span className="hf-mono" style={{ width: 18, height: 18, borderRadius: 999, background: HFQ_ACC_2, color: HFQ_ACC, fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n}</span>
                  <span style={{ fontSize: 12 }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ height: 100 }}></div>
      </div>

      <div style={{ borderTop: `1px solid ${HFQ_LINE}`, background: '#fff', padding: '14px 20px 28px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="hf-btn" style={{ flex: 1, padding: 14, borderRadius: 10 }}>Cancel</button>
        <button className="hf-btn accent" style={{ flex: 2, padding: 14, borderRadius: 10 }}>
          Send to Farah <HFIcon name="arrowR" size={16}/>
        </button>
      </div>
    </HFPhone>
  );
}

window.QuietSearch = QuietSearch;
window.QuietCheckout = QuietCheckout;
window.QuietConfirm = QuietConfirm;
window.QuietMyTickets = QuietMyTickets;
window.QuietTransfer = QuietTransfer;
