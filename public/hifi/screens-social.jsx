// Social (friends/invite), Calendar, Reminders, Profile, Notifications, Language.

function FriendsList() {
  return (
    <Phone>
      <Status />
      <Bar title="My friends" />
      <div className="body scroll">
        <div className="seg">
          <span className="on">My friends</span>
          <span>Requests <span className="kmono">·3</span></span>
        </div>
        <div className="input block"><span>⌕</span><span>Search friends</span></div>
        {[
          ["Farah Khan","FK","@farah"],
          ["Salman Khan","SK","@salman"],
          ["Amir Khan","AK","@amir"],
          ["Rishi Kapoor","RK","@rishi"],
          ["Sanjay Datt","SD","@sanjay"],
          ["Vicky Kausal","VK","@vicky"],
        ].map(([n, ini, h]) => (
          <div key={h} className="row gap8" style={{ padding:'4px 2px', borderBottom: '1px dashed var(--ink-4)' }}>
            <Avatar size={32} label={ini} />
            <div className="col grow" style={{ gap: 0 }}>
              <b className="tiny">{n}</b>
              <div className="tiny muted">{h}</div>
            </div>
            <span className="stamp">×</span>
          </div>
        ))}

        <Note top={56} right={2} w={120}>
          rows in <span className="uline">user_connections</span> w/ state=accepted
        </Note>
      </div>
    </Phone>
  );
}

function FriendRequests() {
  return (
    <Phone>
      <Status />
      <Bar title="My friends" />
      <div className="body scroll">
        <div className="seg">
          <span>My friends</span>
          <span className="on">Requests</span>
        </div>
        {[
          ["Farah Khan","FK","@farah","wants to follow you"],
          ["Salman Khan","SK","@salman","sent you a request"],
          ["Amir Khan","AK","@amir","via Tribal Tales"],
        ].map(([n, ini, h, why]) => (
          <div key={h} className="card row thin">
            <Avatar size={30} label={ini} />
            <div className="col grow" style={{ gap: 0 }}>
              <b className="tiny">{n}</b>
              <div className="tiny muted">{why}</div>
            </div>
            <span className="btn primary sm">Accept</span>
            <span className="stamp">×</span>
          </div>
        ))}

        <div className="hr"/>
        <div className="muted tiny">People you may know</div>
        {["Vicky Kausal","Rishi Kapoor"].map(n => (
          <div key={n} className="row gap8" style={{ padding: '4px 2px' }}>
            <Avatar size={28} label={n.split(' ').map(x=>x[0]).join('')} />
            <div className="col grow"><b className="tiny">{n}</b><div className="tiny muted">3 mutual</div></div>
            <span className="btn sm">+ Add</span>
          </div>
        ))}
      </div>
    </Phone>
  );
}

function InviteFriends() {
  return (
    <Phone>
      <Status />
      <Bar title="Invite to event" sub="Tribal Tales · 30 Aug" />
      <div className="body scroll">
        <div className="row gap6">
          <span className="btn grow sm">⇗ Share link</span>
          <span className="btn grow sm">＠ Mention</span>
        </div>
        <div className="input block"><span>⌕</span><span>Search friends</span></div>

        <div className="muted tiny">Pending</div>
        {["Farah Khan","Amir Khan","Sanjay Datt"].map(n => (
          <div key={n} className="row gap8" style={{ padding: '4px 2px' }}>
            <Avatar size={30} label={n.split(' ').map(x=>x[0]).join('')} />
            <div className="col grow"><b className="tiny">{n}</b><div className="tiny muted">sent · 2h</div></div>
            <span className="chip soft">Pending</span>
          </div>
        ))}

        <div className="muted tiny">Friends</div>
        {["Vicky Kausal","Rishi Kapoor","Salman Khan"].map(n => (
          <div key={n} className="row gap8" style={{ padding: '4px 2px' }}>
            <Avatar size={30} label={n.split(' ').map(x=>x[0]).join('')} />
            <div className="col grow"><b className="tiny">{n}</b><div className="tiny muted">@{n.split(' ')[0].toLowerCase()}</div></div>
            <span className="check"></span>
          </div>
        ))}
      </div>
      <div style={{ borderTop: '1.4px solid var(--ink)', padding: '8px 12px' }}>
        <span className="btn primary block">Send 3 invites</span>
      </div>
    </Phone>
  );
}

function CalendarMonth() {
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const highlight = new Set([15, 22, 25, 30]);
  const today = 22;
  return (
    <Phone>
      <Status />
      <Bar title="Calendar" right={<span className="stamp">◔</span>} />
      <div className="body scroll">
        <div className="row between">
          <span className="stamp">‹</span>
          <b>July 2025</b>
          <span className="stamp">›</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, fontSize: 11 }}>
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => <div key={d} className="muted txt-c">{d}</div>)}
          {Array(2).fill(0).map((_,i)=> <div key={`b${i}`}></div>)}
          {days.map(d => (
            <div key={d} className={`txt-c kmono ${highlight.has(d) ? 'acc' : ''}`} style={{
              padding: '4px 0',
              borderRadius: 999,
              background: d === today ? 'var(--accent)' : highlight.has(d) ? 'var(--accent-soft)' : 'transparent',
              color: d === today ? '#fff' : highlight.has(d) ? 'var(--accent-ink)' : 'var(--ink)',
              fontWeight: highlight.has(d) || d === today ? 700 : 400,
            }}>
              {d}
            </div>
          ))}
        </div>

        <div className="hr"/>

        <div className="muted tiny">Selected · 22 Jul</div>
        <EventRow title="Sunset Set" date="Tue 22 · 6 PM" venue="Riverside" price="₹600" action={<span className="btn sm">View</span>} />

        <div className="muted tiny">This month</div>
        <EventRow title="Tribal Tales" date="Wed 30 · 3:50 PM" action={<span className="btn sm">View</span>} />
      </div>
    </Phone>
  );
}

