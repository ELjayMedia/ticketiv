// Hi-fi shared shells + atoms.

// Tiny SVG icon library (stroked, 24px box).
const ICONS = {
  search:   "M15.5 15.5 21 21 M10 17a7 7 0 100-14 7 7 0 000 14z",
  heart:    "M12 21s-7-4.5-9.5-9C.5 8.5 2 4 6 4c2 0 3 .8 4 2 1-1.2 2-2 4-2 4 0 5.5 4.5 3.5 8-2.5 4.5-9.5 9-9.5 9z",
  bell:     "M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9z M10 21h4",
  user:     "M4 21v-1a6 6 0 0112 0v1 M8 11a4 4 0 100-8 4 4 0 000 8z",
  pin:      "M12 22s8-7.5 8-13a8 8 0 10-16 0c0 5.5 8 13 8 13z M12 11.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  cal:      "M3 7h18 M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z M9 2v4 M15 2v4",
  ticket:   "M3 8a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 000 4v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 000-4V8z M12 6v12",
  share:    "M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7 M16 6l-4-4-4 4 M12 2v14",
  filter:   "M4 5h16 M7 12h10 M10 19h4",
  chevR:    "M9 6l6 6-6 6",
  chevL:    "M15 6l-9 6 9 6",
  chevD:    "M6 9l6 6 6-6",
  plus:     "M12 5v14 M5 12h14",
  minus:    "M5 12h14",
  arrowR:   "M5 12h14 M13 5l7 7-7 7",
  arrowUR:  "M7 17L17 7 M8 7h9v9",
  close:    "M18 6L6 18 M6 6l12 12",
  check:    "M5 12l5 5L20 7",
  map:      "M1 6v15l7-3 8 3 7-3V3l-7 3-8-3-7 3z M8 3v15 M16 6v15",
  music:    "M9 18V6l10-2v12 M9 18a2 2 0 100-4 2 2 0 000 4z M19 16a2 2 0 100-4 2 2 0 000 4z",
  spark:    "M12 3v3 M12 18v3 M3 12h3 M18 12h3 M5.5 5.5l2 2 M16.5 16.5l2 2 M5.5 18.5l2-2 M16.5 7.5l2-2",
  copy:     "M9 9h11v11H9z M5 5h11v3 M5 5v11h3",
  fire:     "M12 2c2 4-4 4-4 9a4 4 0 008 0c0-3-2-4-2-7 0-1 .5-2 1-3-3 0-3-0-3 1z",
  zap:      "M13 2L3 14h7l-1 8 10-12h-7l1-8z",
  globe:    "M12 21a9 9 0 100-18 9 9 0 000 18z M3 12h18 M12 3a13 13 0 010 18 M12 3a13 13 0 000 18",
  wallet:   "M3 7v12a2 2 0 002 2h14a2 2 0 002-2V7 M3 7l3-4h12l3 4 M17 13a1 1 0 100 2 1 1 0 000-2z",
  qr:       "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h3v3h-3z M20 14v3 M14 20h3 M20 20v1",
  clock:    "M12 21a9 9 0 100-18 9 9 0 000 18z M12 7v5l3 2",
  fileText: "M14 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V8l-7-5z M8 13h8 M8 17h5",
  download: "M12 3v12 M5 11l7 7 7-7 M3 21h18",
};

function Icon({ name, size, stroke = 1.7, className = "", style }) {
  const d = ICONS[name];
  if (!d) return null;
  const paths = d.split(' M').map((p, i) => (i === 0 ? p : 'M' + p));
  const sz = size || 20;
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={sz} height={sz}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths.map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}

// ── Phone shell (light, dynamic island) ──
function HFPhone({ time = "9:41", className = "", children, scrollable = true }) {
  return (
    <div className={`hf-phone hf ${className}`}>
      <div className="hf-island"></div>
      <div className="hf-statusbar">
        <span>{time}</span>
        <div className="right">
          {/* signal / wifi / battery — simplified */}
          <svg width="17" height="11" viewBox="0 0 17 11"><path d="M1 9.5h2v1.5H1V9.5zm4-2h2v3.5H5V7.5zm4-2h2v5.5H9V5.5zm4-2h2v7.5h-2V3.5z" fill="currentColor"/></svg>
          <svg width="16" height="11" viewBox="0 0 16 11"><path d="M8 2c-3 0-5 2-7 4l2 2 5-3 5 3 2-2c-2-2-4-4-7-4z" fill="currentColor" opacity="0.85"/></svg>
          <svg width="25" height="12" viewBox="0 0 25 12"><rect x="0.5" y="1" width="20" height="10" rx="2.5" fill="none" stroke="currentColor"/><rect x="22" y="3.5" width="1.5" height="5" rx="0.5" fill="currentColor"/><rect x="2" y="2.5" width="17" height="7" rx="1.5" fill="currentColor"/></svg>
        </div>
      </div>
      <div className="hf-screen">
        {children}
      </div>
      <div className="hf-home-indicator"></div>
    </div>
  );
}

// ── Browser shell for desktop hi-fi ──
function HFBrowser({ url = "ticketiv.app", tabs = ["Ticketiv"], children }) {
  return (
    <div className="hf-browser hf">
      <div className="hf-chrome">
        <div className="hf-lights"><span/><span/><span/></div>
        <div className="hf-tabs">
          {tabs.map((t, i) => (
            <div key={i} className={`hf-tab ${i > 0 ? 'dim' : ''}`}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: i === 0 ? 'var(--hf-accent, #6b3fbd)' : '#ccc' }}></span>
              {t}
            </div>
          ))}
        </div>
        <div className="hf-url">
          <Icon name="globe" size={14} />
          <span>https://{url}</span>
        </div>
        <div style={{ display: 'flex', gap: 12, color: '#6c6862' }}>
          <Icon name="user" size={16} />
          <Icon name="download" size={16} />
        </div>
      </div>
      <div className="hf-body">{children}</div>
    </div>
  );
}

// Avatar — square with image, used as circle
function HFAvatar({ src, size = 28, label, ring }) {
  return (
    <span
      className="hf-avatar"
      style={{
        width: size, height: size,
        background: label ? '#1a1815' : undefined,
        color: '#fff',
        fontSize: size > 30 ? 12 : 10,
        fontWeight: 600,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderColor: ring || 'var(--hf-surface)',
      }}
    >
      {src ? <img src={src} alt="" /> : label}
    </span>
  );
}

// Photo block — fixed-ratio with optional overlay content
function HFPhoto({ src, ratio, h, w, children, dim, heavy, style, radius, className = "" }) {
  return (
    <div
      className={`hf-photo ${dim ? 'dim' : ''} ${heavy ? 'heavy' : ''} ${className}`}
      style={{
        width: w || '100%',
        height: h,
        aspectRatio: ratio,
        borderRadius: radius,
        ...style,
      }}
    >
      <img src={src} alt="" loading="lazy" />
      {children && <div className="on-photo">{children}</div>}
    </div>
  );
}

window.HFIcon = Icon;
window.HFPhone = HFPhone;
window.HFBrowser = HFBrowser;
window.HFAvatar = HFAvatar;
window.HFPhoto = HFPhoto;
