// My Tickets: list, ticket detail (QR), transfer, resale, refund, guest list claim.

function MyTickets() {
  return (
    <Phone>
      <Status />
      <Bar back={false} title="Your tickets" right={<span className="stamp">⌕</span>} />
      <div className="body scroll">
        <div className="seg">
          <span className="on">Upcoming</span>
          <span>Past</span>
          <span>Transfers</span>
        </div>

        <div className="card row">
          <div className="ph" style={{ width: 60, height: 60 }}>img</div>
          <div className="col grow" style={{ gap: 2 }}>
            <b>Tribal Tales</b>
            <div className="tiny muted">Wed 30 Aug · 3:50 PM</div>
            <div className="tiny muted">◉ Cafe Natarani · Seats C4, C5</div>
            <div className="row gap4 tiny">
              <span className="chip soft">2 tickets</span>
              <span className="chip">issued</span>
            </div>
          </div>
        </div>

        <div className="row gap6">
          <span className="btn sm">Show QR</span>
          <span className="btn sm">Transfer</span>
          <span className="btn sm">Resell</span>
          <span className="btn sm">Refund</span>
        </div>

        <div className="hr" />

        <EventRow title="Open Mic Friday" date="Fri 25 · 8 PM" price="₹250" action={<span className="btn sm">QR</span>} />
        <EventRow title="Sunset Set" date="Sat 23 · 6 PM" price="₹600" action={<span className="btn sm">QR</span>} />

        <div className="card soft row">
          <span className="stamp acc">⇄</span>
          <div className="grow">
            <b className="tiny">Salman sent you a ticket</b>
            <div className="tiny muted">Indie Showcase · awaiting accept</div>
          </div>
          <span className="btn sm">View</span>
        </div>

        <Note top={20} right={4} w={120}>
          one row per <span className="uline">order_items</span>, status from ticket lifecycle
        </Note>
      </div>
      <TabBar active="tix" />
      <SchemaList items={["orders","order_items","transfers"]} />
    </Phone>
  );
}

function TicketDetail() {
  return (
    <Phone>
      <Status />
      <Bar title="Ticket" right={<span className="stamp">↗</span>} />
      <div className="body scroll" style={{ alignItems: 'center' }}>
        <div className="ph" style={{ width: '100%', height: 100 }}>event banner</div>
        <div className="hand-h">Tribal Tales</div>
        <div className="tiny muted">By DJ Fun · ✓ Issued</div>

        <div className="card" style={{ alignSelf: 'stretch', position: 'relative' }}>
          <div className="row between"><div><div className="tiny muted">Name</div><b>Prateek</b></div><div><div className="tiny muted">Order</div><b className="kmono">RG7352</b></div></div>
          <div className="row between"><div><div className="tiny muted">Date</div><b>30 Aug 2024</b></div><div><div className="tiny muted">Time</div><b>3:50 PM</b></div></div>
          <div className="row between"><div><div className="tiny muted">Type</div><b>Regular</b></div><div><div className="tiny muted">Seat</div><b>C-4</b></div></div>

          {/* perforated edge */}
          <div style={{ position:'absolute', left:-6, right:-6, top:'50%', height: 12, background: `radial-gradient(circle at 6px 6px, var(--paper) 5px, transparent 6px) 0 0 / 12px 12px`, pointerEvents: 'none' }}></div>
        </div>

        <div className="tiny muted txt-c">Scan your QR at the entry gate</div>
        <div className="qr"></div>
        <div className="kmono tiny">TKT-9X2K-LM4P</div>

        <div className="row gap6 full">
          <span className="btn grow">Download</span>
          <span className="btn primary grow">Add to wallet</span>
        </div>

        <Note bottom={10} right={2} w={130}>
          QR encodes <span className="uline">order_items.code</span>; scans hit <span className="uline">scans</span>
        </Note>
      </div>
    </Phone>
  );
}

function TransferTicket() {
  return (
    <Phone>
      <Status />
      <Bar title="Transfer" sub="1 ticket · free" />
      <div className="body scroll">
        <div className="card thin row">
          <div className="ph" style={{ width: 44, height: 44 }}>img</div>
          <div className="col grow"><b className="tiny">Tribal Tales</b><div className="tiny muted">Wed 30 Aug · Seat C5</div></div>
        </div>

        <div className="muted tiny">Send to</div>
        <div className="input block"><span>⌕</span><span>Search by @handle or phone</span></div>

        <div className="muted tiny">Friends</div>
        <div className="col gap4">
          {[
            ["Farah Khan","@farah"],
            ["Salman Khan","@salman"],
            ["Amir Khan","@amir"],
          ].map(([n,h]) => (
            <div key={h} className="row gap8" style={{ padding:'4px 2px' }}>
              <Avatar size={32} label={n.split(' ').map(x=>x[0]).join('')} />
              <div className="col grow"><b className="tiny">{n}</b><div className="tiny muted">{h}</div></div>
              <span className="radio"></span>
            </div>
          ))}
        </div>

        <div className="card soft">
          <div className="tiny"><b>How it works</b></div>
          <div className="tiny muted" style={{ lineHeight: 1.4 }}>
            Recipient gets a request and 24h to accept. Original QR is revoked once accepted.
          </div>
        </div>

        <div className="row gap6 tiny muted">
          <span className="check on">✓</span> Notify recipient by SMS
        </div>

        <Note bottom={48} left={6} w={120}>
          <span className="uline">transfers</span>: pending → accepted/declined/expired
        </Note>
      </div>
      <div style={{ borderTop: '1.4px solid var(--ink)', padding: '8px 12px', display:'flex', gap:8 }}>
        <span className="btn grow">Cancel</span>
        <span className="btn primary grow">Send transfer</span>
      </div>
      <SchemaList items={["transfers","order_items","notifications"]} />
    </Phone>
  );
}

