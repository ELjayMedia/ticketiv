// Discovery screens: Home A/B/C variants, Search, Map, Category grid, City picker.

function HomeFeed() {
  return (
    <Phone>
      <Status />
      <div className="bar">
        <div className="col grow" style={{ gap: 0 }}>
          <div className="row gap4">
            <div className="hand-h2">Ahmedabad</div>
            <span className="muted">▾</span>
          </div>
          <div className="tiny muted">Gujarat · ~12km</div>
        </div>
        <span className="stamp">⌕</span>
        <span className="stamp">♡</span>
        <span className="stamp">◔</span>
      </div>
      <div className="body scroll">
        <SectionTitle more="See more">Categories</SectionTitle>
        <div className="chips row">
          <span className="chip on">Music</span>
          <span className="chip">Comedy</span>
          <span className="chip">Theatre</span>
          <span className="chip">Food</span>
          <span className="chip">Sports</span>
        </div>

        <SectionTitle more="See more">Suggested for you</SectionTitle>
        <div className="row" style={{ gap: 8, overflowX: 'auto' }}>
          {["Tribal Tales", "Sunset Set", "Comedy Night"].map((t,i) => (
            <div key={i} className="card thin" style={{ minWidth: 140, padding: 0, overflow: 'hidden' }}>
              <div className="ph" style={{ height: 90, borderRadius: 0, borderLeft: 0, borderRight: 0, borderTop: 0 }}>
                <span style={{ position: 'absolute', top: 4, left: 4 }} className="stamp acc">30·8</span>
                <span style={{ position: 'absolute', top: 4, right: 4 }} className="stamp">♡</span>
                event photo
              </div>
              <div className="col" style={{ padding: '6px 8px 8px', gap: 2 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{t}</div>
                <div className="tiny muted">◉ Cafe Natarani</div>
                <div className="kmono tiny">from ₹500</div>
              </div>
            </div>
          ))}
        </div>

        <SectionTitle more="See all">Upcoming events</SectionTitle>
        <EventRow title="Tribal Tales" action={<span className="btn sm">View</span>} />
        <EventRow title="Open Mic Friday" venue="Studio X" price="₹250" action={<span className="btn sm">View</span>} />
        <EventRow title="Indie Showcase" venue="The Loft" price="₹800" action={<span className="btn sm">View</span>} />

        <Note top={50} right={-10} w={120}>
          city sets <span className="uline">events.location_id</span> filter ↗
        </Note>
      </div>
      <TabBar active="home" />
      <SchemaList items={["events", "event_categories", "event_favourites", "ticket_types"]} />
    </Phone>
  );
}

function HomeTonight() {
  return (
    <Phone>
      <Status />
      <div className="bar">
        <div className="col grow" style={{ gap: 0 }}>
          <div className="tiny muted">TONIGHT IN</div>
          <div className="hand-h2">Ahmedabad ▾</div>
        </div>
        <span className="stamp">⌕</span>
        <span className="stamp">◔</span>
      </div>
      <div className="body scroll">
        <div className="card soft">
          <div className="row between">
            <div className="hand-h2 acc">Happening now</div>
            <span className="tiny muted">3 events</span>
          </div>
          <div className="ph" style={{ height: 80 }} >hero event photo</div>
          <div style={{ fontWeight: 700 }}>Tribal Tales · DJ Fun</div>
          <div className="tiny muted">started 7:30 PM · ends 11 PM · ◉ Cafe Natarani</div>
          <div className="row gap6">
            <span className="btn primary sm">Book ₹500</span>
            <span className="btn sm">Directions</span>
          </div>
        </div>

        <SectionTitle more="See all">Later tonight</SectionTitle>
        <EventRow title="Stand-up: A. Khan" date="Tonight · 9:30 PM" venue="Comedy Club" price="₹350" action={<span className="btn sm">Book</span>} />
        <EventRow title="Indie · The Loft" date="Tonight · 10 PM" venue="The Loft" price="₹800" action={<span className="btn sm">Book</span>} />

        <SectionTitle more="See more">This weekend</SectionTitle>
        <EventRow title="Sunset Set" date="Sat 23 · 6 PM" venue="Riverside" price="₹600" action={<span className="btn sm">View</span>} />

        <Note bottom={-4} left={10} w={150}>
          time-anchored feed — uses<br/>
          <span className="uline">events.starts_at BETWEEN now()</span>
        </Note>
      </div>
      <TabBar active="home" />
      <SchemaList items={["events", "event_metrics_daily"]} />
    </Phone>
  );
}

function HomeFriends() {
  return (
    <Phone>
      <Status />
      <Bar back={false} title="Your circle" sub="@smit · 10 friends" right={<><span className="stamp">⌕</span><span className="stamp">◔</span></>} />
      <div className="body scroll">
        <div className="card">
          <div className="row gap6">
            <div className="stack">
              <Avatar size={26} label="FK" />
              <Avatar size={26} label="SK" />
              <Avatar size={26} label="AK" />
            </div>
            <div className="grow">
              <div style={{ fontWeight: 700, fontSize: 13 }}>Farah, Salman & 1 more</div>
              <div className="tiny muted">are going to <b>Tribal Tales</b> · Wed 30</div>
            </div>
            <span className="btn primary sm">Join</span>
          </div>
        </div>

        <SectionTitle more="See all">Friends are going</SectionTitle>
        <div className="col" style={{ gap: 6 }}>
          <div className="list-row">
            <div className="ph" style={{ width: 50, height: 50 }}>photo</div>
            <div className="col grow" style={{ gap: 2 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Open Mic Friday</div>
              <div className="tiny muted">Fri 25 · 8 PM · ◉ Studio X</div>
              <div className="row gap2 tiny">
                <div className="stack"><Avatar size={16} label="V" /><Avatar size={16} label="R" /></div>
                <span className="muted">2 going · 5 interested</span>
              </div>
            </div>
            <span className="btn sm">Book</span>
          </div>
          <div className="list-row">
            <div className="ph" style={{ width: 50, height: 50 }}>photo</div>
            <div className="col grow" style={{ gap: 2 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Sunset Set</div>
              <div className="tiny muted">Sat 23 · 6 PM</div>
              <div className="tiny acc">Vicky just bought a ticket</div>
            </div>
            <span className="btn sm">View</span>
          </div>
        </div>

        <SectionTitle>Series you follow</SectionTitle>
        <div className="row gap6" style={{ overflowX: 'auto' }}>
          <div className="card thin" style={{ minWidth: 120, padding: 6 }}>
            <div className="ph" style={{ height: 50 }}>cover</div>
            <div style={{ fontWeight: 700, fontSize: 12 }}>Tribal Tales</div>
            <div className="tiny muted">8 events</div>
          </div>
          <div className="card thin" style={{ minWidth: 120, padding: 6 }}>
            <div className="ph" style={{ height: 50 }}>cover</div>
            <div style={{ fontWeight: 700, fontSize: 12 }}>Comedy Co.</div>
            <div className="tiny muted">12 events</div>
          </div>
        </div>

        <Note top={86} right={4} w={130}>
          social feed driven by<br/>
          <span className="uline">user_connections</span> graph
        </Note>
      </div>
      <TabBar active="home" />
      <SchemaList items={["user_connections", "series_follows", "event_favourites"]} />
    </Phone>
  );
}

function Search() {
  return (
    <Phone>
      <Status />
      <div className="bar">
        <span className="back">‹</span>
        <div className="input grow"><span>⌕</span><span>djs &amp; live music</span></div>
        <span className="stamp">⚙</span>
      </div>
      <div className="body scroll">
        <div className="chips row">
          <span className="chip soft">× Music</span>
          <span className="chip soft">× This weekend</span>
          <span className="chip soft">× under ₹1000</span>
        </div>

        <div className="row between">
          <div className="tiny muted">14 results · sort: Relevance ▾</div>
          <span className="tiny acc">Save search</span>
        </div>

        <EventRow title="Tribal Tales" action={<span className="stamp">♡</span>} />
        <EventRow title="Sunset Set" venue="Riverside" price="₹600" action={<span className="stamp">♡</span>} />
        <EventRow title="Indie Showcase" venue="The Loft" price="₹800" action={<span className="stamp">♡</span>} />
        <EventRow title="Open Mic Friday" venue="Studio X" price="₹250" action={<span className="stamp">♡</span>} />

        <div className="hr" />
        <div className="muted tiny">Suggested artists</div>
        <div className="chips">
          <span className="chip">@djfun</span>
          <span className="chip">@a.khan</span>
          <span className="chip">@theloft</span>
        </div>
      </div>
      <TabBar active="disc" />
    </Phone>
  );
}

function MapView() {
  return (
    <Phone>
      <Status />
      <div className="body" style={{ padding: 0, position: 'relative' }}>
        <div className="map-bg"></div>
        <div style={{ position: 'absolute', top: 8, left: 10, right: 10, display: 'flex', gap: 6, zIndex: 2 }}>
          <div className="input grow" style={{ background: '#fff' }}><span>⌕</span><span>Search location</span></div>
          <span className="stamp acc" style={{ background: '#fff', borderColor: 'var(--accent)' }}>⌖</span>
        </div>
        <div style={{ position: 'absolute', top: 46, left: 10, right: 10, zIndex: 2 }}>
          <div className="chips row">
            <span className="chip on" style={{ background:'#fff', color:'var(--accent-ink)', borderColor:'var(--accent)' }}>× Music</span>
            <span className="chip" style={{ background:'#fff' }}>Tonight</span>
            <span className="chip" style={{ background:'#fff' }}>Free</span>
          </div>
        </div>

        <div className="pin" style={{ top: 160, left: 70 }}></div>
        <div className="pin big" style={{ top: 200, left: 140 }}></div>
        <div className="pin" style={{ top: 230, left: 200 }}></div>
        <div className="pin" style={{ top: 280, left: 100 }}></div>
        <div className="pin" style={{ top: 320, left: 180 }}></div>

        <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8, zIndex: 2 }}>
          <div className="card" style={{ flexDirection: 'row', gap: 8, alignItems: 'center', background:'#fff' }}>
            <div className="ph" style={{ width: 44, height: 44 }}>img</div>
            <div className="col grow" style={{ gap: 2 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Tribal Tales</div>
              <div className="tiny muted">Wed 30 · 3:50 PM · ◉ Cafe Natarani</div>
              <div className="kmono tiny">₹500 · 5 left</div>
            </div>
            <span className="btn primary sm">Book</span>
          </div>
        </div>

        <Note top={90} right={4} w={120}>
          5 events in view · cluster zoom by lat/lng
        </Note>
      </div>
      <TabBar active="map" items={[TAB_HOME, TAB_TIX, { key:'map', label:'Map', g:'M'}, TAB_ME]} />
    </Phone>
  );
}

function CategoryGrid() {
  const cats = ["Music","Comedy","Theatre","Sports","Food","Workshop","Art","Tech","Kids","Films","Dance","Festival"];
  return (
    <Phone>
      <Status />
      <Bar title="Browse" right={<span className="stamp">⌕</span>} />
      <div className="body scroll">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {cats.map(c => (
            <div key={c} className="card thin" style={{ alignItems: 'center', padding: 8 }}>
              <div className="ph" style={{ width: 40, height: 40, borderRadius: 999 }}>cat</div>
              <div style={{ fontSize: 12 }}>{c}</div>
            </div>
          ))}
        </div>
        <Note bottom={6} left={20} w={170}>
          9 categories seeded in <span className="uline">event_categories</span>; extra from org tags
        </Note>
      </div>
      <TabBar active="disc" />
    </Phone>
  );
}

function CityPicker() {
  return (
    <Phone>
      <Status />
      <Bar title="Choose city" />
      <div className="body scroll">
        <div className="input block"><span>⌕</span><span>Search location</span></div>
        <div className="muted tiny">Popular cities</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {["Ahmedabad","Bangalore","Chennai","Mumbai","Delhi","Pune"].map(c => (
            <div key={c} className="card thin" style={{ alignItems: 'center', padding: 6 }}>
              <div className="ph" style={{ width: 44, height: 36 }}>icon</div>
              <div className="tiny">{c}</div>
            </div>
          ))}
        </div>
        <div className="hr" />
        <div className="muted tiny">All cities (A–Z)</div>
        <div className="col gap4">
          {["Abhaneri","Abhayapuri","Abiramam","Abohar","Abrama","Abu","Abu Road","Achalpur"].map(c => (
            <div key={c} className="row between" style={{ padding: '4px 2px', borderBottom: '1px dashed var(--ink-4)' }}>
              <span style={{ fontSize: 13 }}>{c}</span>
              <span className="muted">›</span>
            </div>
          ))}
        </div>
      </div>
    </Phone>
  );
}

Object.assign(window, { HomeFeed, HomeTonight, HomeFriends, Search, MapView, CategoryGrid, CityPicker });
