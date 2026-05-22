// Organizer mode: dashboard, create-event wizard, manage event/tickets, guest list, scanner, POS.

function OrgDashboard() {
  return (
    <Phone>
      <Status />
      <div className="bar">
        <div className="col grow" style={{ gap: 0 }}>
          <div className="tiny muted">Organizer</div>
          <div className="hand-h2">Rishabh's Events ▾</div>
        </div>
        <span className="stamp">◔</span>
      </div>
      <div className="body scroll">
        <div className="row gap6">
          <div className="card thin grow" style={{ padding: 8 }}>
            <div className="tiny muted">Tickets sold · 7d</div>
            <div className="hand-h2">182</div>
            <div className="tiny acc">▲ 24%</div>
          </div>
          <div className="card thin grow" style={{ padding: 8 }}>
            <div className="tiny muted">Gross · 7d</div>
            <div className="hand-h2">₹91k</div>
            <div className="tiny muted">net ₹78k</div>
          </div>
        </div>

        {/* sparkline */}
        <div className="card thin" style={{ padding: 8 }}>
          <div className="row between tiny"><b>Daily sales</b><span className="muted">Jul</span></div>
          <svg viewBox="0 0 200 60" style={{ width: '100%', height: 60 }}>
            <polyline points="0,40 20,38 40,35 60,28 80,30 100,22 120,18 140,25 160,15 180,8 200,12" fill="none" stroke="var(--accent)" strokeWidth="2"/>
            <polyline points="0,55 20,50 40,52 60,45 80,48 100,40 120,38 140,42 160,32 180,28 200,30" fill="none" stroke="var(--ink-3)" strokeWidth="1.2" strokeDasharray="3 3"/>
          </svg>
          <div className="row gap8 tiny muted">
            <span><span className="seat pick"></span> revenue</span>
            <span><span className="seat" style={{ borderStyle: 'dashed' }}></span> tickets</span>
          </div>
        </div>

        <div className="muted tiny">Live events</div>
        <div className="card thin row">
          <div className="ph" style={{ width: 44, height: 44 }}>img</div>
          <div className="col grow">
            <b className="tiny">Tribal Tales</b>
            <div className="tiny muted">tonight · 3 hrs to start</div>
            <div className="tiny acc">85 / 120 sold · 12 scanned</div>
          </div>
          <span className="muted">›</span>
        </div>

        <div className="row gap6">
          <span className="btn block grow primary">+ New event</span>
          <span className="btn grow">Payouts</span>
        </div>

        <Note bottom={56} right={2} w={130}>
          aggregates from <span className="uline">event_metrics_daily</span>
        </Note>
      </div>
      <TabBar active="home" items={[
        { key:'home', label:'Overview', g:'O' },
        { key:'evt',  label:'Events',   g:'E' },
        { key:'sca',  label:'Scan',     g:'⌖' },
        { key:'me',   label:'Account',  g:'U' },
      ]} />
      <SchemaList items={["organizations","org_members","event_metrics_daily","ledger_entries"]} />
    </Phone>
  );
}

function CreateEventWizard() {
  return (
    <Phone>
      <Status />
      <Bar title="New event" sub="Step 2 of 5 · Schedule" />
      <div className="body scroll">
        {/* stepper */}
        <div className="row gap4">
          {["Basics","When","Where","Tickets","Publish"].map((s, i) => (
            <div key={s} className="col grow" style={{ alignItems:'center', gap: 2 }}>
              <div className="stamp" style={{ background: i < 2 ? 'var(--accent)' : 'transparent', color: i < 2 ? '#fff' : 'inherit', borderColor: i < 2 ? 'var(--accent)' : 'var(--ink)' }}>{i+1}</div>
              <div className="tiny muted" style={{ fontSize: 9 }}>{s}</div>
            </div>
          ))}
        </div>

        <div className="muted tiny">Format</div>
        <div className="row gap6">
          <span className="chip on">Single day</span>
          <span className="chip">Multi-day</span>
          <span className="chip">Recurring</span>
        </div>

        <div className="muted tiny">Date &amp; time</div>
        <div className="row gap6">
          <div className="field grow">Wed 30 Aug 2025</div>
          <div className="field">3:50 PM</div>
        </div>
        <div className="row gap6">
          <div className="field grow muted">Ends · same day</div>
          <div className="field">5:50 PM</div>
        </div>

        <div className="muted tiny">Visibility</div>
        <div className="row gap6">
          <span className="chip on">Public</span>
          <span className="chip">Unlisted</span>
          <span className="chip">Private</span>
        </div>

        <div className="muted tiny">Scheduled publish</div>
        <div className="row gap6">
          <div className="field grow">Tue 22 Jul · 9 AM</div>
          <div className="field">Auto unpublish · ends</div>
        </div>

        <div className="card soft">
          <div className="tiny"><b>Add to series</b></div>
          <div className="tiny muted">Tribal Tales Tour · slot 4 of 8</div>
        </div>

        <Note top={120} right={2} w={120}>
          drives <span className="uline">events.starts_at</span>, <span className="uline">publish_at</span>, <span className="uline">visibility</span>
        </Note>
      </div>
      <div style={{ borderTop: '1.4px solid var(--ink)', padding: '8px 12px', display: 'flex', gap: 8 }}>
        <span className="btn grow">Save draft</span>
        <span className="btn primary grow">Next</span>
      </div>
      <SchemaList items={["events","event_series"]} />
    </Phone>
  );
}

