// Event detail variants + Organizer + Series + Reviews.

function EventDetailHero() {
  return (
    <Phone>
      <Status />
      <div style={{ position: 'relative' }}>
        <div className="ph" style={{ height: 160, borderRadius: 0, borderLeft: 0, borderRight: 0, borderTop: 0 }}>event hero photo</div>
        <span className="stamp" style={{ position: 'absolute', top: 10, left: 10, background:'#fff' }}>‹</span>
        <span className="stamp" style={{ position: 'absolute', top: 10, right: 10, background:'#fff' }}>♡</span>
        <div className="card row" style={{ position:'absolute', bottom:-18, left: 12, right: 12, padding: 6, background:'#fff' }}>
          <div className="stack"><Avatar size={22} label="FK"/><Avatar size={22} label="SK"/><Avatar size={22} label="AK"/></div>
          <div className="grow tiny">+5 going</div>
          <span className="btn sm">Invite</span>
        </div>
      </div>
      <div className="body scroll" style={{ paddingTop: 28 }}>
        <div className="hand-h">Tribal Tales</div>
        <div className="col gap6 tiny">
          <div className="row gap6"><span className="stamp">📅</span><div><b>Wed 30 Aug · 3:50 – 5:50 PM</b></div></div>
          <div className="row gap6"><span className="stamp">◉</span><div>Cafe Natarani, Ahmedabad</div></div>
          <div className="row gap6"><span className="stamp">⚐</span><div>By <b>Rishabh Mehta</b> · <span className="acc">View</span></div></div>
        </div>

        <div className="row gap4" style={{ borderBottom: '1px dashed var(--ink-4)' }}>
          <span className="chip on" style={{ borderRadius:'4px 4px 0 0', border:0, borderBottom: '2px solid var(--accent)' }}>About</span>
          <span className="muted" style={{ padding: '2px 8px' }}>Lineup</span>
          <span className="muted" style={{ padding: '2px 8px' }}>Venue</span>
          <span className="muted" style={{ padding: '2px 8px' }}>Reviews</span>
        </div>

        <div className="tiny" style={{ lineHeight: 1.4 }}>
          Sunset music night with rotating DJ set. Food trucks on-site. Outdoor lawn — bring a hoodie!
        </div>

        <div className="row gap6">
          <div className="card thin grow"><div className="tiny muted">Language</div><div>English, Hindi</div></div>
          <div className="card thin grow"><div className="tiny muted">Duration</div><div>3 hours</div></div>
        </div>

        <div className="card thin">
          <div className="tiny muted">Lineup</div>
          <div className="row gap6"><Avatar size={26} label="DJ"/><div><b>DJ Fun</b><div className="tiny muted">Headliner</div></div></div>
          <div className="row gap6"><Avatar size={26} label="RM"/><div><b>Riya M.</b><div className="tiny muted">Opener</div></div></div>
        </div>
      </div>
      <div style={{ borderTop: '1.4px solid var(--ink)', padding: '8px 12px', display: 'flex', gap: 8, alignItems: 'center', background: 'var(--paper)' }}>
        <div className="col" style={{ gap: 0 }}>
          <div className="tiny muted">From</div>
          <div className="hand-h2">₹500</div>
        </div>
        <span className="btn primary block grow">BOOK NOW</span>
      </div>
      <SchemaList items={["events", "event_artists", "event_favourites", "ticket_types"]} />
    </Phone>
  );
}