function ResaleListing() {
  return (
    <Phone>
      <Status />
      <Bar title="List for resale" />
      <div className="body scroll">
        <div className="card thin row">
          <div className="ph" style={{ width: 44, height: 44 }}>img</div>
          <div className="col grow"><b className="tiny">Tribal Tales</b><div className="tiny muted">Seat C5 · Regular · paid ₹500</div></div>
        </div>

        <div className="card">
          <div className="tiny muted">Your asking price</div>
          <div className="row between" style={{ alignItems: 'baseline' }}>
            <span className="kmono">₹</span>
            <input className="field grow" defaultValue="450" style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', textAlign: 'right' }} />
          </div>
          <div className="hr" />
          <PriceLine label="Buyer pays" value="₹450" />
          <PriceLine label="Platform fee (8%)" value="−₹36" />
          <PriceLine label="You receive" value="₹414" strong />
        </div>

        <div className="muted tiny">Cap rules</div>
        <div className="tiny">Face value: ₹500 · Max resale: 110% = ₹550</div>

        <div className="card soft">
          <div className="tiny"><b>When it sells</b></div>
          <div className="tiny muted" style={{ lineHeight: 1.4 }}>
            QR is auto-revoked. Buyer's QR is issued. Funds go to your wallet within 24h after the event.
          </div>
        </div>

        <Note top={50} right={4} w={130}>
          creates <span className="uline">resale_listings</span> → <span className="uline">transfers</span> on sale
        </Note>
      </div>
      <div style={{ borderTop: '1.4px solid var(--ink)', padding: '8px 12px', display:'flex', gap:8 }}>
        <span className="btn grow">Cancel</span>
        <span className="btn primary grow">List for ₹450</span>
      </div>
      <SchemaList items={["resale_listings","transfers","payouts"]} />
    </Phone>
  );
}

function RefundRequest() {
  return (
    <Phone>
      <Status />
      <Bar title="Request refund" />
      <div className="body scroll">
        <div className="card thin">
          <div className="row between"><b className="tiny">Tribal Tales</b><span className="tiny muted">#RG7352</span></div>
          <div className="tiny muted">Wed 30 Aug · 2 tickets · ₹1 018 paid</div>
        </div>

        <div className="muted tiny">Refund which tickets?</div>
        <div className="card thin row"><span className="check on">✓</span><div className="grow tiny">Seat C4 · Regular · ₹500</div><span className="kmono tiny">₹500</span></div>
        <div className="card thin row"><span className="check"></span><div className="grow tiny">Seat C5 · Regular · ₹500</div><span className="kmono tiny">₹500</span></div>

        <div className="muted tiny">Reason</div>
        <div className="field">Can't attend ▾</div>
        <div className="field tall">Notes (optional)</div>

        <div className="card">
          <PriceLine label="Refund amount" value="₹500" />
          <PriceLine label="Booking fee" value="−₹50 non-refundable" />
          <div className="hr"/>
          <PriceLine label="You will receive" value="₹450" strong />
          <div className="tiny muted">Back to original payment method · 3–5 business days</div>
        </div>

        <div className="card soft">
          <div className="tiny"><b>Organizer's policy</b></div>
          <div className="tiny muted" style={{ lineHeight: 1.4 }}>
            Full refund up to 48h before event · 50% up to 24h before · none after.
          </div>
        </div>

        <Note top={20} right={4} w={130}>
          partial supported — <span className="uline">refund_items</span> line-level
        </Note>
      </div>
      <div style={{ borderTop: '1.4px solid var(--ink)', padding: '8px 12px', display: 'flex', gap: 8 }}>
        <span className="btn grow">Cancel</span>
        <span className="btn primary grow">Request refund</span>
      </div>
      <SchemaList items={["refunds","refund_items","payments"]} />
    </Phone>
  );
}

function GuestListClaim() {
  return (
    <Phone>
      <Status />
      <Bar title="Claim invite" />
      <div className="body scroll" style={{ alignItems: 'center', textAlign: 'center' }}>
        <span className="stamp" style={{ width: 40, height: 40, borderRadius: 999, fontSize: 18 }}>★</span>
        <div className="hand-h">You're on the list</div>
        <div className="tiny muted">Rishabh Mehta added you as a guest</div>

        <div className="card thin row" style={{ alignSelf: 'stretch' }}>
          <div className="ph" style={{ width: 50, height: 50 }}>img</div>
          <div className="col grow" style={{ gap: 2, alignItems: 'flex-start' }}>
            <b className="tiny">Tribal Tales</b>
            <div className="tiny muted">Wed 30 Aug · 3:50 PM</div>
            <div className="tiny acc">2 complimentary tickets</div>
          </div>
        </div>

        <div className="muted tiny" style={{ alignSelf: 'flex-start' }}>Confirm attendees</div>
        <div className="field full">Your name · Prateek</div>
        <div className="field full muted">+1 guest name</div>

        <div className="btn primary block">Claim tickets</div>
        <div className="tiny muted">QR tickets will appear in Your tickets</div>

        <Note bottom={20} right={2} w={130}>
          <span className="uline">guestlist_fulfillments</span> links guest → order on claim
        </Note>
      </div>
      <SchemaList items={["guestlist_entries","guestlist_fulfillments"]} />
    </Phone>
  );
}

Object.assign(window, { MyTickets, TicketDetail, TransferTicket, ResaleListing, RefundRequest, GuestListClaim });
