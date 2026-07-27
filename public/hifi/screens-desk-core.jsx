// Shared desktop chrome + side nav, used by every desktop screen.

function Desk({ url = "ticketiv.app", tab = "Ticketiv", w = 1280, h = 800, variant = "", children }) {
  return (
    <div className={`desk ${variant}`} style={{ width: w, height: h }}>
      <div className="desk-chrome">
        <div className="lights">
          <span style={{ background: '#fec22a' }}></span>
          <span style={{ background: '#27c93f' }}></span>
          <span style={{ background: '#ff5f56' }}></span>
        </div>
        <div className="tab">{tab}</div>
        <div className="url"><span className="muted">⌂</span> https://{url}</div>
        <span className="kmono muted" style={{ fontSize: 11 }}>○ + ✕</span>
      </div>
      <div className="desk-body">{children}</div>
    </div>
  );
}

const ORG_NAV = [
  { g: '⌂', l: 'Overview', on: false },
  { g: '📅', l: 'Events',  on: true  },
  { g: '🎟', l: 'Orders' },
  { g: '👥', l: 'Audience' },
  { g: '★',  l: 'Guest list' },
  { g: '📈', l: 'Analytics' },
  { g: '⚐',  l: 'Series' },
  { g: '💸', l: 'Payouts' },
  { g: '⚙',  l: 'Settings' },
];

const ADMIN_NAV = [
  { g: '⌂', l: 'Overview', on: true },
  { g: '🏢', l: 'Organizations' },
  { g: '💳', l: 'Providers' },
  { g: '👤', l: 'Admins & roles' },
  { g: '🔧', l: 'Feature flags' },
  { g: '📋', l: 'Action catalog' },
  { g: '📜', l: 'Audit log' },
  { g: '🛠', l: 'Jobs queue' },
];

function Sidebar({ items = ORG_NAV, org = "Rishabh's Events", role = "organizer_owner" }) {
  return (
    <div className="side">
      <div className="brand">
        <span className="stamp acc" style={{ width: 22, height: 22 }}>T</span>
        ticketiv
      </div>
      <div className="group">Manage</div>
      {items.map((n, i) => (
        <div key={i} className={`nav ${n.on ? 'on' : ''}`}>
          <span className="stamp" style={{ width: 20, height: 20, fontSize: 11 }}>{n.g}</span>
          <span>{n.l}</span>
        </div>
      ))}
      <div className="org-picker">
        <div className="ph avatar" style={{ width: 24, height: 24 }}>R</div>
        <div className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}>
          <b className="tiny" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{org}</b>
          <span className="tiny muted">{role}</span>
        </div>
        <span className="muted">▾</span>
      </div>
    </div>
  );
}

function KPI({ label, val, delta, deltaDir }) {
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className="val">{val}</div>
      {delta && <div className={`delta ${deltaDir || 'up'}`}>{deltaDir === 'down' ? '▼' : '▲'} {delta}</div>}
    </div>
  );
}

function Badge({ children, kind }) {
  return <span className={`badge ${kind || ''}`}>{children}</span>;
}

function Sparkline({ points = "0,40 20,38 40,35 60,28 80,30 100,22 120,18 140,25 160,15 180,8 200,12", h = 60, w = 200, color }) {
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: h }}>
      <polyline points={points} fill="none" stroke={color || 'var(--accent)'} strokeWidth="2" />
    </svg>
  );
}

function BarChart({ data = [40,60,55,70,82,68,75,90,72,88,95,80], h = 80, max = 100 }) {
  const w = 240;
  const bw = w / data.length;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: h }}>
      {data.map((d, i) => {
        const bh = (d / max) * (h - 8);
        return <rect key={i} x={i * bw + 2} y={h - bh} width={bw - 4} height={bh} fill="var(--accent)" opacity={0.5 + (d/max)*0.5} />;
      })}
    </svg>
  );
}

Object.assign(window, { Desk, Sidebar, KPI, Badge, Sparkline, BarChart, ORG_NAV, ADMIN_NAV });
