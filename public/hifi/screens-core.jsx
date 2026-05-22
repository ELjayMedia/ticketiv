// Shared phone shell + small UI atoms used across every screen.
// Globals: Phone, Bar, TabBar, Note, Schema, Avatar, EventRow, etc.

const TAB_HOME    = { key: 'home',    label: 'Home',    g: 'H' };
const TAB_TIX     = { key: 'tix',     label: 'Tickets', g: 'T' };
const TAB_DISC    = { key: 'disc',    label: 'Discover',g: 'D' };
const TAB_MAP     = { key: 'map',     label: 'Map',     g: 'M' };
const TAB_ME      = { key: 'me',      label: 'You',     g: 'U' };

const DEFAULT_TABS = [TAB_HOME, TAB_TIX, TAB_DISC, TAB_ME];

function Phone({ children, w, h, style }) {
  return (
    <div className="phone" style={{ width: w || 300, height: h || 600, ...style }}>
      <div className="screen">{children}</div>
    </div>
  );
}

function Status({ time = "9:41" }) {
  return (
    <div className="status">
      <span>{time}</span>
      <span className="dots">●●● ▲ █</span>
    </div>
  );
}

function Bar({ back, title, right, sub }) {
  return (
    <div className="bar">
      {back !== false && <span className="back">‹</span>}
      <div className="col" style={{ flex: 1, gap: 0 }}>
        <div className="title" style={{ fontSize: sub ? 16 : 18 }}>{title}</div>
        {sub && <div className="tiny muted">{sub}</div>}
      </div>
      {right}
    </div>
  );
}

function TabBar({ active = 'home', items = DEFAULT_TABS }) {
  return (
    <div className="tabs">
      {items.map(t => (
        <div key={t.key} className={`tab ${active === t.key ? 'active' : ''}`}>
          <span className="glyph">{t.g}</span>
          {t.label}
        </div>
      ))}
    </div>
  );
}

function Schema({ children }) {
  return <span className="schema">{children}</span>;
}

function SchemaList({ items }) {
  return (
    <div className="schema-list">
      {items.map((s, i) => <Schema key={i}>{s}</Schema>)}
    </div>
  );
}

function Note({ children, top, left, right, bottom, w }) {
  return (
    <div
      className="note"
      style={{
        top, left, right, bottom,
        width: w,
      }}
    >
      {children}
    </div>
  );
}

function Avatar({ size = 28, label, soft, style }) {
  return (
    <div
      className={`ph avatar ${soft ? '' : ''}`}
      style={{ width: size, height: size, fontSize: size > 30 ? 11 : 9, ...style }}
    >
      {label || "·"}
    </div>
  );
}

function Photo({ w, h, label, x, style, radius }) {
  return (
    <div
      className={`ph ${x ? 'x' : ''}`}
      style={{ width: w, height: h, borderRadius: radius, ...style }}
    >
      {label}
    </div>
  );
}

function EventRow({ title = "Event title", date = "Wed 30 Jul · 3:50 PM", venue = "Cafe Natarani", price = "₹500", action, photo = "photo" }) {
  return (
    <div className="list-row">
      <div className="ph" style={{ width: 50, height: 50 }}>{photo}</div>
      <div className="col grow" style={{ gap: 2 }}>
        <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.1 }}>{title}</div>
        <div className="tiny muted">⏱ {date}</div>
        <div className="tiny muted">◉ {venue}</div>
      </div>
      <div className="col" style={{ alignItems: 'flex-end', gap: 4 }}>
        <div className="kmono" style={{ fontSize: 12 }}>{price}</div>
        {action}
      </div>
    </div>
  );
}

function SectionTitle({ children, more }) {
  return (
    <div className="row between" style={{ marginTop: 2 }}>
      <div style={{ fontWeight: 700, fontSize: 14 }}>{children}</div>
      {more && <div className="tiny muted">{more} ›</div>}
    </div>
  );
}

function PriceLine({ label, value, strong, dashed }) {
  return (
    <div className={`row between ${dashed ? 'dashed' : ''}`} style={{ borderBottom: dashed ? '1px dashed var(--ink-4)' : 0, paddingBottom: dashed ? 4 : 0 }}>
      <span className={strong ? '' : 'muted'} style={{ fontSize: 13, fontWeight: strong ? 700 : 400 }}>{label}</span>
      <span className="kmono" style={{ fontSize: 13, fontWeight: strong ? 700 : 400 }}>{value}</span>
    </div>
  );
}

Object.assign(window, {
  Phone, Status, Bar, TabBar, Schema, SchemaList, Note,
  Avatar, Photo, EventRow, SectionTitle, PriceLine,
  TAB_HOME, TAB_TIX, TAB_DISC, TAB_MAP, TAB_ME, DEFAULT_TABS,
});