function ReminderSettings() {
  return (
    <Phone>
      <Status />
      <Bar title="Reminders" right={<span className="stamp">+</span>} />
      <div className="body scroll">
        {[
          ["Tribal Tales 1","Wed 30 Jul · 3:50 PM","12:00 PM same day"],
          ["Tribal Tales 2","Fri 25 Jul · 3:50 PM","11:52 AM"],
          ["Tribal Tales 3","Fri 25 Jul · 3:50 PM","4:00 PM, day before"],
        ].map(([t, d, r]) => (
          <div key={t} className="card thin soft row">
            <div className="col" style={{ width: 36, alignItems: 'center' }}>
              <span className="kmono" style={{ fontWeight: 700 }}>{t.endsWith('1') ? '30' : '25'}</span>
              <span className="tiny">{t.endsWith('1') ? 'Wed' : 'Fri'}</span>
            </div>
            <div className="col grow">
              <b className="tiny">{t}</b>
              <div className="tiny muted">⏱ {d}</div>
              <div className="tiny acc">🔔 {r}</div>
            </div>
            <span className="stamp">✎</span>
          </div>
        ))}

        <Note bottom={20} left={6} w={130}>
          <span className="uline">notifications</span> rows scheduled with <span className="uline">deliver_at</span>
        </Note>
      </div>
    </Phone>
  );
}

function Profile() {
  return (
    <Phone>
      <Status />
      <Bar back={false} title="" right={<span className="stamp">✎</span>} />
      <div className="body scroll" style={{ alignItems: 'center' }}>
        <Avatar size={64} label="SM" />
        <div className="hand-h2">Smit Modi</div>
        <div className="tiny muted">@smit · 10 friends</div>

        <div className="muted tiny" style={{ alignSelf: 'flex-start' }}>My account</div>
        {[
          ["👤","Personal info"],
          ["🌐","Language"],
          ["👥","My friends"],
          ["✉","Invite friends"],
          ["💳","Payment methods"],
        ].map(([g,l]) => (
          <div key={l} className="row gap8 between" style={{ padding: '6px 2px', borderBottom: '1px dashed var(--ink-4)', width: '100%' }}>
            <div className="row gap6"><span className="stamp">{g}</span><span style={{ fontSize: 13 }}>{l}</span></div>
            <span className="muted">›</span>
          </div>
        ))}

        <div className="muted tiny" style={{ alignSelf: 'flex-start' }}>Notifications</div>
        <div className="row between" style={{ width: '100%' }}>
          <div className="row gap6"><span className="stamp">🔔</span><span style={{ fontSize: 13 }}>Push notifications</span></div>
          <span className="toggle on"></span>
        </div>

        <div className="muted tiny" style={{ alignSelf: 'flex-start' }}>Organizer</div>
        <div className="card thin row" style={{ width: '100%' }}>
          <span className="stamp acc">⚐</span>
          <div className="col grow"><b className="tiny">Rishabh's Events</b><div className="tiny muted">organizer_owner · 23 events</div></div>
          <span className="muted">›</span>
        </div>

        <div className="muted tiny" style={{ alignSelf: 'flex-start' }}>More</div>
        {["Help center","Privacy policy","Logout"].map(l => (
          <div key={l} className="row gap8 between" style={{ padding: '6px 2px', width: '100%', borderBottom: '1px dashed var(--ink-4)' }}>
            <span style={{ fontSize: 13, color: l === 'Logout' ? 'var(--accent)' : 'inherit' }}>{l}</span>
            <span className="muted">›</span>
          </div>
        ))}
      </div>
      <TabBar active="me" />
    </Phone>
  );
}

function NotificationPrefs() {
  const rows = [
    ["Event reminders","push,email","12h before & day-of"],
    ["Friend activity","push","when friends book or attend"],
    ["Transfers & resale","push,email,sms",""],
    ["Order receipts","email","always on"],
    ["Marketing","email",""],
  ];
  return (
    <Phone>
      <Status />
      <Bar title="Notifications" />
      <div className="body scroll">
        <div className="muted tiny">Channels</div>
        <div className="row gap6">
          <span className="chip on">Push</span>
          <span className="chip on">Email</span>
          <span className="chip">SMS</span>
          <span className="chip">In-app</span>
        </div>

        <div className="hr"/>

        {rows.map(([t, ch, sub]) => (
          <div key={t} className="card thin">
            <div className="row between">
              <b className="tiny">{t}</b>
              <span className={`toggle ${t.includes('Marketing') ? '' : 'on'}`}></span>
            </div>
            <div className="tiny muted">{ch} {sub && `· ${sub}`}</div>
          </div>
        ))}

        <Note bottom={20} left={4} w={130}>
          <span className="uline">user_notification_preferences</span> JSON
        </Note>
      </div>
    </Phone>
  );
}

function LanguageScreen() {
  return (
    <Phone>
      <Status />
      <Bar title="Language" />
      <div className="body scroll">
        {["English","हिन्दी - Hindi","ગુજરાતી - Gujarati","मराठी - Marathi","தமிழ் - Tamil"].map((l, i) => (
          <div key={l} className="card thin row" style={{ borderRadius: 999 }}>
            <div className="grow">{l}</div>
            <span className={`radio ${i === 0 ? 'on' : ''}`}></span>
          </div>
        ))}
      </div>
    </Phone>
  );
}

Object.assign(window, { FriendsList, FriendRequests, InviteFriends, CalendarMonth, ReminderSettings, Profile, NotificationPrefs, LanguageScreen });