function EventDetailFestival() {
  return (
    <Phone>
      <Status />
      <div style={{ position: 'relative' }}>
        <div className="ph" style={{ height: 110, borderRadius: 0 }}>festival photo</div>
        <span className="stamp" style={{ position: 'absolute', top: 8, left: 8, background:'#fff' }}>‹</span>
        <span className="chip soft" style={{ position: 'absolute', top: 8, right: 8 }}>3-day festival</span>
      </div>
      <div className="body scroll">
        <div className="hand-h">River Sound Fest</div>
        <div className="tiny muted">Fri 25 → Sun 27 Jul · Riverside Park</div>

        <div className="seg">
          <span>Overview</span>
          <span className="on">Day 1</span>
          <span>Day 2</span>
          <span>Day 3</span>
        </div>

        <div className="tiny muted">FRI 25 · 4:00 PM → MIDNIGHT</div>

        <div className="card thin">
          <div className="row between"><b>Main Stage</b><span className="tiny muted">3 acts</span></div>
          <div className="col gap2">
            <div className="row gap6 tiny"><span className="kmono">16:00</span> Riya M.</div>
            <div className="row gap6 tiny"><span className="kmono">18:30</span> The Loft Band</div>
            <div className="row gap6 tiny"><span className="kmono">21:00</span> <b>DJ Fun</b> · headliner</div>
          </div>
        </div>
        <div className="card thin">
          <div className="row between"><b>Garden Stage</b><span className="tiny muted">2 acts</span></div>
          <div className="col gap2">
            <div className="row gap6 tiny"><span className="kmono">17:30</span> Quiet Folk</div>
            <div className="row gap6 tiny"><span className="kmono">20:00</span> Open Mic</div>
          </div>
        </div>

        <Note top={150} right={2} w={120}>
          multi-day → many <span className="uline">event_artists</span> rows w/ <span className="uline">day_index</span>
        </Note>
      </div>
      <div style={{ borderTop: '1.4px solid var(--ink)', padding: '8px 12px', display:'flex', gap:8, alignItems:'center' }}>
        <div className="col gap2 grow">
          <div className="tiny muted">3-day pass from</div>
          <div className="hand-h2">₹2 400</div>
        </div>
        <span className="btn block primary" style={{ flex: 1 }}>Pick a pass</span>
      </div>
      <SchemaList items={["events", "event_series", "event_artists"]} />
    </Phone>
  );
}

function EventDetailMinimal() {
  return (
    <Phone>
      <Status />
      <Bar title="" right={<><span className="stamp">↗</span><span className="stamp">♡</span></>} />
      <div className="body scroll">
        <div className="tiny muted kmono">WED · 30 AUG · 3:50 PM</div>
        <div className="hand-h">Tribal Tales</div>
        <div className="muted">a sunset DJ set by DJ Fun</div>

        <div className="hr"/>

        <div className="col gap8">
          <div className="row between"><span className="muted tiny">VENUE</span><span>Cafe Natarani →</span></div>
          <div className="row between"><span className="muted tiny">ORGANIZER</span><span>Rishabh Mehta →</span></div>
          <div className="row between"><span className="muted tiny">DURATION</span><span>3 hours</span></div>
          <div className="row between"><span className="muted tiny">LANGUAGE</span><span>English, Hindi</span></div>
          <div className="row between"><span className="muted tiny">AGE</span><span>18+</span></div>
        </div>

        <div className="hr"/>

        <div className="tiny" style={{ lineHeight: 1.5 }}>
          Sunset music night with rotating DJ set. Food trucks on-site. Outdoor lawn — bring a hoodie!
        </div>

        <div className="card thin row">
          <div className="stack"><Avatar size={20} label="F"/><Avatar size={20} label="S"/><Avatar size={20} label="A"/></div>
          <div className="grow tiny"><b>5 friends</b> going</div>
        </div>

        <Note bottom={6} left={6} w={130}>
          text-first variant — no hero photo
        </Note>
      </div>
      <div style={{ borderTop: '1.4px solid var(--ink)', padding: '8px 12px', display:'flex', gap:8, alignItems:'center' }}>
        <div className="kmono">₹500+</div>
        <span className="btn primary grow">Book</span>
      </div>
    </Phone>
  );
}

function OrganizerProfile() {
  return (
    <Phone>
      <Status />
      <Bar title="Organizer" right={<span className="stamp">⋯</span>} />
      <div className="body scroll" style={{ alignItems: 'center' }}>
        <Avatar size={72} label="RM" />
        <div className="hand-h2">Rishabh Mehta</div>
        <div className="tiny muted">@rishabh · Organizer · Verified ✓</div>

        <div className="row gap12" style={{ marginTop: 4 }}>
          <div className="col" style={{ alignItems: 'center', gap: 0 }}><b>23</b><span className="tiny muted">Events</span></div>
          <div className="col" style={{ alignItems: 'center', gap: 0 }}><b>4.8</b><span className="tiny muted">★ Rating</span></div>
          <div className="col" style={{ alignItems: 'center', gap: 0 }}><b>1.2k</b><span className="tiny muted">Followers</span></div>
        </div>

        <div className="row gap6 full">
          <span className="btn primary grow">Follow</span>
          <span className="btn grow">Message</span>
        </div>

        <div className="seg full" style={{ alignSelf: 'stretch' }}>
          <span className="on">About</span>
          <span>Events</span>
          <span>Reviews</span>
        </div>

        <div className="tiny" style={{ lineHeight: 1.45, alignSelf: 'stretch' }}>
          Curating small-format live music since 2019. Outdoor venues, intimate sets.
        </div>

        <div className="card thin" style={{ alignSelf: 'stretch' }}>
          <div className="tiny muted">Upcoming</div>
          <EventRow title="Tribal Tales" action={<span className="btn sm">View</span>} />
        </div>

        <Note top={56} right={6} w={120}>
          tied to <span className="uline">organizations</span> + org_members role
        </Note>
      </div>
    </Phone>
  );
}

