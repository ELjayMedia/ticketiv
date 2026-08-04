// QUIET · additional mobile screens.
// Resale listing, Refund request, Seating chart picker, Profile, Calendar, Friends.

// ── Resale listing ──
function QuietResale() {
  const P = HF_PHOTOS;
  const askPrice = 450, face = 500, fee = 36, payout = askPrice - fee;
  return (
    <HFPhone className="hf-quiet">
      <div className="hf-scroll">
        <div style={{ height: 56 }}></div>

        {/* Top */}
        <div style={{ padding: '8px 20px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button style={{ background: 'transparent', border: 0, color: HFQ_INK, cursor: 'pointer' }}><HFIcon name="chevL" size={22}/></button>
          <div className="hf-col" style={{ flex: 1, gap: 0 }}>
            <span style={{ fontSize: 11, color: HFQ_INK_3, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>Resell</span>
            <span style={{ fontSize: 15, fontWeight: 600 }}>List your ticket</span>
          </div>
          <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3, padding: '3px 8px', background: '#f3f1ee', borderRadius: 4 }}>SAFE TRANSFER</span>
        </div>

        {/* Ticket */}
        <div style={{ padding: '0 20px 18px' }}>
          <div className="hf-card" style={{ padding: 12, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden' }}>
              <HFPhoto src={P.dj_set} h={44}/>
            </div>
            <div className="hf-col" style={{ flex: 1 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Tribal Tales · Seat C-5</span>
              <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>WED 30 AUG · REGULAR · PAID ₹500</span>
            </div>
          </div>
        </div>

        {/* Price input */}
        <div style={{ padding: '0 20px 18px' }}>
          <div className="lbl" style={{ marginBottom: 8 }}>Your asking price</div>
          <div className="hf-card" style={{ padding: 14, borderRadius: 10 }}>
            <div className="hf-row" style={{ gap: 8, alignItems: 'baseline' }}>
              <span className="hf-mono" style={{ fontSize: 24, fontWeight: 600, color: HFQ_INK_3 }}>₹</span>
              <span className="hf-mono" style={{ fontSize: 36, fontWeight: 600, letterSpacing: '-0.02em' }}>
                {askPrice}
                <span style={{ width: 2, height: 28, background: HFQ_ACC, display: 'inline-block', marginLeft: 2, verticalAlign: 'baseline', animation: 'hf-blink 1s infinite' }}></span>
              </span>
            </div>
            <div style={{ height: 6, background: HFQ_LINE, borderRadius: 999, marginTop: 14, position: 'relative' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${(askPrice / (face * 1.1)) * 100}%`, background: HFQ_ACC, borderRadius: 999 }}></div>
              <div style={{ position: 'absolute', left: `${(askPrice / (face * 1.1)) * 100}%`, top: -4, width: 14, height: 14, borderRadius: 999, background: '#fff', border: `2.5px solid ${HFQ_ACC}`, transform: 'translateX(-50%)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}></div>
              {/* face value tick */}
              <div style={{ position: 'absolute', left: `${(face / (face * 1.1)) * 100}%`, top: -6, width: 1, height: 18, background: HFQ_INK_3, transform: 'translateX(-50%)' }}></div>
            </div>
            <div className="hf-row" style={{ marginTop: 10, fontSize: 10, color: HFQ_INK_3, fontFamily: 'var(--hf-font-mono)' }}>
              <span>₹0</span>
              <span style={{ flex: 1 }}></span>
              <span>₹{face} face</span>
              <span style={{ flex: 1 }}></span>
              <span>cap ₹{Math.round(face * 1.1)}</span>
            </div>
          </div>
        </div>

        {/* Breakdown */}
        <div style={{ padding: '0 20px 18px' }}>
          <div className="hf-card" style={{ padding: 14, borderRadius: 10, background: '#fafafa' }}>
            {[
              ["Buyer pays", `₹${askPrice}`, null],
              ["Platform fee (8%)", `−₹${fee}`, HFQ_INK_3],
            ].map(([l, v, c]) => (
              <div key={l} className="hf-row" style={{ padding: '4px 0' }}>
                <span className="hf-mono" style={{ fontSize: 12, color: HFQ_INK_3, flex: 1 }}>{l}</span>
                <span className="hf-mono" style={{ fontSize: 12, color: c || HFQ_INK }}>{v}</span>
              </div>
            ))}
            <div className="hf-divider" style={{ margin: '8px 0' }}></div>
            <div className="hf-row">
              <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>You receive</span>
              <span className="hf-mono" style={{ fontSize: 18, fontWeight: 600, color: HFQ_ACC }}>₹{payout}</span>
            </div>
            <div className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3, marginTop: 4 }}>credited 24h after event</div>
          </div>
        </div>

        {/* How it works */}
        <div style={{ padding: '0 20px 18px' }}>
          <div className="hf-card" style={{ padding: 14, borderRadius: 10 }}>
            <div className="lbl" style={{ marginBottom: 10 }}>When it sells</div>
            <div className="hf-col" style={{ gap: 10 }}>
              {[
                ["1", "Your QR is auto-revoked"],
                ["2", "Buyer gets a fresh QR"],
                ["3", "Funds appear in your wallet"],
              ].map(([n, t]) => (
                <div key={n} className="hf-row" style={{ gap: 10 }}>
                  <span className="hf-mono" style={{ width: 18, height: 18, borderRadius: 999, background: HFQ_ACC_2, color: HFQ_ACC, fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n}</span>
                  <span style={{ fontSize: 12 }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Caps notice */}
        <div style={{ padding: '0 20px 14px' }}>
          <div style={{ padding: 12, background: '#fdf6ed', border: `1px solid #fde2c1`, borderRadius: 10, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <HFIcon name="zap" size={16} style={{ color: '#c1841c', marginTop: 2 }}/>
            <div className="hf-col" style={{ flex: 1, gap: 2 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Resale cap on this event</span>
              <span className="hf-mono" style={{ fontSize: 11, color: '#7a5210' }}>up to 110% of face · max ₹550</span>
            </div>
          </div>
        </div>

        <div style={{ height: 100 }}></div>
      </div>

      <div style={{ borderTop: `1px solid ${HFQ_LINE}`, background: '#fff', padding: '14px 20px 28px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="hf-btn" style={{ flex: 1, padding: 14, borderRadius: 10 }}>Cancel</button>
        <button className="hf-btn accent" style={{ flex: 2, padding: 14, borderRadius: 10 }}>
          List for ₹{askPrice} <HFIcon name="arrowR" size={16}/>
        </button>
      </div>
    </HFPhone>
  );
}

// ── Refund request ──
function QuietRefund() {
  const P = HF_PHOTOS;
  return (
    <HFPhone className="hf-quiet">
      <div className="hf-scroll">
        <div style={{ height: 56 }}></div>

        <div style={{ padding: '8px 20px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button style={{ background: 'transparent', border: 0, color: HFQ_INK, cursor: 'pointer' }}><HFIcon name="chevL" size={22}/></button>
          <div className="hf-col" style={{ flex: 1, gap: 0 }}>
            <span style={{ fontSize: 11, color: HFQ_INK_3, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>Refund</span>
            <span style={{ fontSize: 15, fontWeight: 600 }}>Request a refund</span>
          </div>
        </div>

        {/* Order */}
        <div style={{ padding: '0 20px 18px' }}>
          <div className="hf-card" style={{ padding: 12, borderRadius: 10 }}>
            <div className="hf-row" style={{ gap: 10 }}>
              <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden' }}>
                <HFPhoto src={P.dj_set} h={44}/>
              </div>
              <div className="hf-col" style={{ flex: 1 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Tribal Tales</span>
                <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>WED 30 AUG · ORDER #RG7352</span>
              </div>
              <span className="hf-mono" style={{ fontSize: 12, fontWeight: 600 }}>₹1,018</span>
            </div>
          </div>
        </div>

        {/* Which tickets */}
        <div style={{ padding: '0 20px 16px' }}>
          <div className="lbl" style={{ marginBottom: 8 }}>Which tickets?</div>
          <div className="hf-col" style={{ gap: 6 }}>
            {[
              { seat: "C-4", t: "Regular", price: 500, on: true },
              { seat: "C-5", t: "Regular", price: 500, on: false },
            ].map((tk, i) => (
              <div key={i} style={{
                padding: 12, borderRadius: 10,
                border: `1px solid ${tk.on ? HFQ_ACC : HFQ_LINE}`,
                background: tk.on ? HFQ_ACC_2 : '#fff',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{
                  width: 18, height: 18, borderRadius: 5,
                  border: `2px solid ${tk.on ? HFQ_ACC : HFQ_LINE_2}`,
                  background: tk.on ? HFQ_ACC : '#fff',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                  flexShrink: 0,
                }}>
                  {tk.on && <HFIcon name="check" size={11} stroke={3}/>}
                </span>
                <div className="hf-col" style={{ flex: 1 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Seat {tk.seat} · {tk.t}</span>
                  <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>Issued · scannable</span>
                </div>
                <span className="hf-mono" style={{ fontSize: 13, fontWeight: 600 }}>₹{tk.price}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Reason */}
        <div style={{ padding: '0 20px 16px' }}>
          <div className="lbl" style={{ marginBottom: 8 }}>Reason</div>
          <div className="hf-card" style={{ padding: '10px 12px', borderRadius: 10, display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>Can't attend</span>
            <HFIcon name="chevD" size={16} style={{ color: HFQ_INK_3 }}/>
          </div>
        </div>

        {/* Notes */}
        <div style={{ padding: '0 20px 16px' }}>
          <div className="lbl" style={{ marginBottom: 8 }}>Notes (optional)</div>
          <div className="hf-card" style={{ padding: 12, borderRadius: 10, minHeight: 80 }}>
            <span style={{ fontSize: 14, color: HFQ_INK_3 }}>Tell the organizer what happened…</span>
          </div>
        </div>

        {/* Refund summary */}
        <div style={{ padding: '0 20px 16px' }}>
          <div className="hf-card" style={{ padding: 14, borderRadius: 10, background: '#fafafa' }}>
            {[
              ["Ticket refund", "₹500"],
              ["Booking fee (non-refundable)", "−₹50", HFQ_INK_3],
            ].map(([l, v, c]) => (
              <div key={l} className="hf-row" style={{ padding: '4px 0' }}>
                <span className="hf-mono" style={{ fontSize: 12, color: HFQ_INK_3, flex: 1 }}>{l}</span>
                <span className="hf-mono" style={{ fontSize: 12, color: c || HFQ_INK }}>{v}</span>
              </div>
            ))}
            <div className="hf-divider" style={{ margin: '8px 0' }}></div>
            <div className="hf-row">
              <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>You'll receive</span>
              <span className="hf-mono" style={{ fontSize: 18, fontWeight: 600 }}>₹450</span>
            </div>
            <div className="hf-row" style={{ marginTop: 4, gap: 4, color: HFQ_INK_3 }}>
              <HFIcon name="check" size={12}/>
              <span className="hf-mono" style={{ fontSize: 10 }}>back to Visa •••• 4242 · 3–5 business days</span>
            </div>
          </div>
        </div>

        {/* Policy */}
        <div style={{ padding: '0 20px 16px' }}>
          <div className="hf-card" style={{ padding: 14, borderRadius: 10, borderColor: HFQ_ACC_2, background: '#fbf7ff' }}>
            <div className="lbl" style={{ color: HFQ_ACC, marginBottom: 8 }}>Organizer's policy</div>
            <div className="hf-col" style={{ gap: 6 }}>
              {[
                ['check', '48h+ before · full refund', true],
                ['check', '24–48h before · 50% refund', true],
                ['close', '< 24h · no refund', false],
              ].map(([icon, t, ok]) => (
                <div key={t} className="hf-row" style={{ gap: 6, fontSize: 12 }}>
                  <HFIcon name={icon} size={14} style={{ color: ok ? HFQ_ACC : HFQ_INK_3 }}/>
                  <span style={{ fontWeight: ok ? 600 : 400, color: ok ? HFQ_INK : HFQ_INK_3 }}>{t}</span>
                </div>
              ))}
            </div>
            <div className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${HFQ_LINE}` }}>YOU'RE 5 DAYS OUT · FULL REFUND ELIGIBLE</div>
          </div>
        </div>

        <div style={{ height: 100 }}></div>
      </div>

      <div style={{ borderTop: `1px solid ${HFQ_LINE}`, background: '#fff', padding: '14px 20px 28px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="hf-btn" style={{ flex: 1, padding: 14, borderRadius: 10 }}>Cancel</button>
        <button className="hf-btn accent" style={{ flex: 2, padding: 14, borderRadius: 10 }}>
          Request refund <HFIcon name="arrowR" size={16}/>
        </button>
      </div>
    </HFPhone>
  );
}

// ── Seating chart ──
function QuietSeating() {
  // Build a grid
  const rows = ["A","B","C","D","E","F","G","H"];
  const cols = 12;
  const seatStates = {}; // build deterministic states
  rows.forEach((r, ri) => {
    for (let c = 1; c <= cols; c++) {
      const seed = ri * 13 + c * 7;
      let state = 'avail';
      if ((seed % 9) === 0) state = 'sold';
      else if ((seed % 11) === 0) state = 'hold';
      // selected: C-4, C-5
      if (r === 'C' && (c === 4 || c === 5)) state = 'pick';
      // aisle gap: between col 6 and 7
      seatStates[`${r}${c}`] = state;
    }
  });
  // Premium pricing rows (A-B)
  const tierPrice = (r) => (r === 'A' || r === 'B') ? 1200 : (r === 'G' || r === 'H') ? 400 : 500;
  const tierName = (r) => (r === 'A' || r === 'B') ? 'Premium' : (r === 'G' || r === 'H') ? 'Balcony' : 'Regular';

  return (
    <HFPhone className="hf-quiet">
      <div className="hf-scroll">
        <div style={{ height: 56 }}></div>

        <div style={{ padding: '8px 20px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button style={{ background: 'transparent', border: 0, color: HFQ_INK, cursor: 'pointer' }}><HFIcon name="chevL" size={22}/></button>
          <div className="hf-col" style={{ flex: 1, gap: 0 }}>
            <span style={{ fontSize: 11, color: HFQ_INK_3, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>Pick seats · 2 of 2</span>
            <span style={{ fontSize: 15, fontWeight: 600 }}>Tribal Tales · 30 Aug</span>
          </div>
          <span className="hf-mono" style={{ fontSize: 11, color: HFQ_ACC, fontWeight: 600 }}>HOLDS 9:42</span>
        </div>

        {/* Stage */}
        <div style={{ padding: '0 20px 14px' }}>
          <div className="hf-card" style={{ padding: '10px 0', borderRadius: 8, textAlign: 'center', background: HFQ_INK }}>
            <span className="hf-mono" style={{ fontSize: 12, color: '#fff', fontWeight: 600, letterSpacing: '0.2em' }}>STAGE</span>
          </div>
        </div>

        {/* Seat grid */}
        <div style={{ padding: '0 20px 18px' }}>
          <div className="hf-card" style={{ padding: 14, borderRadius: 12 }}>
            <div className="hf-col" style={{ gap: 6, alignItems: 'center' }}>
              {rows.map((r, ri) => (
                <div key={r} className="hf-row" style={{ gap: 3 }}>
                  <span className="hf-mono" style={{ fontSize: 9, color: HFQ_INK_3, width: 12, textAlign: 'right' }}>{r}</span>
                  {Array.from({ length: cols }).map((_, ci) => {
                    const c = ci + 1;
                    const state = seatStates[`${r}${c}`];
                    const isPremium = r === 'A' || r === 'B';
                    const isBalcony = r === 'G' || r === 'H';
                    let bg = '#fff', border = HFQ_LINE_2, color = HFQ_INK;
                    if (state === 'sold')  { bg = HFQ_LINE; border = HFQ_LINE; color = HFQ_INK_3; }
                    if (state === 'hold')  { bg = '#fde2c1'; border = '#d4a667'; }
                    if (state === 'pick')  { bg = HFQ_ACC; border = HFQ_ACC; color = '#fff'; }
                    if (state === 'avail') {
                      if (isPremium) { bg = '#fbf7ff'; border = HFQ_ACC_2; }
                      else if (isBalcony) { bg = '#fafaf7'; border = HFQ_LINE_2; }
                    }
                    return (
                      <React.Fragment key={c}>
                        <div style={{
                          width: 18, height: 18, borderRadius: 4,
                          background: bg,
                          border: `1.5px solid ${border}`,
                          color, fontSize: 8, fontWeight: 700,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: 'var(--hf-font-mono)',
                        }}>
                          {state === 'pick' ? '✓' : ''}
                        </div>
                        {c === 6 && <span style={{ width: 8 }}></span>}
                      </React.Fragment>
                    );
                  })}
                  <span className="hf-mono" style={{ fontSize: 9, color: HFQ_INK_3, width: 12 }}>{r}</span>
                </div>
              ))}
            </div>

            {/* zoom hint */}
            <div className="hf-row" style={{ justifyContent: 'center', marginTop: 14, gap: 6 }}>
              <button style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${HFQ_LINE_2}`, background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><HFIcon name="minus" size={14}/></button>
              <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3, padding: '0 6px' }}>pinch / tap to zoom</span>
              <button style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${HFQ_LINE_2}`, background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><HFIcon name="plus" size={14}/></button>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div style={{ padding: '0 20px 14px' }}>
          <div className="hf-row" style={{ gap: 12, flexWrap: 'wrap' }}>
            {[
              ['#fff', HFQ_LINE_2, 'Available'],
              [HFQ_ACC, HFQ_ACC, 'Selected'],
              [HFQ_LINE, HFQ_LINE, 'Sold'],
              ['#fde2c1', '#d4a667', 'On hold'],
              ['#fbf7ff', HFQ_ACC_2, 'Premium'],
            ].map(([bg, border, label]) => (
              <div key={label} className="hf-row" style={{ gap: 4 }}>
                <div style={{ width: 14, height: 14, borderRadius: 3, background: bg, border: `1.5px solid ${border}` }}></div>
                <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Your selection */}
        <div style={{ padding: '0 20px 18px' }}>
          <div className="lbl" style={{ marginBottom: 8 }}>Your selection · 2</div>
          <div className="hf-col" style={{ gap: 6 }}>
            {['C-4', 'C-5'].map(s => (
              <div key={s} className="hf-card" style={{ padding: 10, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10, borderColor: HFQ_ACC, background: HFQ_ACC_2 }}>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: HFQ_ACC, color: '#fff', fontFamily: 'var(--hf-font-mono)', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{s}</div>
                <div className="hf-col" style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{tierName(s[0])}</span>
                  <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>Row {s[0]} · Seat {s.slice(2)}</span>
                </div>
                <span className="hf-mono" style={{ fontSize: 14, fontWeight: 600 }}>₹{tierPrice(s[0])}</span>
                <button style={{ background: 'transparent', border: 0, color: HFQ_INK_3, cursor: 'pointer' }}><HFIcon name="close" size={14}/></button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: 100 }}></div>
      </div>

      <div style={{ borderTop: `1px solid ${HFQ_LINE}`, background: '#fff', padding: '14px 20px 28px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="hf-col">
          <span className="lbl">2 seats · subtotal</span>
          <span className="hf-mono" style={{ fontSize: 20, fontWeight: 600 }}>₹1,000</span>
        </div>
        <button className="hf-btn accent" style={{ flex: 1, padding: 14, borderRadius: 10 }}>
          Continue <HFIcon name="arrowR" size={16}/>
        </button>
      </div>
    </HFPhone>
  );
}

// ── Profile ──
function QuietProfile() {
  const P = HF_PHOTOS;
  return (
    <HFPhone className="hf-quiet">
      <div className="hf-scroll">
        <div style={{ height: 56 }}></div>

        {/* Top */}
        <div style={{ padding: '8px 20px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="hf-grow"></span>
          <button className="hf-btn ghost" style={{ padding: 8 }}><HFIcon name="share" size={20}/></button>
          <button className="hf-btn ghost" style={{ padding: 8 }}><HFIcon name="filter" size={20}/></button>
        </div>

        {/* Header card */}
        <div style={{ padding: '0 20px 16px' }}>
          <div className="hf-col" style={{ alignItems: 'center', gap: 10, padding: '8px 0 16px' }}>
            <div style={{ position: 'relative' }}>
              <HFAvatar src={P.face_8} size={84}/>
              <button style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 999, background: HFQ_ACC, color: '#fff', border: '2px solid #fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <HFIcon name="plus" size={14} stroke={3}/>
              </button>
            </div>
            <div className="hf-col" style={{ alignItems: 'center', gap: 2 }}>
              <div className="h2" style={{ fontSize: 20 }}>Smit Modi</div>
              <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>@smit · joined Jan 2024</span>
            </div>
            <div className="hf-row" style={{ gap: 18, marginTop: 6 }}>
              <div className="hf-col" style={{ alignItems: 'center', gap: 0 }}>
                <span className="hf-mono" style={{ fontSize: 16, fontWeight: 600 }}>24</span>
                <span className="lbl">events</span>
              </div>
              <span style={{ width: 1, height: 20, background: HFQ_LINE }}></span>
              <div className="hf-col" style={{ alignItems: 'center', gap: 0 }}>
                <span className="hf-mono" style={{ fontSize: 16, fontWeight: 600 }}>10</span>
                <span className="lbl">friends</span>
              </div>
              <span style={{ width: 1, height: 20, background: HFQ_LINE }}></span>
              <div className="hf-col" style={{ alignItems: 'center', gap: 0 }}>
                <span className="hf-mono" style={{ fontSize: 16, fontWeight: 600 }}>5</span>
                <span className="lbl">following</span>
              </div>
            </div>
          </div>
        </div>

        {/* Account */}
        <div style={{ padding: '0 20px 16px' }}>
          <div className="lbl" style={{ marginBottom: 8 }}>Account</div>
          <div className="hf-card" style={{ borderRadius: 10 }}>
            {[
              ['user',   'Personal info', 'smit@mail.in'],
              ['wallet', 'Payment methods', '2 saved'],
              ['cal',    'Reminders', 'on'],
              ['globe',  'Language', 'English'],
            ].map(([icon, l, v], i, arr) => (
              <div key={l} className="hf-row" style={{ padding: '12px 14px', gap: 10, borderBottom: i < arr.length - 1 ? `1px solid ${HFQ_LINE}` : 0 }}>
                <div style={{ width: 28, height: 28, borderRadius: 999, background: HFQ_ACC_2, color: HFQ_ACC, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <HFIcon name={icon} size={14}/>
                </div>
                <span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>{l}</span>
                <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>{v}</span>
                <HFIcon name="chevR" size={14} style={{ color: HFQ_INK_3 }}/>
              </div>
            ))}
          </div>
        </div>

        {/* Activity */}
        <div style={{ padding: '0 20px 16px' }}>
          <div className="lbl" style={{ marginBottom: 8 }}>Your activity</div>
          <div className="hf-card" style={{ borderRadius: 10 }}>
            {[
              ['ticket', 'Tickets', '4 upcoming'],
              ['heart', 'Favourites', '12'],
              ['user', 'Friends', '10'],
              ['arrowUR', 'Transfers', '1 pending'],
            ].map(([icon, l, v], i, arr) => (
              <div key={l} className="hf-row" style={{ padding: '12px 14px', gap: 10, borderBottom: i < arr.length - 1 ? `1px solid ${HFQ_LINE}` : 0 }}>
                <HFIcon name={icon} size={16} style={{ color: HFQ_INK_3 }}/>
                <span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>{l}</span>
                <span className="hf-mono" style={{ fontSize: 11, color: HFQ_ACC, fontWeight: 600 }}>{v}</span>
                <HFIcon name="chevR" size={14} style={{ color: HFQ_INK_3 }}/>
              </div>
            ))}
          </div>
        </div>

        {/* Organizer mode prompt */}
        <div style={{ padding: '0 20px 16px' }}>
          <div className="hf-card" style={{ padding: 14, borderRadius: 10, background: HFQ_INK, color: '#fff', borderColor: HFQ_INK }}>
            <div className="hf-row" style={{ gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 999, background: HFQ_ACC, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <HFIcon name="spark" size={18}/>
              </div>
              <div className="hf-col" style={{ flex: 1, gap: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Organize your own event</span>
                <span className="hf-mono" style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>set up in 5 min · 0% commission first event</span>
              </div>
              <HFIcon name="chevR" size={16} style={{ color: 'rgba(255,255,255,0.6)' }}/>
            </div>
          </div>
        </div>

        {/* Settings list */}
        <div style={{ padding: '0 20px 16px' }}>
          <div className="lbl" style={{ marginBottom: 8 }}>More</div>
          <div className="hf-card" style={{ borderRadius: 10 }}>
            {[
              ['Notifications', null],
              ['Privacy & data', null],
              ['Help center', null],
              ['Send feedback', null],
              ['Sign out', null, HFQ_ACC],
            ].map(([l, v, c], i, arr) => (
              <div key={l} className="hf-row" style={{ padding: '12px 14px', gap: 10, borderBottom: i < arr.length - 1 ? `1px solid ${HFQ_LINE}` : 0 }}>
                <span style={{ fontSize: 14, fontWeight: 500, flex: 1, color: c || HFQ_INK }}>{l}</span>
                {!c && <HFIcon name="chevR" size={14} style={{ color: HFQ_INK_3 }}/>}
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '0 20px 20px', textAlign: 'center' }}>
          <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>ticketiv · v2.4.1 · build 2025-05</span>
        </div>

        <div style={{ height: 100 }}></div>
      </div>

      <div className="hf-tabbar">
        <div className="tab"><HFIcon name="spark" size={20}/>Discover</div>
        <div className="tab"><HFIcon name="search" size={20}/>Search</div>
        <div className="tab"><HFIcon name="ticket" size={20}/>Tickets</div>
        <div className="tab on"><HFIcon name="user" size={20} stroke={2}/>You</div>
      </div>
    </HFPhone>
  );
}

// ── Calendar (month) ──
function QuietCalendar() {
  const P = HF_PHOTOS;
  const today = 22;
  const events = { 15: 1, 22: 1, 25: 2, 27: 1, 30: 1 };
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <HFPhone className="hf-quiet">
      <div className="hf-scroll">
        <div style={{ height: 56 }}></div>

        <div style={{ padding: '8px 20px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="hf-col" style={{ flex: 1 }}>
            <span className="lbl">Calendar</span>
            <span className="h1" style={{ marginTop: 2 }}>July 2025</span>
          </div>
          <button className="hf-btn ghost" style={{ padding: 8 }}><HFIcon name="search" size={20}/></button>
          <button className="hf-btn ghost" style={{ padding: 8 }}><HFIcon name="filter" size={20}/></button>
        </div>

        {/* Segmented */}
        <div style={{ padding: '0 20px 16px' }}>
          <div className="hf-seg" style={{ width: '100%', display: 'flex' }}>
            <span className="on" style={{ flex: 1, textAlign: 'center' }}>Month</span>
            <span style={{ flex: 1, textAlign: 'center' }}>Week</span>
            <span style={{ flex: 1, textAlign: 'center' }}>List</span>
          </div>
        </div>

        {/* Month controls */}
        <div style={{ padding: '0 20px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${HFQ_LINE_2}`, background: '#fff' }}><HFIcon name="chevL" size={14}/></button>
          <span className="hf-grow"></span>
          <span style={{ fontSize: 14, fontWeight: 600 }}>July 2025</span>
          <span className="hf-grow"></span>
          <button style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${HFQ_LINE_2}`, background: '#fff' }}><HFIcon name="chevR" size={14}/></button>
        </div>

        {/* Grid */}
        <div style={{ padding: '0 20px 16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {['M','T','W','T','F','S','S'].map((d, i) => (
              <div key={i} className="hf-mono" style={{ textAlign: 'center', fontSize: 10, color: HFQ_INK_3, padding: '4px 0', letterSpacing: '0.06em' }}>{d}</div>
            ))}
            {/* offset July 1 = Tuesday */}
            {Array(1).fill(0).map((_, i) => <div key={`o${i}`}></div>)}
            {days.map(d => {
              const isToday = d === today;
              const ev = events[d];
              return (
                <div key={d} style={{
                  aspectRatio: '1',
                  borderRadius: 10,
                  background: isToday ? HFQ_ACC : '#fff',
                  border: ev && !isToday ? `1px solid ${HFQ_ACC_2}` : `1px solid ${HFQ_LINE}`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  position: 'relative', padding: 2,
                  cursor: 'pointer',
                }}>
                  <span className="hf-mono" style={{ fontSize: 13, fontWeight: isToday ? 700 : 500, color: isToday ? '#fff' : (ev ? HFQ_INK : HFQ_INK_3) }}>{d}</span>
                  {ev && (
                    <div style={{ display: 'flex', gap: 2, position: 'absolute', bottom: 4 }}>
                      {Array(Math.min(ev, 3)).fill(0).map((_, i) => (
                        <span key={i} style={{ width: 4, height: 4, borderRadius: 999, background: isToday ? '#fff' : HFQ_ACC }}></span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Today's events */}
        <div style={{ padding: '6px 20px 14px' }}>
          <div className="hf-between" style={{ marginBottom: 8 }}>
            <span className="lbl">Today · 22 Jul</span>
            <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>1 event</span>
          </div>
          <div className="hf-card" style={{ padding: 12, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden' }}>
              <HFPhoto src={P.fest_river} h={44}/>
            </div>
            <div className="hf-col" style={{ flex: 1 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Sunset Set</span>
              <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>18:00 · Riverside Park</span>
            </div>
            <button className="hf-btn xs accent">View</button>
          </div>
        </div>

        {/* Coming up */}
        <div style={{ padding: '6px 20px 14px' }}>
          <div className="lbl" style={{ marginBottom: 8 }}>Coming up</div>
          <div className="hf-col" style={{ gap: 6 }}>
            {[
              { d: 25, day: "Fri", t: "Open Mic Friday", v: "Studio X", time: "20:00" },
              { d: 25, day: "Fri", t: "Stand-up · A.Khan", v: "Comedy Club", time: "21:30" },
              { d: 27, day: "Sun", t: "A Doll's House", v: "Natarani", time: "19:00" },
              { d: 30, day: "Wed", t: "Tribal Tales", v: "Cafe Natarani", time: "20:00" },
            ].map((e, i, arr) => (
              <div key={i} className="hf-row" style={{ padding: '8px 0', borderBottom: i < arr.length - 1 ? `1px solid ${HFQ_LINE}` : 0, gap: 12 }}>
                <div className="hf-col" style={{ alignItems: 'center', width: 36 }}>
                  <span className="hf-mono" style={{ fontSize: 16, fontWeight: 600 }}>{e.d}</span>
                  <span className="hf-mono" style={{ fontSize: 9, color: HFQ_INK_3 }}>{e.day.toUpperCase()}</span>
                </div>
                <div style={{ width: 3, height: 30, background: HFQ_ACC_2, borderRadius: 999 }}></div>
                <div className="hf-col" style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{e.t}</span>
                  <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>{e.time} · {e.v}</span>
                </div>
                <HFIcon name="chevR" size={14} style={{ color: HFQ_INK_3 }}/>
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: 100 }}></div>
      </div>

      <div className="hf-tabbar">
        <div className="tab"><HFIcon name="spark" size={20}/>Discover</div>
        <div className="tab on"><HFIcon name="cal" size={20} stroke={2}/>Calendar</div>
        <div className="tab"><HFIcon name="ticket" size={20}/>Tickets</div>
        <div className="tab"><HFIcon name="user" size={20}/>You</div>
      </div>
    </HFPhone>
  );
}

// ── Friends / Social ──
function QuietFriends() {
  const P = HF_PHOTOS;
  return (
    <HFPhone className="hf-quiet">
      <div className="hf-scroll">
        <div style={{ height: 56 }}></div>

        <div style={{ padding: '8px 20px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="hf-col" style={{ flex: 1 }}>
            <span className="lbl">Your circle</span>
            <span className="h1" style={{ marginTop: 2 }}>Friends · 10</span>
          </div>
          <button className="hf-btn ghost" style={{ padding: 8 }}><HFIcon name="search" size={20}/></button>
          <button className="hf-btn xs accent"><HFIcon name="plus" size={14}/> Invite</button>
        </div>

        {/* Segmented */}
        <div style={{ padding: '0 20px 16px' }}>
          <div className="hf-seg" style={{ width: '100%', display: 'flex' }}>
            <span className="on" style={{ flex: 1, textAlign: 'center' }}>Activity</span>
            <span style={{ flex: 1, textAlign: 'center' }}>Friends</span>
            <span style={{ flex: 1, textAlign: 'center' }}>Requests · 3</span>
          </div>
        </div>

        {/* Going together */}
        <div style={{ padding: '0 20px 16px' }}>
          <div className="hf-card" style={{ padding: 14, borderRadius: 12, borderColor: HFQ_ACC, background: HFQ_ACC_2 }}>
            <div className="hf-row" style={{ gap: 10 }}>
              <div className="hf-stack">
                {[P.face_1, P.face_2, P.face_3].map((f, i) => <HFAvatar key={i} src={f} size={28} ring={HFQ_ACC_2}/>)}
              </div>
              <div className="hf-col" style={{ flex: 1, gap: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Farah, Salman + 1 going to</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: HFQ_ACC }}>Tribal Tales · Wed 30</span>
              </div>
            </div>
            <button className="hf-btn accent" style={{ width: '100%', marginTop: 12, padding: 10, borderRadius: 8, fontSize: 13 }}>Join them — book ₹500</button>
          </div>
        </div>

        {/* Activity feed */}
        <div style={{ padding: '0 20px 16px' }}>
          <div className="lbl" style={{ marginBottom: 8 }}>Recent</div>
          <div className="hf-col" style={{ gap: 8 }}>
            {[
              { f: P.face_2, n: "Farah", action: "booked", what: "Indie Showcase", when: "2h", icon: 'ticket' },
              { f: P.face_3, n: "Salman", action: "is going to", what: "Tribal Tales", when: "5h", icon: 'spark' },
              { f: P.face_4, n: "Vicky", action: "rated", what: "Open Mic Friday · ★★★★★", when: "1d", icon: 'heart' },
              { f: P.face_7, n: "Asha", action: "saved", what: "Sunset Set", when: "1d", icon: 'heart' },
              { f: P.face_5, n: "Amir", action: "is following", what: "Comedy Co.", when: "2d", icon: 'plus' },
            ].map((a, i, arr) => (
              <div key={i} className="hf-row" style={{ gap: 10, padding: '4px 0' }}>
                <div style={{ position: 'relative' }}>
                  <HFAvatar src={a.f} size={36}/>
                  <span style={{ position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: 999, background: HFQ_ACC_2, border: '2px solid #fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: HFQ_ACC }}>
                    <HFIcon name={a.icon} size={9}/>
                  </span>
                </div>
                <div className="hf-col" style={{ flex: 1, gap: 1 }}>
                  <span style={{ fontSize: 13 }}>
                    <b>{a.n}</b> <span style={{ color: HFQ_INK_3 }}>{a.action}</span> <b>{a.what}</b>
                  </span>
                  <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>{a.when} ago</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Suggested friends */}
        <div style={{ padding: '0 20px 16px' }}>
          <div className="hf-between" style={{ marginBottom: 8 }}>
            <span className="lbl">People you may know</span>
            <span className="hf-mono" style={{ fontSize: 11, color: HFQ_ACC, fontWeight: 600 }}>see all ›</span>
          </div>
          <div className="hf-scrollx" style={{ gap: 8 }}>
            {[
              { f: P.face_4, n: "Vicky Kausal", mutual: "3 mutual" },
              { f: P.face_6, n: "Rishi K.", mutual: "5 mutual" },
              { f: P.face_8, n: "Priya P.", mutual: "1 mutual" },
            ].map((p, i) => (
              <div key={i} className="hf-card" style={{ width: 140, padding: 12, borderRadius: 12, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <HFAvatar src={p.f} size={48}/>
                <span style={{ fontSize: 12, fontWeight: 600, textAlign: 'center' }}>{p.n}</span>
                <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>{p.mutual}</span>
                <button className="hf-btn xs accent" style={{ width: '100%' }}>+ Add</button>
              </div>
            ))}
          </div>
        </div>

        {/* Invite via link */}
        <div style={{ padding: '0 20px 16px' }}>
          <div className="hf-card" style={{ padding: 14, borderRadius: 10 }}>
            <div className="hf-row" style={{ gap: 10, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 999, background: HFQ_ACC_2, color: HFQ_ACC, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <HFIcon name="share" size={16}/>
              </div>
              <div className="hf-col" style={{ flex: 1 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Invite friends</span>
                <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>get ₹100 off when 3 join</span>
              </div>
            </div>
            <div style={{ background: '#fafafa', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="hf-mono" style={{ fontSize: 12, flex: 1, color: HFQ_INK }}>ticketiv.app/?ref=smit</span>
              <button className="hf-btn xs"><HFIcon name="copy" size={12}/> Copy</button>
            </div>
          </div>
        </div>

        <div style={{ height: 100 }}></div>
      </div>

      <div className="hf-tabbar">
        <div className="tab"><HFIcon name="spark" size={20}/>Discover</div>
        <div className="tab on"><HFIcon name="user" size={20} stroke={2}/>Friends</div>
        <div className="tab"><HFIcon name="ticket" size={20}/>Tickets</div>
        <div className="tab"><HFIcon name="user" size={20}/>You</div>
      </div>
    </HFPhone>
  );
}

window.QuietResale = QuietResale;
window.QuietRefund = QuietRefund;
window.QuietSeating = QuietSeating;
window.QuietProfile = QuietProfile;
window.QuietCalendar = QuietCalendar;
window.QuietFriends = QuietFriends;
