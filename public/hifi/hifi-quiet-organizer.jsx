// QUIET direction · mobile organizer screens.
// Dashboard, Scanner, POS / Box office.

// ── Organizer Dashboard ──
function QuietOrgDash() {
  const P = HF_PHOTOS;
  return (
    <HFPhone className="hf-quiet">
      <div className="hf-scroll">
        <div style={{ height: 56 }}></div>

        {/* Top — org switcher */}
        <div style={{ padding: '8px 20px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: '#fff', border: `1px solid ${HFQ_LINE}`, borderRadius: 10, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: HFQ_INK, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>R</div>
            <div className="hf-col" style={{ flex: 1, gap: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Rishabh's Events</span>
              <span className="hf-mono" style={{ fontSize: 9, color: HFQ_INK_3 }}>organizer_owner</span>
            </div>
            <HFIcon name="chevD" size={14} style={{ color: HFQ_INK_3 }}/>
          </div>
          <button className="hf-btn ghost" style={{ padding: 8, position: 'relative' }}>
            <HFIcon name="bell" size={20}/>
            <span style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, background: HFQ_ACC, borderRadius: 999 }}></span>
          </button>
        </div>

        {/* Header */}
        <div style={{ padding: '0 20px 16px' }}>
          <div className="lbl">Overview · last 7 days</div>
          <div className="h1" style={{ marginTop: 2 }}>Hi Rishabh ✦</div>
        </div>

        {/* KPI grid */}
        <div style={{ padding: '0 20px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            ["Tickets sold", "182", "▲ 24%", "up"],
            ["Gross",        "₹91.2k", "▲ 18%", "up"],
            ["Net",          "₹78.4k", "▲ 17%", "up"],
            ["Refunds",      "2.1%",  "▼ 0.4pp", "down"],
          ].map(([l, v, d, dir]) => (
            <div key={l} className="hf-card" style={{ padding: 12, borderRadius: 10 }}>
              <span className="lbl">{l}</span>
              <span style={{ fontSize: 20, fontWeight: 600, marginTop: 6, fontFamily: 'var(--hf-font-mono)', display: 'block' }}>{v}</span>
              <span className="hf-mono" style={{ fontSize: 10, color: dir === 'up' ? HFQ_ACC : HFQ_INK_3, marginTop: 2 }}>{d}</span>
            </div>
          ))}
        </div>

        {/* Sales chart card */}
        <div style={{ padding: '0 20px 16px' }}>
          <div className="hf-card" style={{ padding: 14, borderRadius: 10 }}>
            <div className="hf-between" style={{ marginBottom: 10 }}>
              <span className="h3" style={{ fontSize: 14 }}>Sales · 30d</span>
              <div className="hf-row" style={{ gap: 6 }}>
                <span className="hf-chip" style={{ fontSize: 10, padding: '1px 6px', background: HFQ_ACC_2, color: HFQ_ACC, borderColor: 'transparent' }}>Revenue</span>
                <span className="hf-chip" style={{ fontSize: 10, padding: '1px 6px' }}>Tickets</span>
              </div>
            </div>
            <svg viewBox="0 0 320 120" style={{ width: '100%', height: 120 }}>
              {[0,1,2,3].map(i => (
                <line key={i} x1="0" x2="320" y1={i*30+10} y2={i*30+10} stroke={HFQ_LINE} strokeDasharray="3 4" strokeWidth="0.8"/>
              ))}
              {/* revenue area */}
              <path d="M0,90 L20,82 L40,75 L60,60 L80,68 L100,52 L120,40 L140,55 L160,32 L180,28 L200,38 L220,22 L240,16 L260,28 L280,12 L300,18 L320,8 L320,120 L0,120 Z" fill={HFQ_ACC_2}/>
              <polyline points="0,90 20,82 40,75 60,60 80,68 100,52 120,40 140,55 160,32 180,28 200,38 220,22 240,16 260,28 280,12 300,18 320,8" fill="none" stroke={HFQ_ACC} strokeWidth="2"/>
              {/* tickets dashed */}
              <polyline points="0,102 20,96 40,98 60,86 80,90 100,80 120,72 140,80 160,62 180,60 200,68 220,54 240,48 260,54 280,40 300,46 320,38" fill="none" stroke={HFQ_INK_3} strokeWidth="1.4" strokeDasharray="4 3"/>
            </svg>
            <div className="hf-row" style={{ gap: 6, marginTop: 8, justifyContent: 'space-between', fontSize: 10, color: HFQ_INK_3, fontFamily: 'var(--hf-font-mono)' }}>
              <span>Jul 1</span><span>Jul 15</span><span>today</span>
            </div>
          </div>
        </div>

        {/* Live events */}
        <div style={{ padding: '0 20px 12px' }}>
          <div className="hf-between" style={{ marginBottom: 10 }}>
            <div className="h3" style={{ fontSize: 14 }}>Live &amp; upcoming</div>
            <span className="hf-mono" style={{ fontSize: 11, color: HFQ_ACC, fontWeight: 600 }}>+ new event ›</span>
          </div>
          <div className="hf-col" style={{ gap: 6 }}>
            {[
              { p: P.dj_set,        t: "Tribal Tales", sub: "Tonight · doors 19:30", sold: "85", cap: "120", scan: "12 scanned", live: true,  pct: 70 },
              { p: P.singer_red,    t: "Stand-up · A.Khan", sub: "Fri 25 · 21:30",     sold: "42", cap: "60",  scan: null,        live: false, pct: 70 },
              { p: P.crowd_lights,  t: "Indie Showcase",    sub: "Sat 26 · 22:00",     sold: "18", cap: "80",  scan: null,        live: false, pct: 22 },
            ].map((e, i) => (
              <div key={i} className="hf-card" style={{ padding: 12, borderRadius: 10 }}>
                <div className="hf-row" style={{ gap: 10 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
                    <HFPhoto src={e.p} h={44}/>
                  </div>
                  <div className="hf-col" style={{ flex: 1, gap: 1 }}>
                    <div className="hf-row" style={{ gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{e.t}</span>
                      {e.live && <span className="hf-row" style={{ gap: 4 }}><span className="hf-live-dot"></span><span className="hf-mono" style={{ fontSize: 9, color: '#ef4444', fontWeight: 700 }}>LIVE</span></span>}
                    </div>
                    <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>{e.sub}</span>
                  </div>
                  <div className="hf-col" style={{ alignItems: 'flex-end', gap: 1 }}>
                    <span className="hf-mono" style={{ fontSize: 11, fontWeight: 600 }}>{e.sold}/{e.cap}</span>
                    {e.scan && <span className="hf-mono" style={{ fontSize: 9, color: HFQ_ACC }}>{e.scan}</span>}
                  </div>
                </div>
                <div style={{ height: 4, background: HFQ_LINE, borderRadius: 999, marginTop: 10, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${e.pct}%`, background: e.live ? HFQ_ACC : HFQ_INK_3, borderRadius: 999 }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity */}
        <div style={{ padding: '14px 20px 0' }}>
          <div className="h3" style={{ fontSize: 14, marginBottom: 10 }}>Activity</div>
          <div className="hf-card" style={{ borderRadius: 10, padding: 0 }}>
            {[
              { i: 'check',   t: "Asha booked 2 × Regular",          when: "2m",   c: HFQ_ACC },
              { i: 'arrowUR', t: "Salman → Vicky transfer",          when: "8m",   c: HFQ_INK_3 },
              { i: 'spark',   t: "New 5★ review · Tribal Tales",    when: "21m",  c: HFQ_ACC },
              { i: 'wallet',  t: "Payout ₹38,000 → HDFC ••12",      when: "1h",   c: HFQ_INK_3 },
              { i: 'qr',      t: "Gate 1 scanner online · device #4",when: "2h",   c: HFQ_INK_3 },
            ].map((a, i, arr) => (
              <div key={i} className="hf-row" style={{ padding: '10px 12px', gap: 10, borderBottom: i < arr.length - 1 ? `1px solid ${HFQ_LINE}` : 0 }}>
                <span style={{ width: 28, height: 28, borderRadius: 999, background: HFQ_ACC_2, color: a.c, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <HFIcon name={a.i} size={14}/>
                </span>
                <span style={{ flex: 1, fontSize: 12 }}>{a.t}</span>
                <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>{a.when}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: 100 }}></div>
      </div>

      <div className="hf-tabbar">
        <div className="tab on"><HFIcon name="spark" size={20} stroke={2}/>Overview</div>
        <div className="tab"><HFIcon name="cal" size={20}/>Events</div>
        <div className="tab"><HFIcon name="qr" size={20}/>Scan</div>
        <div className="tab"><HFIcon name="wallet" size={20}/>Payouts</div>
      </div>
    </HFPhone>
  );
}

// ── Scanner (dark) ──
function QuietScanner() {
  return (
    <HFPhone className="hf-quiet">
      <div className="hf-scroll" style={{ background: HFQ_INK, color: '#fff' }}>
        <div style={{ height: 56 }}></div>

        {/* Top */}
        <div style={{ padding: '8px 20px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button style={{ background: 'rgba(255,255,255,0.1)', border: 0, color: '#fff', width: 32, height: 32, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><HFIcon name="close" size={18}/></button>
          <div className="hf-col" style={{ flex: 1, gap: 0 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>Scanning</span>
            <span style={{ fontSize: 15, fontWeight: 600 }}>Tribal Tales · gate 1</span>
          </div>
          <span className="hf-row" style={{ gap: 6 }}>
            <span className="hf-live-dot"></span>
            <span className="hf-mono" style={{ fontSize: 11, fontWeight: 600 }}>LIVE</span>
          </span>
        </div>

        {/* Viewfinder */}
        <div style={{ padding: '0 20px 14px' }}>
          <div style={{
            position: 'relative',
            aspectRatio: '1',
            background: '#0a0a0c',
            borderRadius: 16,
            overflow: 'hidden',
            border: `1px solid rgba(255,255,255,0.1)`,
          }}>
            {/* fake camera blur background */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(circle at 40% 40%, rgba(107,63,189,0.15) 0%, rgba(0,0,0,0) 50%), radial-gradient(circle at 70% 70%, rgba(214,255,58,0.05) 0%, rgba(0,0,0,0) 50%)',
              opacity: 0.7,
            }}></div>

            {/* corner brackets */}
            {[[0,0],[1,0],[0,1],[1,1]].map(([x,y], i) => {
              const sz = 32;
              return (
                <div key={i} style={{
                  position: 'absolute',
                  [x ? 'right' : 'left']: 24,
                  [y ? 'bottom' : 'top']: 24,
                  width: sz, height: sz,
                  borderTop: y ? 0 : '3px solid #d6ff3a',
                  borderBottom: y ? '3px solid #d6ff3a' : 0,
                  borderLeft: x ? 0 : '3px solid #d6ff3a',
                  borderRight: x ? '3px solid #d6ff3a' : 0,
                  borderRadius: 4,
                }}/>
              );
            })}

            {/* sweep line */}
            <div style={{ position: 'absolute', left: 24, right: 24, top: '50%', height: 2, background: '#d6ff3a', boxShadow: '0 0 12px #d6ff3a' }}></div>

            {/* hint text */}
            <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: 'var(--hf-font-mono)', letterSpacing: '0.06em' }}>
              AIM AT QR · TAP FOR MANUAL
            </div>
          </div>
        </div>

        {/* Last result */}
        <div style={{ padding: '0 20px 14px' }}>
          <div style={{
            background: 'rgba(107,63,189,0.18)',
            border: `1px solid rgba(214,255,58,0.4)`,
            borderRadius: 12,
            padding: 14,
          }}>
            <div className="hf-row" style={{ gap: 10, marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 999, background: '#d6ff3a', color: HFQ_INK, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <HFIcon name="check" size={20} stroke={3}/>
              </div>
              <div className="hf-col" style={{ flex: 1 }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>VALID · checked in</span>
                <span className="hf-mono" style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>3s ago · auto-advance in 2s</span>
              </div>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="hf-col" style={{ flex: 1 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>Prateek Sharma</span>
                <span className="hf-mono" style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Seat C-4 · Regular · TKT-9X2K-LM4P</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ padding: '0 20px 12px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[
            ["Scanned", "214", "#d6ff3a"],
            ["Rejected", "6", '#ef4444'],
            ["Capacity", "320", '#fff'],
          ].map(([l, v, c]) => (
            <div key={l} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
              <span style={{ fontSize: 22, fontWeight: 600, color: c, fontFamily: 'var(--hf-font-mono)', display: 'block' }}>{v}</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{l}</span>
            </div>
          ))}
        </div>

        {/* Recent scans */}
        <div style={{ padding: '8px 20px 0' }}>
          <div className="hf-row" style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>Recent · last 5 min</span>
            <span style={{ flex: 1 }}></span>
            <span className="hf-mono" style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>42/min</span>
          </div>
          {[
            { s: "VALID",      who: "Asha I. · C-5",     when: "12s",  k: 'ok' },
            { s: "DUPLICATE",  who: "Vicky K. · in 8:02",when: "42s", k: 'rej' },
            { s: "VALID",      who: "Riya M. · GA",      when: "1m",   k: 'ok' },
            { s: "WRONG EVT",  who: "TKT for Open Mic",  when: "2m",   k: 'rej' },
            { s: "VALID",      who: "Manish G. · F-12",  when: "2m",   k: 'ok' },
          ].map((r, i) => (
            <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.05em',
                color: r.k === 'ok' ? '#d6ff3a' : '#ff8a7a',
                background: r.k === 'ok' ? 'rgba(214,255,58,0.12)' : 'rgba(239,68,68,0.18)',
                padding: '3px 7px', borderRadius: 4,
                minWidth: 76, textAlign: 'center',
              }}>{r.s}</span>
              <span style={{ flex: 1, fontSize: 12 }}>{r.who}</span>
              <span className="hf-mono" style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{r.when}</span>
            </div>
          ))}
        </div>

        <div style={{ height: 100 }}></div>
      </div>

      {/* Bottom action bar */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.5)', padding: '14px 20px 28px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 500, flex: 1, cursor: 'pointer' }}>Manual code</button>
        <button style={{ background: '#d6ff3a', color: HFQ_INK, border: 0, borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 700, flex: 1, cursor: 'pointer' }}>Flash on</button>
      </div>
    </HFPhone>
  );
}

// ── POS / Box office ──
function QuietPOS() {
  return (
    <HFPhone className="hf-quiet">
      <div className="hf-scroll">
        <div style={{ height: 56 }}></div>

        {/* Top */}
        <div style={{ padding: '8px 20px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button style={{ background: 'transparent', border: 0, color: HFQ_INK, cursor: 'pointer' }}><HFIcon name="chevL" size={22}/></button>
          <div className="hf-col" style={{ flex: 1, gap: 0 }}>
            <span style={{ fontSize: 11, color: HFQ_INK_3, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>Box office</span>
            <span style={{ fontSize: 15, fontWeight: 600 }}>Tribal Tales · device #2</span>
          </div>
          <button className="hf-btn ghost" style={{ padding: 8 }}><HFIcon name="user" size={20}/></button>
        </div>

        {/* Ticket selection */}
        <div style={{ padding: '0 20px 16px' }}>
          <div className="lbl" style={{ marginBottom: 8 }}>Tickets</div>
          <div className="hf-col" style={{ gap: 6 }}>
            {[
              { t: "Regular", p: 500, left: 35, q: 2, en: true },
              { t: "Premium", p: 1200, left: 18, q: 0, en: true },
              { t: "VIP",     p: 2500, left: 0,  q: 0, en: false },
            ].map((tk, i) => (
              <div key={i} className="hf-card" style={{
                padding: 12,
                borderRadius: 10,
                borderColor: tk.q > 0 ? HFQ_ACC : HFQ_LINE,
                background: tk.q > 0 ? HFQ_ACC_2 : '#fff',
                opacity: tk.en ? 1 : 0.5,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div className="hf-col" style={{ flex: 1 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{tk.t}</span>
                  <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>{tk.en ? `${tk.left} left at door · ₹${tk.p}` : `sold out`}</span>
                </div>
                <button style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${HFQ_LINE_2}`, background: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', opacity: tk.q === 0 ? 0.4 : 1 }}><HFIcon name="minus" size={14}/></button>
                <span className="hf-mono" style={{ fontSize: 16, fontWeight: 600, minWidth: 22, textAlign: 'center' }}>{tk.q}</span>
                <button style={{ width: 30, height: 30, borderRadius: 8, border: tk.q > 0 ? `1px solid ${HFQ_ACC}` : `1px solid ${HFQ_LINE_2}`, background: tk.q > 0 ? HFQ_ACC : '#fff', color: tk.q > 0 ? '#fff' : HFQ_INK, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><HFIcon name="plus" size={14}/></button>
              </div>
            ))}
          </div>
        </div>

        {/* Pay method */}
        <div style={{ padding: '0 20px 16px' }}>
          <div className="lbl" style={{ marginBottom: 8 }}>Pay with</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {[
              ["wallet", "Cash", true],
              ["qr",     "UPI", false],
              ["zap",    "Tap card", false],
              ["plus",   "Comp", false],
            ].map(([icon, l, on], i) => (
              <div key={i} className="hf-card" style={{
                padding: 10,
                borderRadius: 10,
                borderColor: on ? HFQ_ACC : HFQ_LINE,
                background: on ? HFQ_ACC_2 : '#fff',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              }}>
                <HFIcon name={icon} size={18} style={{ color: on ? HFQ_ACC : HFQ_INK }}/>
                <span style={{ fontSize: 11, fontWeight: 600 }}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div style={{ padding: '0 20px 16px' }}>
          <div className="hf-card" style={{ padding: 14, borderRadius: 10, background: '#fafafa' }}>
            <div className="hf-row" style={{ padding: '4px 0' }}>
              <span className="hf-mono" style={{ fontSize: 12, color: HFQ_INK_3, flex: 1 }}>2 × Regular</span>
              <span className="hf-mono" style={{ fontSize: 12 }}>₹1,000</span>
            </div>
            <div className="hf-row" style={{ padding: '4px 0' }}>
              <span className="hf-mono" style={{ fontSize: 12, color: HFQ_INK_3, flex: 1 }}>Booking fee</span>
              <span className="hf-mono" style={{ fontSize: 12, color: HFQ_ACC }}>waived (POS)</span>
            </div>
            <div className="hf-divider" style={{ margin: '8px 0' }}></div>
            <div className="hf-row">
              <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>Total</span>
              <span className="hf-mono" style={{ fontSize: 18, fontWeight: 600 }}>₹1,000</span>
            </div>
          </div>
        </div>

        {/* Buyer (optional) */}
        <div style={{ padding: '0 20px 16px' }}>
          <div className="lbl" style={{ marginBottom: 8 }}>Buyer (optional)</div>
          <div className="hf-card" style={{ padding: 12, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <HFIcon name="user" size={16} style={{ color: HFQ_INK_3 }}/>
            <span style={{ fontSize: 13, color: HFQ_INK_3, flex: 1 }}>Name / phone for receipt</span>
            <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>skip</span>
          </div>
        </div>

        <div style={{ height: 100 }}></div>
      </div>

      {/* Charge */}
      <div style={{ borderTop: `1px solid ${HFQ_LINE}`, background: '#fff', padding: '14px 20px 28px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="hf-btn" style={{ flex: 1, padding: 14, borderRadius: 10 }}>Print receipt</button>
        <button className="hf-btn accent" style={{ flex: 2, padding: 14, borderRadius: 10 }}>
          Charge ₹1,000 <HFIcon name="arrowR" size={16}/>
        </button>
      </div>
    </HFPhone>
  );
}

window.QuietOrgDash = QuietOrgDash;
window.QuietScanner = QuietScanner;
window.QuietPOS = QuietPOS;
