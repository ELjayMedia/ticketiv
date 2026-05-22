// Desktop super-admin · Quiet direction
// Sidebar + Org detail, Providers, Feature flags, Audit log, Jobs queue, Webhooks, DB.

// ─── Shared super-admin sidebar ───
function QSASidebar({ active = 'overview' }) {
  const items = [
    ['overview',  'spark',    'Overview',      null],
    ['orgs',      'cal',      'Organizations', '184'],
    ['providers', 'wallet',   'Providers',     null],
    ['admins',    'user',     'Admins & roles',null],
    ['flags',     'filter',   'Feature flags', '24'],
    ['catalog',   'fileText', 'Action catalog',null],
    ['audit',     'fileText', 'Audit log',     null],
    ['jobs',      'zap',      'Jobs queue',    '142'],
    ['webhooks',  'globe',    'Webhooks',      null],
    ['db',        'wallet',   'DB · Supabase', null],
  ];
  return (
    <div style={{ width: 220, background: '#fff', borderRight: `1px solid ${HFQ_LINE}`, padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 4, overflow: 'auto', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px 12px' }}>
        <div style={{ width: 22, height: 22, borderRadius: 6, background: HFQ_INK, color: HFQ_ACC, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>T</div>
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.02em' }}>ticketiv</span>
        <span className="hf-mono" style={{ fontSize: 9, padding: '2px 5px', background: HFQ_INK, color: HFQ_ACC, borderRadius: 4, fontWeight: 600, letterSpacing: '0.04em' }}>ADM</span>
      </div>
      <div style={{ fontSize: 10, color: HFQ_INK_3, padding: '8px 10px 4px', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Platform</div>
      {items.map(([id, ic, l, c]) => {
        const on = active === id;
        return (
          <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', borderRadius: 8, background: on ? HFQ_ACC_2 : 'transparent', color: on ? HFQ_ACC : HFQ_INK_2, fontSize: 13, fontWeight: on ? 600 : 500 }}>
            <HFIcon name={ic} size={16}/>
            <span style={{ flex: 1 }}>{l}</span>
            {c && <span className="hf-mono" style={{ fontSize: 10, color: on ? HFQ_ACC : HFQ_INK_3, padding: '1px 6px', background: '#fafafa', borderRadius: 4, fontWeight: 600 }}>{c}</span>}
          </div>
        );
      })}
      <div style={{ marginTop: 'auto', padding: '12px 8px 4px', borderTop: `1px solid ${HFQ_LINE}` }}>
        <div className="hf-row" style={{ gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 999, background: HFQ_INK, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>SM</div>
          <div className="hf-col" style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Smit M.</span>
            <span className="hf-mono" style={{ fontSize: 9, color: HFQ_INK_3 }}>super_admin · MFA on</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Small sparkline helper used in multiple screens
function QSASpark({ data, w = 80, h = 22, color }) {
  const c = color || HFQ_ACC;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={c} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  );
}

// Status dot
function QSADot({ k }) {
  const c = k === 'ok' ? '#1e9c63' : k === 'degraded' ? '#c1841c' : k === 'down' ? '#ef4444' : HFQ_INK_3;
  return <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: 999, background: c, marginRight: 6, verticalAlign: 'middle' }}></span>;
}

// ─── 1) Organizations table (broad) ───
function QuietDeskSuperOrgs() {
  const rows = [
    ["River Sound Org",   'rso',  'Pro',      '1',  '₹14.6L', 12.4, ['seated', 'resale', 'payout_hold'], 'pending', 'IND', 'Smit M.'],
    ["The Loft",          'lof',  'Pro',      '8',  '₹2.4L',  5.1,  ['resale', 'pos'],                   'paid',    'IND', 'Self-serve'],
    ["Comedy Co.",        'com',  'Standard', '12', '₹1.1L',  2.8,  ['—'],                               'paid',    'IND', 'Self-serve'],
    ["Rishabh's Events",  'ris',  'Standard', '3',  '₹91k',   1.4,  ['seated', 'resale'],                'paid',    'IND', 'Self-serve'],
    ["Local Fest",        'lcf',  'Starter',  '2',  '₹38k',   0.6,  ['beta_kiosk'],                      'paid',    'IND', 'Self-serve'],
    ["Studio X",          'stx',  'Standard', '6',  '₹52k',   0.9,  ['—'],                               'paused',  'IND', 'Smit M.'],
    ["Northwind Arts",    'nwa',  'Pro',      '11', '₹3.8L',  6.2,  ['seated', 'multi_venue'],           'paid',    'IND', 'Self-serve'],
    ["Klub Echo",         'kec',  'Standard', '4',  '₹62k',   1.1,  ['pos'],                             'paid',    'IND', 'Self-serve'],
    ["Mehfil Co.",        'meh',  'Pro',      '9',  '₹1.9L',  3.4,  ['seated'],                          'paid',    'IND', 'Self-serve'],
    ["Indigo Yards",      'ind',  'Starter',  '1',  '₹18k',   0.3,  ['—'],                               'pending', 'IND', 'Auto-review'],
    ["Curated Live",      'cur',  'Pro',      '7',  '₹2.1L',  4.0,  ['resale', 'whitelabel'],            'paid',    'IND', 'Self-serve'],
    ["Sunrise Open Mic",  'sun',  'Starter',  '14', '₹46k',   0.7,  ['—'],                               'paid',    'IND', 'Self-serve'],
  ];
  return (
    <HFBrowser url="admin.ticketiv.com/_platform/orgs" tabs={["Organizations · super-admin"]}>
      <div className="hf-quiet" style={{ background: '#fafafa', display: 'flex', minHeight: '100%' }}>
        <QSASidebar active="orgs"/>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <QOTopBar
            crumb="PLATFORM › ORGANIZATIONS"
            title="184 organizations"
            right={<div className="hf-row" style={{ gap: 8 }}>
              <button className="hf-btn xs"><HFIcon name="download" size={12}/> Export CSV</button>
              <button className="hf-btn accent xs"><HFIcon name="plus" size={12}/> Invite organizer</button>
            </div>}
          />

          <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="hf-row" style={{ gap: 14 }}>
              <KPI l="Active orgs"      v="184" d="+6"  dir="up"/>
              <KPI l="New · 7d"         v="6"   sub="3 self-serve, 3 invited"/>
              <KPI l="Suspended"        v="3"   sub="2 fraud_review, 1 chargeback"/>
              <KPI l="Avg events · org" v="6.4"/>
              <KPI l="P50 GMV · org"    v="₹71k" d="+4%" dir="up"/>
            </div>

            <div className="hf-card" style={{ borderRadius: 12 }}>
              <div className="hf-between" style={{ padding: '12px 16px', borderBottom: `1px solid ${HFQ_LINE}`, gap: 10 }}>
                <div className="hf-row" style={{ gap: 8, flex: 1 }}>
                  <div style={{ background: '#fafafa', border: `1px solid ${HFQ_LINE_2}`, borderRadius: 8, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 6, width: 280 }}>
                    <HFIcon name="search" size={14} style={{ color: HFQ_INK_3 }}/>
                    <span style={{ fontSize: 12, color: HFQ_INK_3 }}>Search org name, slug, owner email…</span>
                    <span className="hf-mono" style={{ fontSize: 9, color: HFQ_INK_3, marginLeft: 'auto' }}>⌘K</span>
                  </div>
                  <div className="hf-seg" style={{ borderRadius: 8 }}>
                    <span className="on">All</span><span>Live</span><span>Pending</span><span>Paused</span>
                  </div>
                  <div className="hf-seg" style={{ borderRadius: 8 }}>
                    <span className="on">All plans</span><span>Pro</span><span>Standard</span><span>Starter</span>
                  </div>
                </div>
                <div className="hf-row" style={{ gap: 8 }}>
                  <button className="hf-btn xs"><HFIcon name="filter" size={12}/> Filters · 0</button>
                  <button className="hf-btn xs">Columns</button>
                </div>
              </div>

              <div style={{ padding: '10px 16px', display: 'grid', gridTemplateColumns: '2fr 0.7fr 0.6fr 0.9fr 1fr 1.4fr 0.8fr 0.9fr 0.4fr', gap: 10, fontSize: 10, color: HFQ_INK_3, fontFamily: 'var(--hf-font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, background: '#fafafa', borderBottom: `1px solid ${HFQ_LINE}` }}>
                <span>Organization</span><span>Plan</span><span>Live</span><span>7d gross</span><span>Trend · 14d</span><span>Flags</span><span>Status</span><span>Owner / KAM</span><span></span>
              </div>

              {rows.map((r, i) => {
                const trend = Array.from({ length: 12 }, (_, k) => Math.sin(k * 0.6 + i) * 4 + 10 + i);
                return (
                  <div key={r[1]} style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '2fr 0.7fr 0.6fr 0.9fr 1fr 1.4fr 0.8fr 0.9fr 0.4fr', gap: 10, alignItems: 'center', borderBottom: i < rows.length - 1 ? `1px solid ${HFQ_LINE}` : 0, fontSize: 12, background: i === 0 ? '#fafafa' : '#fff' }}>
                    <div className="hf-row" style={{ gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: HFQ_ACC_2, color: HFQ_ACC, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{r[0].split(' ').map(w => w[0]).slice(0, 2).join('')}</div>
                      <div className="hf-col">
                        <span style={{ fontWeight: 600 }}>{r[0]}</span>
                        <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>org_{r[1]} · {r[8]}</span>
                      </div>
                    </div>
                    <span className="hf-mono" style={{ color: HFQ_INK_3 }}>{r[2]}</span>
                    <span className="hf-mono">{r[3]}</span>
                    <span className="hf-mono" style={{ fontWeight: 600 }}>{r[4]}</span>
                    <QSASpark data={trend} w={84} h={22}/>
                    <div className="hf-row" style={{ gap: 4, flexWrap: 'wrap' }}>
                      {r[6].map((f, j) => <span key={j} className="hf-mono" style={{ fontSize: 9, padding: '1px 5px', background: f === 'payout_hold' ? '#fdf0ec' : '#fafafa', color: f === 'payout_hold' ? '#c1422b' : HFQ_INK_3, borderRadius: 4, border: `1px solid ${HFQ_LINE}` }}>{f}</span>)}
                    </div>
                    <QOBadge k={r[7] === 'paid' ? 'paid' : r[7] === 'pending' ? 'pending' : 'paused'}>{r[7].toUpperCase()}</QOBadge>
                    <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>{r[9]}</span>
                    <HFIcon name="chevR" size={14} style={{ color: HFQ_INK_3, justifySelf: 'end' }}/>
                  </div>
                );
              })}

              <div className="hf-between" style={{ padding: '10px 16px', fontSize: 11, color: HFQ_INK_3, background: '#fafafa', borderTop: `1px solid ${HFQ_LINE}` }}>
                <span className="hf-mono">Showing 1–12 of 184</span>
                <div className="hf-row" style={{ gap: 6 }}>
                  <button className="hf-btn xs">‹ Prev</button>
                  {['1', '2', '3', '…', '16'].map((p, i) => (
                    <button key={i} className="hf-btn xs" style={{ background: p === '1' ? HFQ_INK : '#fff', color: p === '1' ? '#fff' : HFQ_INK, border: `1px solid ${p === '1' ? HFQ_INK : HFQ_LINE_2}`, minWidth: 28, justifyContent: 'center' }}>{p}</button>
                  ))}
                  <button className="hf-btn xs">Next ›</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </HFBrowser>
  );
}

// ─── 2) Providers (payments) ───
function QuietDeskSuperProviders() {
  return (
    <HFBrowser url="admin.ticketiv.com/_platform/providers" tabs={["Providers · super-admin"]}>
      <div className="hf-quiet" style={{ background: '#fafafa', display: 'flex', minHeight: '100%' }}>
        <QSASidebar active="providers"/>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <QOTopBar
            crumb="PLATFORM › PAYMENT PROVIDERS"
            title="Provider routing"
            right={<div className="hf-row" style={{ gap: 8 }}>
              <button className="hf-btn xs"><HFIcon name="zap" size={12}/> Run health check</button>
              <button className="hf-btn accent xs"><HFIcon name="plus" size={12}/> Add provider</button>
            </div>}
          />

          <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="hf-row" style={{ gap: 14 }}>
              <KPI l="Active providers"  v="4"    sub="3 ok · 1 degraded"/>
              <KPI l="24h success rate"  v="97.4%" d="+0.2pp" dir="up"/>
              <KPI l="24h volume"        v="14,208"/>
              <KPI l="Avg P95 latency"   v="742 ms"/>
              <KPI l="Webhook backlog"   v="34" d="+12" dir="down"/>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
              <div className="hf-card" style={{ borderRadius: 12 }}>
                <div className="hf-between" style={{ padding: '14px 18px', borderBottom: `1px solid ${HFQ_LINE}` }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Routing rules · live</span>
                  <button className="hf-btn xs"><HFIcon name="plus" size={12}/> Add rule</button>
                </div>
                {[
                  ['IF country = IN AND amount ≤ ₹5000',    'Paystack',    '92%', 'Primary'],
                  ['IF country = IN AND amount > ₹5000',    'DeltaPay',    '6%',  'Higher limits'],
                  ['IF country = NG',                       'Flutterwave', '1%',  'NGN only'],
                  ['IF method = manual_bank',               'Manual',      '1%',  'Approved on review'],
                  ['FALLBACK on 5xx within 8s',             'DeltaPay',    '—',   'Retry, then Paystack'],
                ].map((r, i, a) => (
                  <div key={i} className="hf-row" style={{ padding: '12px 18px', gap: 12, alignItems: 'center', borderBottom: i < a.length - 1 ? `1px solid ${HFQ_LINE}` : 0 }}>
                    <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3, width: 18 }}>{String(i + 1).padStart(2, '0')}</span>
                    <span className="hf-mono" style={{ fontSize: 12, color: HFQ_INK_2, flex: 1.4 }}>{r[0]}</span>
                    <HFIcon name="arrowR" size={12} style={{ color: HFQ_INK_3 }}/>
                    <span style={{ fontSize: 12, fontWeight: 600, flex: 0.6 }}>{r[1]}</span>
                    <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3, flex: 0.3 }}>{r[2]}</span>
                    <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3, flex: 0.9 }}>{r[3]}</span>
                    <span style={{ color: HFQ_INK_3, fontSize: 16, letterSpacing: 2 }}>···</span>
                  </div>
                ))}
              </div>

              <div className="hf-card" style={{ padding: 18, borderRadius: 12 }}>
                <div className="hf-between" style={{ marginBottom: 14 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Success rate · 24h</span>
                  <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>by provider</span>
                </div>
                <div className="hf-col" style={{ gap: 14 }}>
                  {[
                    ['Paystack',    98.7, [98, 99, 99, 98, 99, 98, 99, 99, 98, 99, 99, 99]],
                    ['DeltaPay',    94.2, [96, 94, 92, 90, 88, 91, 94, 95, 93, 94, 94, 94]],
                    ['Flutterwave', 99.1, [99, 99, 100, 98, 99, 99, 99, 99, 99, 100, 99, 99]],
                    ['Manual',      100,  [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100]],
                  ].map(([n, v, d]) => (
                    <div key={n}>
                      <div className="hf-between" style={{ marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}><QSADot k={v >= 97 ? 'ok' : v >= 90 ? 'degraded' : 'down'}/>{n}</span>
                        <span className="hf-mono" style={{ fontSize: 12, fontWeight: 600 }}>{v}%</span>
                      </div>
                      <QSASpark data={d} w={300} h={20} color={v >= 97 ? HFQ_ACC : v >= 90 ? '#c1841c' : '#ef4444'}/>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="hf-card" style={{ borderRadius: 12 }}>
              <div className="hf-between" style={{ padding: '14px 18px', borderBottom: `1px solid ${HFQ_LINE}` }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>Provider catalog</span>
                <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>secrets stored in Supabase Vault · keys rotated every 90d</span>
              </div>
              <div style={{ padding: '10px 18px', display: 'grid', gridTemplateColumns: '1.4fr 0.8fr 1fr 0.8fr 0.8fr 0.8fr 0.6fr 0.4fr', gap: 10, fontSize: 10, color: HFQ_INK_3, fontFamily: 'var(--hf-font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, background: '#fafafa', borderBottom: `1px solid ${HFQ_LINE}` }}>
                <span>Provider</span><span>Mode</span><span>Webhook · last 24h</span><span>P95</span><span>Refund SLA</span><span>Keys rotate</span><span>State</span><span></span>
              </div>
              {[
                ['Paystack',      'live',    '12,482 / 12,488', '612 ms', '3 days', '34d ago', 'ok'],
                ['DeltaPay',      'live',    '2,108 / 2,220',   '1.4 s',  '5 days', '61d ago', 'degraded'],
                ['Flutterwave',   'live',    '618 / 622',       '420 ms', '2 days', '12d ago', 'ok'],
                ['Manual / bank', 'manual',  '—',                '—',     '—',      '—',       'ok'],
                ['Stripe (US)',   'sandbox', '0 / 0',            '—',     '—',      'never',   'paused'],
              ].map((r, i, a) => (
                <div key={i} style={{ padding: '14px 18px', display: 'grid', gridTemplateColumns: '1.4fr 0.8fr 1fr 0.8fr 0.8fr 0.8fr 0.6fr 0.4fr', gap: 10, alignItems: 'center', borderBottom: i < a.length - 1 ? `1px solid ${HFQ_LINE}` : 0, fontSize: 12 }}>
                  <div className="hf-row" style={{ gap: 10 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 6, background: HFQ_ACC_2, color: HFQ_ACC, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{r[0][0]}</div>
                    <span style={{ fontWeight: 600 }}>{r[0]}</span>
                  </div>
                  <span className="hf-mono"><QSADot k={r[1] === 'sandbox' ? 'degraded' : 'ok'}/>{r[1]}</span>
                  <span className="hf-mono" style={{ color: HFQ_INK_3 }}>{r[2]}</span>
                  <span className="hf-mono">{r[3]}</span>
                  <span className="hf-mono">{r[4]}</span>
                  <span className="hf-mono" style={{ color: HFQ_INK_3 }}>{r[5]}</span>
                  <QOBadge k={r[6] === 'ok' ? 'paid' : r[6] === 'degraded' ? 'pending' : 'paused'}>{r[6].toUpperCase()}</QOBadge>
                  <HFIcon name="chevR" size={14} style={{ color: HFQ_INK_3, justifySelf: 'end' }}/>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </HFBrowser>
  );
}

// ─── 3) Feature flags ───
function QuietDeskSuperFlags() {
  const flags = [
    ['seated_chart_v2',        'rollout', 38, 'Render seating with new SVG engine. Faster, supports zones.',  ['River Sound', 'Mehfil Co.', '+ 12'],          'shipping/seated-v2', 'Smit M.',  '2d ago'],
    ['resale_marketplace',     'live',    100, 'Allow attendees to resell tickets at face value + 6% fee.',    ['184 orgs'],                                   'growth/resale',      'Aanya R.', '14d ago'],
    ['waitlist_autoinvite',    'rollout', 62, 'Auto-DM waitlisted users when stock returns. Throttled.',      ['Pro plan'],                                   'growth/waitlist',    'Smit M.',  '4d ago'],
    ['kiosk_offline_scan',     'beta',    8,  'Cache 10k tickets locally; reconcile on reconnect.',           ['Local Fest', 'Klub Echo'],                    'ops/kiosk',          'Dev S.',   '1d ago'],
    ['ai_event_descriptions',  'beta',    4,  'GPT-assisted event copy with brand voice presets.',            ['Curated Live'],                               'growth/ai',          'Aanya R.', '7h ago'],
    ['payout_instant',         'rollout', 22, 'T+0 payouts via DeltaPay Fast for Pro orgs.',                  ['Pro plan ≥ ₹2L MRR'],                         'finance/payouts',    'Finance',  '9d ago'],
    ['multi_currency_v1',      'paused',  0,  'Display + settle in INR/USD/NGN. Awaiting RBI ruling.',        ['—'],                                          'finance/fx',         'Compliance','—'],
    ['attendee_chat',          'paused',  0,  'In-app DM between attendees of same event.',                   ['—'],                                          'social/chat',        'Aanya R.', '21d ago'],
    ['referral_credit',        'live',    100, 'Give ₹100 platform credit when invited attendee buys.',       ['184 orgs'],                                   'growth/referral',    'Aanya R.', '30d ago'],
    ['custom_domain',          'live',    100, 'White-label org subdomain → custom CNAME.',                   ['Pro plan'],                                   'platform/dns',       'Smit M.',  '60d ago'],
  ];
  return (
    <HFBrowser url="admin.ticketiv.com/_platform/flags" tabs={["Feature flags · super-admin"]}>
      <div className="hf-quiet" style={{ background: '#fafafa', display: 'flex', minHeight: '100%' }}>
        <QSASidebar active="flags"/>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <QOTopBar
            crumb="PLATFORM › FEATURE FLAGS"
            title="24 flags"
            right={<div className="hf-row" style={{ gap: 8 }}>
              <div className="hf-seg" style={{ borderRadius: 8 }}>
                <span className="on">All · 24</span><span>Live · 9</span><span>Rolling · 4</span><span>Beta · 3</span><span>Paused · 8</span>
              </div>
              <button className="hf-btn xs"><HFIcon name="download" size={12}/> Snapshot</button>
              <button className="hf-btn accent xs"><HFIcon name="plus" size={12}/> New flag</button>
            </div>}
          />

          <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="hf-card" style={{ padding: 18, borderRadius: 12, background: 'linear-gradient(180deg, #faf7ff 0%, #fff 80%)' }}>
              <div className="hf-row" style={{ gap: 14, alignItems: 'flex-start' }}>
                <HFIcon name="zap" size={18} style={{ color: HFQ_ACC, marginTop: 2 }}/>
                <div className="hf-col" style={{ flex: 1, gap: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>2 flags in rollout</span>
                  <span style={{ fontSize: 12, color: HFQ_INK_2, lineHeight: 1.5 }}>
                    <code className="hf-mono" style={{ background: HFQ_ACC_2, color: HFQ_ACC, padding: '1px 6px', borderRadius: 4 }}>seated_chart_v2</code> is at 38% — error rate 0.04% (below kill-switch threshold).{' '}
                    Next milestone <span className="hf-mono">+10% on Fri</span> if SLO holds.
                  </span>
                </div>
                <button className="hf-btn xs">View rollout plan</button>
              </div>
            </div>

            <div className="hf-card" style={{ borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '10px 18px', display: 'grid', gridTemplateColumns: '1.7fr 0.7fr 1.2fr 1.6fr 1.2fr 0.9fr 0.8fr', gap: 10, fontSize: 10, color: HFQ_INK_3, fontFamily: 'var(--hf-font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, background: '#fafafa', borderBottom: `1px solid ${HFQ_LINE}` }}>
                <span>Flag · description</span><span>State</span><span>Rollout %</span><span>Targets</span><span>Owner / changelog</span><span>Updated</span><span></span>
              </div>
              {flags.map((f, i) => (
                <div key={f[0]} style={{ padding: '14px 18px', display: 'grid', gridTemplateColumns: '1.7fr 0.7fr 1.2fr 1.6fr 1.2fr 0.9fr 0.8fr', gap: 10, alignItems: 'center', borderBottom: i < flags.length - 1 ? `1px solid ${HFQ_LINE}` : 0 }}>
                  <div className="hf-col" style={{ gap: 2 }}>
                    <span className="hf-mono" style={{ fontSize: 12, fontWeight: 600, color: HFQ_INK }}>{f[0]}</span>
                    <span style={{ fontSize: 11, color: HFQ_INK_3, lineHeight: 1.4 }}>{f[3]}</span>
                  </div>
                  <QOBadge k={f[1] === 'live' ? 'paid' : f[1] === 'rollout' ? 'pending' : f[1] === 'beta' ? 'pending' : 'paused'}>{f[1].toUpperCase()}</QOBadge>
                  <div className="hf-row" style={{ gap: 8 }}>
                    <div style={{ flex: 1, height: 8, background: HFQ_LINE, borderRadius: 999, position: 'relative' }}>
                      <div style={{ position: 'absolute', inset: 0, width: `${f[2]}%`, background: f[1] === 'paused' ? HFQ_INK_3 : f[1] === 'live' ? HFQ_ACC : '#c1841c', borderRadius: 999 }}></div>
                    </div>
                    <span className="hf-mono" style={{ fontSize: 11, fontWeight: 600, width: 32, textAlign: 'right' }}>{f[2]}%</span>
                  </div>
                  <div className="hf-row" style={{ gap: 4, flexWrap: 'wrap' }}>
                    {f[4].map((t, j) => <span key={j} className="hf-mono" style={{ fontSize: 10, padding: '1px 6px', background: '#fafafa', color: HFQ_INK_2, borderRadius: 4, border: `1px solid ${HFQ_LINE}` }}>{t}</span>)}
                  </div>
                  <div className="hf-col" style={{ gap: 2 }}>
                    <span style={{ fontSize: 11, color: HFQ_INK_2 }}>{f[6]}</span>
                    <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>{f[5]}</span>
                  </div>
                  <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>{f[7]}</span>
                  <div className="hf-row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                    <button className="hf-btn xs">Edit</button>
                    <button className="hf-btn xs" style={{ background: f[1] === 'paused' ? HFQ_ACC : '#fff', color: f[1] === 'paused' ? '#fff' : HFQ_INK_3, borderColor: f[1] === 'paused' ? HFQ_ACC : HFQ_LINE_2 }}>{f[1] === 'paused' ? 'Resume' : 'Kill'}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </HFBrowser>
  );
}

// ─── 4) Audit log ───
function QuietDeskSuperAudit() {
  const sev = (k) => k === 'high' ? '#ef4444' : k === 'warn' ? '#c1841c' : HFQ_INK_3;
  const events = [
    ['09:42:18', 'GET',  'org.payout_hold.lift',     'River Sound Org',     'Smit M.',     'super_admin', 'high', '203.0.113.41', 'Manual review · KYC matched · 2-of-2 approved'],
    ['09:38:04', 'POST', 'flag.rollout.update',      'seated_chart_v2 → 38%','Smit M.',    'super_admin', 'low',  '203.0.113.41', 'Bumped from 28% → 38%. SLO check passed.'],
    ['09:31:55', 'POST', 'provider.key.rotate',      'DeltaPay · live key', 'Dev S.',      'platform_eng','high', '198.51.100.7', 'Old key archived. Webhook re-sub queued.'],
    ['09:14:02', 'POST', 'org.suspend',              'Studio X',            'Smit M.',     'super_admin', 'warn', '203.0.113.41', 'Chargeback ratio > 1.4% over 30d.'],
    ['08:59:11', 'POST', 'refund.manual',            'ord_RT1942 · ₹3,400', 'Aanya R.',    'support_lead','low',  '198.51.100.21','Customer reported double-charge. Confirmed via Paystack.'],
    ['08:42:32', 'POST', 'admin.invite',             'rohit@ticketiv.com',  'Aanya R.',    'support_lead','low',  '198.51.100.21','Role: support_agent · IP scope: in_office'],
    ['08:21:50', 'POST', 'webhook.replay',           'pst_evt_8a1f · ×8',   'system',      'cron',        'warn', '—',           'Auto-retry of failed webhooks > 1h old.'],
    ['07:55:13', 'POST', 'feature.kill',             'attendee_chat',       'Aanya R.',    'support_lead','warn', '198.51.100.21','PII concern · 21d on hold.'],
    ['07:12:08', 'DEL',  'admin.session.revoke',     'rohit@ticketiv.com',  'Smit M.',     'super_admin', 'high', '203.0.113.41', '2 active sessions terminated.'],
    ['06:48:00', 'POST', 'db.migration.run',         'v2026.05.21_seating', 'Dev S.',      'platform_eng','high', '198.51.100.7', '4 tables, 0 destructive. RLS re-verified.'],
  ];
  return (
    <HFBrowser url="admin.ticketiv.com/_platform/audit" tabs={["Audit log · super-admin"]}>
      <div className="hf-quiet" style={{ background: '#fafafa', display: 'flex', minHeight: '100%' }}>
        <QSASidebar active="audit"/>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <QOTopBar
            crumb="PLATFORM › AUDIT LOG · LAST 24H"
            title="Audit log"
            right={<div className="hf-row" style={{ gap: 8 }}>
              <div className="hf-seg" style={{ borderRadius: 8 }}>
                <span className="on">24h</span><span>7d</span><span>30d</span><span>Custom</span>
              </div>
              <button className="hf-btn xs"><HFIcon name="download" size={12}/> Export</button>
              <button className="hf-btn xs"><HFIcon name="filter" size={12}/> Stream</button>
            </div>}
          />

          <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="hf-row" style={{ gap: 14 }}>
              <KPI l="Events · 24h"   v="1,482"  d="+218" dir="up"/>
              <KPI l="High severity"  v="11"     sub="2 reviewed · 9 auto"/>
              <KPI l="Distinct actors" v="22"/>
              <KPI l="Failed actions" v="3"      sub="2× wrong scope · 1× IP block"/>
              <KPI l="Last destructive" v="3h"   sub="db.migration · Dev S."/>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
              <div className="hf-card" style={{ borderRadius: 12 }}>
                <div className="hf-between" style={{ padding: '12px 16px', borderBottom: `1px solid ${HFQ_LINE}` }}>
                  <div className="hf-row" style={{ gap: 8 }}>
                    <div style={{ background: '#fafafa', border: `1px solid ${HFQ_LINE_2}`, borderRadius: 8, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 6, width: 340 }}>
                      <HFIcon name="search" size={14} style={{ color: HFQ_INK_3 }}/>
                      <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>actor:smit@* action:org.* severity:&gt;=warn</span>
                    </div>
                    <button className="hf-btn xs">Saved filters · 4</button>
                  </div>
                  <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>1482 events · streaming ●</span>
                </div>

                {events.map((e, i, a) => (
                  <div key={i} style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '70px 50px 1fr 0.5fr 0.3fr', gap: 10, alignItems: 'flex-start', borderBottom: i < a.length - 1 ? `1px solid ${HFQ_LINE}` : 0, fontSize: 12, background: i === 0 ? '#fafafa' : '#fff' }}>
                    <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3, paddingTop: 2 }}>{e[0]}</span>
                    <span className="hf-mono" style={{ fontSize: 9, color: HFQ_ACC, fontWeight: 700, paddingTop: 2 }}>{e[1]}</span>
                    <div className="hf-col" style={{ gap: 2 }}>
                      <div className="hf-row" style={{ gap: 8 }}>
                        <span className="hf-mono" style={{ fontWeight: 600, fontSize: 12 }}>{e[2]}</span>
                        <span className="hf-mono" style={{ fontSize: 11, color: HFQ_INK_3 }}>· {e[3]}</span>
                      </div>
                      <span style={{ fontSize: 11, color: HFQ_INK_2, lineHeight: 1.4 }}>{e[8]}</span>
                    </div>
                    <div className="hf-col" style={{ gap: 2, fontSize: 10 }}>
                      <span style={{ color: HFQ_INK_2 }}>{e[4]}</span>
                      <span className="hf-mono" style={{ color: HFQ_INK_3 }}>{e[5]} · {e[7]}</span>
                    </div>
                    <span className="hf-mono" style={{ fontSize: 9, padding: '2px 6px', background: '#fafafa', color: sev(e[6]), borderRadius: 4, fontWeight: 600, border: `1px solid ${HFQ_LINE}`, justifySelf: 'end', alignSelf: 'flex-start' }}>{e[6].toUpperCase()}</span>
                  </div>
                ))}
              </div>

              <div className="hf-col" style={{ gap: 14 }}>
                <div className="hf-card" style={{ padding: 18, borderRadius: 12 }}>
                  <div className="hf-between" style={{ marginBottom: 12 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>Activity heatmap</span>
                    <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>last 7 days · IST</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto repeat(24, 1fr)', gap: 2, alignItems: 'center' }}>
                    {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d, di) => (
                      <React.Fragment key={d}>
                        <span className="hf-mono" style={{ fontSize: 9, color: HFQ_INK_3, paddingRight: 6 }}>{d}</span>
                        {Array.from({ length: 24 }).map((_, hi) => {
                          const v = (Math.sin(di * 1.3 + hi * 0.6) + 1) / 2 * (hi > 8 && hi < 22 ? 1 : 0.3);
                          return <div key={hi} style={{ aspectRatio: '1', background: v > 0.6 ? HFQ_ACC : v > 0.3 ? '#c8b3e8' : v > 0.1 ? HFQ_ACC_2 : '#f1efec', borderRadius: 2 }}></div>;
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                <div className="hf-card" style={{ padding: 18, borderRadius: 12 }}>
                  <div className="hf-between" style={{ marginBottom: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>Top actors · 7d</span>
                    <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>by event count</span>
                  </div>
                  {[
                    ['Smit M.',     'super_admin',  482, 0.92],
                    ['system · cron','automation',  318, 0.61],
                    ['Aanya R.',    'support_lead', 208, 0.40],
                    ['Dev S.',      'platform_eng', 142, 0.27],
                    ['Rohit P.',    'support_agent', 88, 0.17],
                  ].map(([n, r, c, w]) => (
                    <div key={n} className="hf-row" style={{ padding: '6px 0', gap: 10 }}>
                      <div style={{ width: 22, height: 22, borderRadius: 999, background: HFQ_INK, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>{n.split(' ').map(s => s[0]).slice(0, 2).join('')}</div>
                      <div className="hf-col" style={{ flex: 1, gap: 2 }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{n}</span>
                        <span className="hf-mono" style={{ fontSize: 9, color: HFQ_INK_3 }}>{r}</span>
                      </div>
                      <div style={{ width: 90, height: 6, background: HFQ_LINE, borderRadius: 999 }}>
                        <div style={{ height: '100%', width: `${w * 100}%`, background: HFQ_ACC, borderRadius: 999 }}></div>
                      </div>
                      <span className="hf-mono" style={{ fontSize: 11, fontWeight: 600, width: 36, textAlign: 'right' }}>{c}</span>
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

// ─── 5) Jobs queue ───
function QuietDeskSuperJobs() {
  const queues = [
    ['send_email_receipt',      'email',     22,   12492, 0,  98.8, 'ok',      [12,18,22,30,24,22,20,22,18,22,28,22]],
    ['scan_audit_replay',       'analytics', 8,    8400,  2,  99.1, 'ok',      [6,7,8,9,8,8,7,8,9,10,8,8]],
    ['payout_disbursement',     'finance',   4,    312,   0,  99.6, 'ok',      [3,3,4,5,4,4,4,4,3,4,4,4]],
    ['refund_provider_call',    'finance',   88,   1180,  12, 88.4, 'backlog', [40,52,60,68,72,80,82,84,86,88,88,88]],
    ['webhook_retry · deltapay','webhooks',  20,   2204,  8,  92.0, 'retry',   [12,14,18,22,24,20,18,22,20,18,20,20]],
    ['index_search_documents',  'search',    2,    9400,  0,  99.9, 'ok',      [2,3,2,2,2,3,2,2,2,2,2,2]],
    ['email_winback_drip',      'growth',    0,    14820, 0,  99.4, 'idle',    [0,0,0,0,0,0,0,0,0,0,0,0]],
    ['kyc_org_verify',          'compliance',1,    62,    0,  100,  'ok',      [0,1,1,2,1,1,1,1,1,1,1,1]],
    ['fraud_score_recompute',   'risk',      3,    18600, 0,  99.7, 'ok',      [2,3,3,2,3,4,3,3,3,3,3,3]],
  ];
  return (
    <HFBrowser url="admin.ticketiv.com/_platform/jobs" tabs={["Jobs queue · super-admin"]}>
      <div className="hf-quiet" style={{ background: '#fafafa', display: 'flex', minHeight: '100%' }}>
        <QSASidebar active="jobs"/>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <QOTopBar
            crumb="PLATFORM › BACKGROUND JOBS"
            title="142 open · 1 backlog"
            right={<div className="hf-row" style={{ gap: 8 }}>
              <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>auto-refresh ●</span>
              <button className="hf-btn xs"><HFIcon name="zap" size={12}/> Pause all</button>
              <button className="hf-btn xs"><HFIcon name="plus" size={12}/> Enqueue test</button>
            </div>}
          />

          <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="hf-row" style={{ gap: 14 }}>
              <KPI l="Open jobs"        v="142" d="−8" dir="down"/>
              <KPI l="Throughput · 1m"  v="612 jobs/m"/>
              <KPI l="Failed · 24h"     v="22"  d="+4" dir="down"/>
              <KPI l="P95 latency"      v="3.4 s"/>
              <KPI l="Workers"          v="14/16" sub="2 draining"/>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14 }}>
              <div className="hf-card" style={{ borderRadius: 12 }}>
                <div className="hf-between" style={{ padding: '12px 16px', borderBottom: `1px solid ${HFQ_LINE}` }}>
                  <div className="hf-row" style={{ gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>Queues</span>
                    <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>· 9 of 14</span>
                  </div>
                  <div className="hf-row" style={{ gap: 6 }}>
                    <div className="hf-seg" style={{ borderRadius: 8 }}>
                      <span className="on">All</span><span>Healthy</span><span>Backlog · 1</span><span>Retrying · 1</span>
                    </div>
                  </div>
                </div>
                <div style={{ padding: '10px 16px', display: 'grid', gridTemplateColumns: '1.6fr 0.7fr 0.6fr 0.8fr 0.5fr 0.6fr 1fr 0.8fr 0.5fr', gap: 10, fontSize: 10, color: HFQ_INK_3, fontFamily: 'var(--hf-font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, background: '#fafafa', borderBottom: `1px solid ${HFQ_LINE}` }}>
                  <span>Queue</span><span>Group</span><span>Depth</span><span>Done · 24h</span><span>Fail</span><span>Success</span><span>Trend</span><span>Status</span><span></span>
                </div>
                {queues.map((q, i) => (
                  <div key={q[0]} style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1.6fr 0.7fr 0.6fr 0.8fr 0.5fr 0.6fr 1fr 0.8fr 0.5fr', gap: 10, alignItems: 'center', borderBottom: i < queues.length - 1 ? `1px solid ${HFQ_LINE}` : 0, fontSize: 12, background: i === 3 ? '#fef9f5' : '#fff' }}>
                    <span className="hf-mono" style={{ fontWeight: 600 }}>{q[0]}</span>
                    <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>{q[1]}</span>
                    <span className="hf-mono" style={{ fontWeight: 600, color: q[2] > 60 ? '#ef4444' : q[2] > 20 ? '#c1841c' : HFQ_INK }}>{q[2]}</span>
                    <span className="hf-mono">{q[3].toLocaleString()}</span>
                    <span className="hf-mono" style={{ color: q[4] ? '#ef4444' : HFQ_INK_3 }}>{q[4]}</span>
                    <span className="hf-mono">{q[5]}%</span>
                    <QSASpark data={q[7]} w={88} h={20} color={q[6] === 'ok' ? HFQ_ACC : q[6] === 'backlog' ? '#ef4444' : q[6] === 'retry' ? '#c1841c' : HFQ_INK_3}/>
                    <QOBadge k={q[6] === 'ok' ? 'paid' : q[6] === 'backlog' ? 'failed' : q[6] === 'retry' ? 'pending' : 'draft'}>{q[6].toUpperCase()}</QOBadge>
                    <button className="hf-btn xs" style={{ justifySelf: 'end' }}>Open</button>
                  </div>
                ))}
              </div>

              <div className="hf-col" style={{ gap: 14 }}>
                <div className="hf-card" style={{ padding: 18, borderRadius: 12 }}>
                  <div className="hf-between" style={{ marginBottom: 12 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>Workers</span>
                    <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>region: ap-south-1</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                    {Array.from({ length: 16 }).map((_, i) => {
                      const status = i < 2 ? 'drain' : i < 14 ? 'busy' : 'idle';
                      return (
                        <div key={i} style={{ aspectRatio: '1', borderRadius: 6, background: status === 'busy' ? HFQ_ACC : status === 'drain' ? '#c1841c' : HFQ_LINE, color: status === 'idle' ? HFQ_INK_3 : '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, fontFamily: 'var(--hf-font-mono)' }}>w{String(i + 1).padStart(2, '0')}</div>
                      );
                    })}
                  </div>
                  <div className="hf-row" style={{ gap: 12, marginTop: 12, fontSize: 10, color: HFQ_INK_3 }}>
                    <span><span style={{ display: 'inline-block', width: 8, height: 8, background: HFQ_ACC, borderRadius: 2, marginRight: 4 }}></span>busy · 12</span>
                    <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#c1841c', borderRadius: 2, marginRight: 4 }}></span>drain · 2</span>
                    <span><span style={{ display: 'inline-block', width: 8, height: 8, background: HFQ_LINE, borderRadius: 2, marginRight: 4 }}></span>idle · 2</span>
                  </div>
                </div>

                <div className="hf-card" style={{ padding: 18, borderRadius: 12, background: '#fef9f5', borderColor: '#f1d6c2' }}>
                  <div className="hf-row" style={{ gap: 8, marginBottom: 8 }}>
                    <HFIcon name="zap" size={14} style={{ color: '#c1422b' }}/>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#c1422b' }}>Backlog alert</span>
                  </div>
                  <div className="hf-mono" style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>refund_provider_call</div>
                  <div style={{ fontSize: 11, color: HFQ_INK_2, lineHeight: 1.5, marginBottom: 10 }}>
                    Depth has grown 12× in the last hour. 88 jobs queued. Likely upstream: DeltaPay /refund 5xx (P95 4.2s).
                  </div>
                  <div className="hf-row" style={{ gap: 6 }}>
                    <button className="hf-btn xs">Scale workers +4</button>
                    <button className="hf-btn xs">Drain to DLQ</button>
                  </div>
                </div>

                <div className="hf-card" style={{ padding: 18, borderRadius: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Dead-letter queue</span>
                  <div className="hf-row" style={{ marginTop: 8, gap: 14 }}>
                    <div className="hf-col">
                      <span className="hf-mono" style={{ fontSize: 22, fontWeight: 600 }}>34</span>
                      <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>messages</span>
                    </div>
                    <div className="hf-col" style={{ flex: 1, gap: 4, fontSize: 11 }}>
                      <span><b>22</b> · webhook_retry</span>
                      <span><b>8</b>  · refund_provider_call</span>
                      <span><b>4</b>  · email_bounce_handle</span>
                    </div>
                  </div>
                  <button className="hf-btn xs" style={{ marginTop: 10 }}>Open DLQ</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </HFBrowser>
  );
}

// ─── 6) Webhooks ───
function QuietDeskSuperWebhooks() {
  const deliveries = [
    ['09:42:18', 'evt_8a1f',  'paystack.charge.success', 'River Sound Org',  '200', '128 ms', 1, 'ok'],
    ['09:42:14', 'evt_8a1e',  'paystack.charge.success', 'The Loft',         '200', '142 ms', 1, 'ok'],
    ['09:42:11', 'evt_8a1d',  'deltapay.refund.failed',  'River Sound Org',  '502', '4.2 s',  4, 'retry'],
    ['09:41:58', 'evt_8a1c',  'paystack.charge.success', 'Northwind Arts',   '200', '98 ms',  1, 'ok'],
    ['09:41:42', 'evt_8a1b',  'paystack.refund.success', 'Comedy Co.',       '200', '212 ms', 1, 'ok'],
    ['09:41:18', 'evt_8a1a',  'flutterwave.charge.fail', 'Curated Live',     '422', '88 ms',  1, 'fail'],
    ['09:40:55', 'evt_8a19',  'paystack.charge.success', 'Mehfil Co.',       '200', '102 ms', 1, 'ok'],
    ['09:40:32', 'evt_8a18',  'deltapay.charge.success', 'Studio X',         '200', '1.1 s',  2, 'ok'],
    ['09:40:08', 'evt_8a17',  'webhook.scan.report',     'system → Slack',   '200', '188 ms', 1, 'ok'],
    ['09:39:44', 'evt_8a16',  'deltapay.charge.success', 'Klub Echo',        '500', '5.0 s',  3, 'retry'],
    ['09:39:20', 'evt_8a15',  'paystack.charge.success', 'Rishabh\'s Events','200', '94 ms',  1, 'ok'],
    ['09:38:59', 'evt_8a14',  'paystack.dispute.opened', 'Studio X',         '200', '152 ms', 1, 'ok'],
  ];
  return (
    <HFBrowser url="admin.ticketiv.com/_platform/webhooks" tabs={["Webhooks · super-admin"]}>
      <div className="hf-quiet" style={{ background: '#fafafa', display: 'flex', minHeight: '100%' }}>
        <QSASidebar active="webhooks"/>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <QOTopBar
            crumb="PLATFORM › WEBHOOKS"
            title="Inbound & outbound deliveries"
            right={<div className="hf-row" style={{ gap: 8 }}>
              <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>tailing · live</span>
              <button className="hf-btn xs"><HFIcon name="zap" size={12}/> Replay selected</button>
              <button className="hf-btn accent xs"><HFIcon name="plus" size={12}/> New endpoint</button>
            </div>}
          />

          <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="hf-row" style={{ gap: 14 }}>
              <KPI l="Endpoints"      v="18"   sub="12 inbound · 6 outbound"/>
              <KPI l="Delivered · 24h"v="14,820"/>
              <KPI l="Failed"         v="148"  d="−4%" dir="up"/>
              <KPI l="Retrying"       v="34"   sub="next sweep 30s"/>
              <KPI l="P95 latency"    v="612 ms"/>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.5fr', gap: 14 }}>
              <div className="hf-card" style={{ borderRadius: 12 }}>
                <div className="hf-between" style={{ padding: '14px 16px', borderBottom: `1px solid ${HFQ_LINE}` }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Endpoints</span>
                  <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>signed · HMAC</span>
                </div>
                {[
                  ['paystack.webhook',    'inbound',  '✓', '12,492', 98.8, 'https://api.ticketiv.com/hooks/paystack'],
                  ['deltapay.webhook',    'inbound',  '✓', '2,220',  94.2, 'https://api.ticketiv.com/hooks/deltapay'],
                  ['flutterwave.webhook', 'inbound',  '✓', '622',    99.1, 'https://api.ticketiv.com/hooks/flutter'],
                  ['slack.ops.alerts',    'outbound', '✓', '188',    100,  'hooks.slack.com/services/T0…'],
                  ['orgs.zapier',         'outbound', '✓', '40',     97.5, 'org-defined · 8 orgs'],
                  ['analytics.snowplow',  'outbound', '!',  '4,820', 92.1, 'collector.snowplow.io'],
                ].map(([n, dir, ok, c, sr, url], i, a) => (
                  <div key={n} style={{ padding: '12px 16px', borderBottom: i < a.length - 1 ? `1px solid ${HFQ_LINE}` : 0 }}>
                    <div className="hf-between">
                      <div className="hf-row" style={{ gap: 6 }}>
                        <span className="hf-mono" style={{ fontSize: 12, fontWeight: 600 }}>{n}</span>
                        <span className="hf-mono" style={{ fontSize: 9, padding: '1px 5px', background: '#fafafa', color: HFQ_INK_3, borderRadius: 4, border: `1px solid ${HFQ_LINE}` }}>{dir}</span>
                      </div>
                      <span className="hf-mono" style={{ fontSize: 11, fontWeight: 600, color: sr >= 97 ? HFQ_ACC : sr >= 92 ? '#c1841c' : '#ef4444' }}>{sr}%</span>
                    </div>
                    <div className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</div>
                    <div className="hf-row" style={{ gap: 6, marginTop: 6, fontSize: 10, color: HFQ_INK_3 }}>
                      <span className="hf-mono">24h: {c}</span>
                      <span>·</span>
                      <span>Verifying HMAC</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hf-card" style={{ borderRadius: 12 }}>
                <div className="hf-between" style={{ padding: '12px 16px', borderBottom: `1px solid ${HFQ_LINE}` }}>
                  <div className="hf-row" style={{ gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>Deliveries</span>
                    <div className="hf-seg" style={{ borderRadius: 8 }}>
                      <span className="on">All</span><span>2xx</span><span>4xx</span><span>5xx</span><span>Retrying</span>
                    </div>
                  </div>
                  <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>live ●</span>
                </div>
                <div style={{ padding: '10px 16px', display: 'grid', gridTemplateColumns: '60px 80px 1.6fr 1.4fr 0.5fr 0.6fr 0.4fr 0.5fr', gap: 10, fontSize: 10, color: HFQ_INK_3, fontFamily: 'var(--hf-font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, background: '#fafafa', borderBottom: `1px solid ${HFQ_LINE}` }}>
                  <span>Time</span><span>Event</span><span>Topic</span><span>Target</span><span>HTTP</span><span>Latency</span><span>Try</span><span></span>
                </div>
                {deliveries.map((d, i) => (
                  <div key={d[1]} style={{ padding: '11px 16px', display: 'grid', gridTemplateColumns: '60px 80px 1.6fr 1.4fr 0.5fr 0.6fr 0.4fr 0.5fr', gap: 10, alignItems: 'center', borderBottom: i < deliveries.length - 1 ? `1px solid ${HFQ_LINE}` : 0, fontSize: 12 }}>
                    <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>{d[0]}</span>
                    <span className="hf-mono" style={{ fontSize: 10, color: HFQ_ACC }}>{d[1]}</span>
                    <span className="hf-mono" style={{ fontWeight: 600 }}>{d[2]}</span>
                    <span style={{ fontSize: 11 }}>{d[3]}</span>
                    <span className="hf-mono" style={{ fontWeight: 600, color: d[4].startsWith('2') ? HFQ_ACC : d[4].startsWith('4') ? '#c1422b' : '#ef4444' }}>{d[4]}</span>
                    <span className="hf-mono" style={{ color: HFQ_INK_3 }}>{d[5]}</span>
                    <span className="hf-mono" style={{ fontSize: 10, color: d[6] > 1 ? '#c1841c' : HFQ_INK_3 }}>{d[6]}/4</span>
                    <QOBadge k={d[7] === 'ok' ? 'paid' : d[7] === 'retry' ? 'pending' : 'failed'}>{d[7].toUpperCase()}</QOBadge>
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

// ─── 7) DB · Supabase ───
function QuietDeskSuperDB() {
  const tables = [
    ['organizations',  '184',     '2.4 MB',   '12 rls',  '4 idx', 'ok',     0.04, 4.1],
    ['users',          '128,420', '184 MB',   '8 rls',   '6 idx', 'ok',    12.4,  6.2],
    ['events',         '12,108',  '88 MB',    '14 rls',  '9 idx', 'ok',     2.1,  5.8],
    ['orders',         '4,820k',  '4.2 GB',   '18 rls',  '12 idx','ok',     42,   8.4],
    ['tickets',        '14,820k', '12.1 GB',  '22 rls',  '14 idx','ok',     128,  9.1],
    ['scans',          '8,420k',  '2.8 GB',   '4 rls',   '8 idx', 'warn',   62,   12.4],
    ['webhook_events', '2,100k',  '720 MB',   '2 rls',   '6 idx', 'ok',     22,   3.4],
    ['audit_log',      '1,482k',  '418 MB',   '24 rls',  '4 idx', 'ok',     12,   2.8],
    ['feature_flags',  '24',      '128 KB',   '2 rls',   '2 idx', 'ok',     0.01, 0.4],
    ['payouts',        '2,108',   '12 MB',    '8 rls',   '4 idx', 'ok',     0.4,  4.2],
  ];
  return (
    <HFBrowser url="admin.ticketiv.com/_platform/db" tabs={["DB · super-admin"]}>
      <div className="hf-quiet" style={{ background: '#fafafa', display: 'flex', minHeight: '100%' }}>
        <QSASidebar active="db"/>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <QOTopBar
            crumb="PLATFORM › SUPABASE · ap-south-1"
            title="Database health"
            right={<div className="hf-row" style={{ gap: 8 }}>
              <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>Postgres 16.2 · pgvector 0.6</span>
              <button className="hf-btn xs"><HFIcon name="download" size={12}/> Run pg_dump</button>
              <button className="hf-btn xs"><HFIcon name="zap" size={12}/> Open SQL editor</button>
            </div>}
          />

          <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="hf-row" style={{ gap: 14 }}>
              <KPI l="Storage"        v="20.1 GB" sub="of 100 GB · 20%"/>
              <KPI l="Active conns"   v="38/100"  sub="pool: pgbouncer"/>
              <KPI l="Replication"    v="46 ms"   sub="primary → read"/>
              <KPI l="Tx/s · 1m"      v="412"     d="+6%" dir="up"/>
              <KPI l="Last backup"    v="2h ago"  sub="PITR retains 7d"/>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <div className="hf-card" style={{ padding: 18, borderRadius: 12 }}>
                <div className="hf-between" style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>CPU · 1h</span>
                  <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>db.r6g.large</span>
                </div>
                <QSASpark data={[28,32,30,34,40,38,42,46,52,48,44,46,52,58,62,58,54,52,58,62]} w={300} h={60}/>
                <div className="hf-row" style={{ marginTop: 10, gap: 14, fontSize: 11 }}>
                  <span><span className="lbl">avg</span> <b className="hf-mono">46%</b></span>
                  <span><span className="lbl">peak</span> <b className="hf-mono">62%</b></span>
                  <span><span className="lbl">cores</span> <b className="hf-mono">8</b></span>
                </div>
              </div>
              <div className="hf-card" style={{ padding: 18, borderRadius: 12 }}>
                <div className="hf-between" style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Disk I/O · 1h</span>
                  <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>gp3 · 3 000 IOPS</span>
                </div>
                <QSASpark data={[120,180,160,200,240,220,260,300,320,380,420,360,320,380,440,480,420,380,420,460]} w={300} h={60} color="#c1841c"/>
                <div className="hf-row" style={{ marginTop: 10, gap: 14, fontSize: 11 }}>
                  <span><span className="lbl">read</span> <b className="hf-mono">218 MB/s</b></span>
                  <span><span className="lbl">write</span> <b className="hf-mono">62 MB/s</b></span>
                </div>
              </div>
              <div className="hf-card" style={{ padding: 18, borderRadius: 12 }}>
                <div className="hf-between" style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Slow queries · 1h</span>
                  <button className="hf-btn xs">View all · 18</button>
                </div>
                <div className="hf-col" style={{ gap: 8 }}>
                  {[
                    ['SELECT scans WHERE event_id = $1 ORDER BY ts',         '4.2 s', 12],
                    ['UPDATE orders SET status=$1 WHERE id IN (…)',          '1.8 s', 4],
                    ['SELECT tickets JOIN events JOIN seat_map',             '1.2 s', 8],
                  ].map(([q, t, n]) => (
                    <div key={q} className="hf-col" style={{ gap: 2 }}>
                      <div className="hf-between">
                        <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{q}</span>
                        <span className="hf-mono" style={{ fontSize: 10, fontWeight: 600, color: '#c1422b' }}>{t}</span>
                      </div>
                      <span className="hf-mono" style={{ fontSize: 9, color: HFQ_INK_3 }}>{n} occurrences · suggest index</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="hf-card" style={{ borderRadius: 12 }}>
              <div className="hf-between" style={{ padding: '14px 16px', borderBottom: `1px solid ${HFQ_LINE}` }}>
                <div className="hf-row" style={{ gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Tables · public schema</span>
                  <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>42 tables · 18.4 GB</span>
                </div>
                <div className="hf-row" style={{ gap: 8 }}>
                  <div style={{ background: '#fafafa', border: `1px solid ${HFQ_LINE_2}`, borderRadius: 8, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 6, width: 220 }}>
                    <HFIcon name="search" size={14} style={{ color: HFQ_INK_3 }}/>
                    <span style={{ fontSize: 11, color: HFQ_INK_3 }}>filter tables</span>
                  </div>
                  <button className="hf-btn xs"><HFIcon name="plus" size={12}/> New migration</button>
                </div>
              </div>
              <div style={{ padding: '10px 16px', display: 'grid', gridTemplateColumns: '1.6fr 0.7fr 0.8fr 0.6fr 0.6fr 0.6fr 1fr 0.6fr 0.5fr', gap: 10, fontSize: 10, color: HFQ_INK_3, fontFamily: 'var(--hf-font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, background: '#fafafa', borderBottom: `1px solid ${HFQ_LINE}` }}>
                <span>Table</span><span>Rows</span><span>Size</span><span>RLS</span><span>Indexes</span><span>Bloat</span><span>P95 read</span><span>Status</span><span></span>
              </div>
              {tables.map((t, i) => (
                <div key={t[0]} style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1.6fr 0.7fr 0.8fr 0.6fr 0.6fr 0.6fr 1fr 0.6fr 0.5fr', gap: 10, alignItems: 'center', borderBottom: i < tables.length - 1 ? `1px solid ${HFQ_LINE}` : 0, fontSize: 12 }}>
                  <div className="hf-row" style={{ gap: 8 }}>
                    <HFIcon name="fileText" size={12} style={{ color: HFQ_INK_3 }}/>
                    <span className="hf-mono" style={{ fontWeight: 600 }}>{t[0]}</span>
                  </div>
                  <span className="hf-mono">{t[1]}</span>
                  <span className="hf-mono" style={{ color: HFQ_INK_3 }}>{t[2]}</span>
                  <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>{t[3]}</span>
                  <span className="hf-mono" style={{ fontSize: 10, color: HFQ_INK_3 }}>{t[4]}</span>
                  <div className="hf-row" style={{ gap: 6 }}>
                    <div style={{ width: 50, height: 6, background: HFQ_LINE, borderRadius: 999 }}>
                      <div style={{ height: '100%', width: `${Math.min(t[6] * 0.7, 100)}%`, background: t[6] > 60 ? '#c1841c' : HFQ_ACC, borderRadius: 999 }}></div>
                    </div>
                    <span className="hf-mono" style={{ fontSize: 10 }}>{t[6]}%</span>
                  </div>
                  <span className="hf-mono">{t[7]} ms</span>
                  <QOBadge k={t[5] === 'ok' ? 'paid' : 'pending'}>{t[5].toUpperCase()}</QOBadge>
                  <HFIcon name="chevR" size={14} style={{ color: HFQ_INK_3, justifySelf: 'end' }}/>
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
  QuietDeskSuperOrgs,
  QuietDeskSuperProviders,
  QuietDeskSuperFlags,
  QuietDeskSuperAudit,
  QuietDeskSuperJobs,
  QuietDeskSuperWebhooks,
  QuietDeskSuperDB,
});