function ManageTicketTypes() {
  return (
    <Phone>
      <Status />
      <Bar title="Ticket types" sub="Tribal Tales" right={<span className="stamp">+</span>} />
      <div className="body scroll">
        <div className="card thin">
          <div className="row between">
            <b>Regular</b>
            <span className="chip soft">on_sale</span>
          </div>
          <div className="row between tiny">
            <span className="muted">₹500 · 85 / 120 sold</span>
            <span className="acc">✎</span>
          </div>
          {/* progress */}
          <div style={{ height: 6, background: 'var(--paper-2)', borderRadius: 3, border: '1px solid var(--ink-4)' }}>
            <div style={{ width: '70%', height: '100%', background: 'var(--accent)', borderRadius: 3 }}></div>
          </div>
          <div className="row gap4 tiny muted">
            <span>Online 60</span>·<span>POS 18</span>·<span>Comp 7</span>
          </div>
        </div>

        <div className="card thin">
          <div className="row between">
            <b>Premium</b>
            <span className="chip">paused</span>
          </div>
          <div className="row between tiny">
            <span className="muted">₹1 200 · 12 / 30 sold</span>
            <span className="acc">✎</span>
          </div>
        </div>

        <div className="card thin">
          <div className="row between">
            <b>VIP</b>
            <span className="chip" style={{ background:'var(--ink)', color:'#fff', borderColor:'var(--ink)' }}>sold_out</span>
          </div>
          <div className="row between tiny">
            <span className="muted">₹2 500 · 10 / 10</span>
            <span className="acc">+ release</span>
          </div>
        </div>

        <div className="card thin">
          <div className="row between">
            <b>Early bird</b>
            <span className="chip">hidden</span>
          </div>
          <div className="row between tiny">
            <span className="muted">₹350 · ended Jul 1</span>
            <span className="muted">✎</span>
          </div>
        </div>

        <div className="hr"/>

        <div className="muted tiny">Quick actions</div>
        <div className="row gap6">
          <span className="btn sm grow">+ Promo</span>
          <span className="btn sm grow">Guest list</span>
          <span className="btn sm grow">Custom fields</span>
        </div>

        <Note bottom={20} right={2} w={120}>
          <span className="uline">ticket_types.sales_status</span>: on_sale|paused|sold_out|hidden
        </Note>
      </div>
      <SchemaList items={["ticket_types","ticket_type_channels","price_rules"]} />
    </Phone>
  );
}

function GuestListManage() {
  return (
    <Phone>
      <Status />
      <Bar title="Guest list" sub="Tribal Tales · 12 invited" right={<span className="stamp">+</span>} />
      <div className="body scroll">
        <div className="row gap6">
          <span className="chip on">All</span>
          <span className="chip">Invited</span>
          <span className="chip">Claimed</span>
          <span className="chip">Checked-in</span>
        </div>

        {[
          ["Priya Shah","2 tix","claimed", "check-in 7:50"],
          ["Asha Iyer","1 tix","invited", "no claim"],
          ["Manish G","2 tix","claimed", "—"],
          ["Vicky K","1 tix","checked-in","gate 1 · 8:02"],
          ["Riya M","1 tix","invited","sent 2d ago"],
        ].map(([n,t,s,d]) => (
          <div key={n} className="card thin">
            <div className="row gap6">
              <Avatar size={28} label={n.split(' ').map(x=>x[0]).join('')} />
              <div className="col grow"><b className="tiny">{n}</b><div className="tiny muted">{t} · {d}</div></div>
              <span className={`chip ${s === 'checked-in' ? 'on' : s === 'claimed' ? 'soft' : ''}`} style={{ fontSize: 10 }}>{s}</span>
            </div>
          </div>
        ))}

        <div className="card soft">
          <div className="tiny"><b>Bulk add</b></div>
          <div className="tiny muted">Paste CSV: name, email, allocation</div>
        </div>

        <Note bottom={20} left={4} w={130}>
          one row per <span className="uline">guestlist_entries</span>, linked via <span className="uline">guestlist_fulfillments</span>
        </Note>
      </div>
    </Phone>
  );
}