function SeriesPage() {
  return (
    <Phone>
      <Status />
      <Bar title="Series" right={<><span className="stamp">↗</span><span className="stamp">⋯</span></>} />
      <div className="body scroll">
        <div className="ph" style={{ height: 90 }}>series cover</div>
        <div className="row between" style={{ alignItems: 'flex-start' }}>
          <div className="col" style={{ gap: 2 }}>
            <div className="hand-h2">Tribal Tales Tour</div>
            <div className="tiny muted">8-city tour · by Rishabh Mehta</div>
          </div>
          <span className="btn primary sm">Follow</span>
        </div>

        <div className="seg">
          <span className="on">Upcoming</span>
          <span>Past</span>
        </div>

        <div className="col gap6">
          {[
            ["Ahmedabad","Wed 30 Aug","₹500","On sale"],
            ["Mumbai",   "Sat 09 Sep","₹650","Few left"],
            ["Pune",     "Fri 15 Sep","₹600","On sale"],
            ["Bangalore","Sat 23 Sep","₹700","Coming soon"],
          ].map(([c,d,p,s], i) => (
            <div key={i} className="list-row">
              <div className="ph" style={{ width: 40, height: 40 }}>{c[0]}</div>
              <div className="col grow" style={{ gap: 2 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{c}</div>
                <div className="tiny muted">{d}</div>
              </div>
              <div className="col" style={{ alignItems: 'flex-end' }}>
                <div className="kmono tiny">{p}</div>
                <div className={`tiny ${s === 'Few left' ? 'acc' : 'muted'}`}>{s}</div>
              </div>
            </div>
          ))}
        </div>

        <Note top={10} right={4} w={130}>
          one row in <span className="uline">event_series</span> → many <span className="uline">events</span>
        </Note>
      </div>
      <SchemaList items={["event_series","series_follows","events"]} />
    </Phone>
  );
}

function ReviewModal() {
  return (
    <Phone>
      <Status />
      <Bar title="Completed events" right={<span className="stamp">📅</span>} />
      <div className="body" style={{ background: 'rgba(0,0,0,0.06)', justifyContent: 'flex-end', padding: 0 }}>
        <div className="seg" style={{ margin: '10px 12px' }}>
          <span>Upcoming</span>
          <span className="on">Completed</span>
        </div>
        <div className="card row" style={{ margin: '0 12px' }}>
          <div className="ph" style={{ width: 50, height: 50 }}>photo</div>
          <div className="col grow"><b style={{ fontSize: 13 }}>Tribal Tales</b><div className="tiny muted">Wed 30 Jul · ₹500</div></div>
        </div>
        <div className="grow"></div>
        <div style={{ background:'var(--paper)', borderTop: '1.4px solid var(--ink)', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: '14px 14px 18px', marginTop: 'auto' }}>
          <div className="row between">
            <div style={{ fontWeight: 700 }}>Write a review</div>
            <span className="stamp">×</span>
          </div>
          <div className="card row mt8">
            <div className="ph" style={{ width: 44, height: 44 }}>img</div>
            <div className="col grow" style={{ gap: 2 }}>
              <b style={{ fontSize: 13 }}>Tribal Tales</b>
              <div className="tiny muted">Wed 30 Jul · 3:50 PM</div>
              <div className="tiny muted">◉ Cafe Natarani · ₹500</div>
            </div>
          </div>
          <div className="mt8 tiny muted">How was your experience?</div>
          <div className="row gap6 mt4" style={{ fontSize: 22 }}>★ ★ ★ ☆ ☆</div>
          <div className="tiny muted mt8">Your review</div>
          <div className="field tall mt4">Enter text here…</div>
          <div className="btn primary block mt8">Submit</div>
        </div>
      </div>
    </Phone>
  );
}

Object.assign(window, { EventDetailHero, EventDetailFestival, EventDetailMinimal, OrganizerProfile, SeriesPage, ReviewModal });