function ScannerUI() {
  return (
    <Phone style={{ background: '#1a1815' }}>
      <Status />
      <div className="bar" style={{ borderBottom: '1.2px solid var(--ink-3)', color: 'var(--paper)' }}>
        <span className="back" style={{ color:'var(--paper)' }}>‹</span>
        <div className="col grow" style={{ gap: 0 }}>
          <div className="title" style={{ color: 'var(--paper)' }}>Scanner</div>
          <div className="tiny" style={{ color: 'var(--ink-4)' }}>Tribal Tales · Gate 1 · device #4</div>
        </div>
        <span className="stamp" style={{ color: 'var(--paper)', borderColor: 'var(--paper)' }}>⚡</span>
      </div>
      <div className="body" style={{ background: '#26221d', color: 'var(--paper)', padding: 12 }}>
        {/* viewfinder */}
        <div style={{ position: 'relative', height: 200, border: '1.4px dashed var(--ink-4)', borderRadius: 12, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <span className="kmono tiny" style={{ color: 'var(--ink-4)' }}>aim at QR</span>
          {/* corners */}
          {[[0,0],[1,0],[0,1],[1,1]].map(([x,y], i) => (
            <div key={i} style={{ position:'absolute', [x?'right':'left']: 8, [y?'bottom':'top']: 8, width: 18, height: 18, borderTop: y?0:'2px solid var(--accent)', borderBottom: y?'2px solid var(--accent)':0, borderLeft: x?0:'2px solid var(--accent)', borderRight: x?'2px solid var(--accent)':0 }}></div>
          ))}
          {/* sweep */}
          <div style={{ position:'absolute', left: 14, right: 14, top: '50%', height: 2, background: 'var(--accent)', boxShadow: '0 0 10px var(--accent)' }}></div>
        </div>

        {/* last scan */}
        <div className="card" style={{ background: '#1f1c18', borderColor: 'var(--ink-3)', color: 'var(--paper)' }}>
          <div className="row between">
            <div className="stamp acc" style={{ borderRadius: 999, width: 30, height: 30, fontSize: 14 }}>✓</div>
            <span className="tiny" style={{ color: 'var(--ink-4)' }}>3 sec ago</span>
          </div>
          <b>Prateek Sharma</b>
          <div className="tiny" style={{ color: 'var(--ink-4)' }}>Regular · Seat C4 · TKT-9X2K-LM4P</div>
          <div className="kmono tiny acc">VALID · checked in</div>
        </div>

        <div className="row gap6">
          <div className="col grow" style={{ alignItems: 'center' }}>
            <div className="hand-h2 acc">214</div>
            <div className="tiny" style={{ color: 'var(--ink-4)' }}>scanned</div>
          </div>
          <div className="col grow" style={{ alignItems: 'center' }}>
            <div className="hand-h2" style={{ color: 'var(--paper)' }}>6</div>
            <div className="tiny" style={{ color: 'var(--ink-4)' }}>rejected</div>
          </div>
          <div className="col grow" style={{ alignItems: 'center' }}>
            <div className="hand-h2" style={{ color: 'var(--paper)' }}>320</div>
            <div className="tiny" style={{ color: 'var(--ink-4)' }}>capacity</div>
          </div>
        </div>

        <div className="row gap6 between">
          <span className="btn sm" style={{ background: 'transparent', color: 'var(--paper)', borderColor: 'var(--paper)' }}>Manual code</span>
          <span className="btn sm primary">Flash on</span>
        </div>
      </div>
    </Phone>
  );
}

function POSTerminal() {
  return (
    <Phone>
      <Status />
      <Bar title="POS" sub="Tribal Tales · device #2" right={<span className="stamp">≡</span>} />
      <div className="body scroll">
        <div className="muted tiny">Pick tickets</div>
        <div className="card thin row">
          <div className="grow"><b className="tiny">Regular</b><div className="tiny muted">₹500 · 35 left at door</div></div>
          <div className="row gap4"><span className="stamp">−</span><b>2</b><span className="stamp">+</span></div>
        </div>
        <div className="card thin row">
          <div className="grow"><b className="tiny">Premium</b><div className="tiny muted">₹1 200 · 18 left</div></div>
          <div className="row gap4"><span className="stamp">−</span><b>0</b><span className="stamp">+</span></div>
        </div>
        <div className="card thin row">
          <div className="grow muted"><b className="tiny">VIP</b><div className="tiny muted">sold out</div></div>
          <span className="muted">—</span>
        </div>

        <div className="hr"/>

        <div className="card">
          <PriceLine label="2 × Regular" value="₹1 000" />
          <PriceLine label="Booking fee" value="waived (POS)" />
          <PriceLine label="Total" value="₹1 000" strong />
        </div>

        <div className="muted tiny">Pay by</div>
        <div className="row gap6 wrap">
          <span className="chip on">Cash</span>
          <span className="chip">UPI scan</span>
          <span className="chip">Card · tap</span>
          <span className="chip">Comp</span>
        </div>

        <Note bottom={48} right={2} w={140}>
          POS sale → <span className="uline">orders.channel='pos'</span>, ticket types respect <span className="uline">ticket_type_channels.pos</span>
        </Note>
      </div>
      <div style={{ borderTop: '1.4px solid var(--ink)', padding: '8px 12px', display:'flex', gap:8 }}>
        <span className="btn grow">Print receipt</span>
        <span className="btn primary grow">Charge ₹1 000</span>
      </div>
      <SchemaList items={["orders","devices","device_sessions","payments"]} />
    </Phone>
  );
}

Object.assign(window, { OrgDashboard, CreateEventWizard, ManageTicketTypes, GuestListManage, ScannerUI, POSTerminal });
