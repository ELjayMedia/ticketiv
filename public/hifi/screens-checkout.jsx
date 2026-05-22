// Checkout flow: ticket type, seat map, attendee form, promo code, payment, confirmation.

function BookTicket() {
  return (
    <Phone>
      <Status />
      <Bar title="Book Ticket" />
      <div className="body scroll">
        <div className="seg">
          <span className="on">Regular</span>
          <span>Premium</span>
          <span>VIP</span>
          <span className="muted strike">Early</span>
        </div>

        <div className="card thin row">
          <div className="ph" style={{ width: 60, height: 60 }}>img</div>
          <div className="col grow" style={{ gap: 2 }}>
            <div className="row between">
              <b>Tribal Tales</b>
              <span className="tiny acc">5 left</span>
            </div>
            <div className="tiny muted">Wed 30 Aug · 3:50 PM</div>
            <div className="tiny muted">◉ Cafe Natarani</div>
            <div className="row between" style={{ marginTop: 2 }}>
              <span className="kmono">₹500</span>
              <div className="row gap6">
                <span className="stamp">−</span>
                <span style={{ fontSize: 14 }}>1</span>
                <span className="stamp">+</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card thin">
          <div className="row between"><span className="muted tiny">Per-user limit</span><span className="tiny">4 max</span></div>
          <div className="row between"><span className="muted tiny">Channel</span><span className="tiny">Online ✓</span></div>
        </div>

        <div className="card">
          <PriceLine label="1 × Regular" value="₹500" />
          <PriceLine label="Booking fee (incl. GST)" value="₹50" />
          <PriceLine label="Promo: WELCOME10" value="−₹50" />
          <div className="hr" />
          <PriceLine label="Grand Total" value="₹500" strong />
        </div>

        <div className="row between tiny">
          <span className="acc">+ Add promo code</span>
          <span className="muted">Buyer pays fees</span>
        </div>

        <Note bottom={50} right={2} w={130}>
          channel quota: <span className="uline">ticket_type_channels.online</span>
        </Note>
      </div>
      <div style={{ borderTop: '1.4px solid var(--ink)', padding: '8px 12px' }}>
        <div className="btn primary block">Continue</div>
      </div>
      <SchemaList items={["ticket_types","ticket_type_channels","price_rules","orders"]} />
    </Phone>
  );
}

function SeatMap() {
  const rows = ["A","B","C","D","E","F","G"];
  return (
    <Phone>
      <Status />
      <Bar title="Pick seats" sub="Tribal Tales · 30 Aug" />
      <div className="body" style={{ padding: '8px 10px', gap: 8 }}>
        <div className="card thin txt-c" style={{ padding: 4 }}>
          <div className="kmono tiny muted">STAGE</div>
        </div>

        <div className="col gap4" style={{ alignItems: 'center' }}>
          {rows.map((r, ri) => (
            <div key={r} className="row gap4">
              <span className="kmono tiny muted" style={{ width: 8 }}>{r}</span>
              {[0,1,2,3,4,5,6,7,8,9].map(c => {
                const code = `${r}${c+1}`;
                let cls = 'seat';
                if (ri === 0 && c < 3) cls += ' sold';
                else if (ri === 0 && c === 5) cls += ' hold';
                else if (ri === 2 && (c === 3 || c === 4)) cls += ' pick';
                else if (ri === 3 && c === 7) cls += ' sold';
                else if (ri === 5 && c > 7) cls += ' gone';
                return <span key={c} className={cls} title={code}></span>;
              })}
              <span className="kmono tiny muted" style={{ width: 8 }}>{r}</span>
            </div>
          ))}
        </div>

        <div className="row gap8 txt-c" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
          <span className="row gap4 tiny"><span className="seat"></span> Available</span>
          <span className="row gap4 tiny"><span className="seat pick"></span> Selected</span>
          <span className="row gap4 tiny"><span className="seat sold"></span> Sold</span>
          <span className="row gap4 tiny"><span className="seat hold"></span> Held</span>
        </div>

        <div className="card thin">
          <div className="row between">
            <b className="tiny">Your seats</b>
            <span className="tiny acc kmono">holds for 9:42</span>
          </div>
          <div className="chips">
            <span className="chip soft">C4 ×</span>
            <span className="chip soft">C5 ×</span>
          </div>
        </div>

        <Note bottom={48} left={4} w={150}>
          <span className="uline">seat_holds</span> created — expires per <span className="uline">seat_reservations.expires_at</span>
        </Note>
      </div>
      <div style={{ borderTop: '1.4px solid var(--ink)', padding: '8px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
        <div className="col gap2 grow">
          <div className="tiny muted">2 seats</div>
          <div className="hand-h2">₹1 000</div>
        </div>
        <span className="btn primary">Continue</span>
      </div>
      <SchemaList items={["seat_maps","seats","seat_holds","seat_reservations"]} />
    </Phone>
  );
}

function AttendeeForm() {
  return (
    <Phone>
      <Status />
      <Bar title="Attendee details" sub="Step 2 of 3" />
      <div className="body scroll">
        <div className="tiny muted">Buyer</div>
        <div className="field">Prateek Sharma</div>
        <div className="field">prateek@mail.in</div>

        <div className="hr" />

        <div className="row between">
          <div className="tiny muted">Attendee · Ticket 1 (C4)</div>
          <span className="tiny acc">Same as buyer</span>
        </div>
        <div className="field">Full name</div>
        <div className="field">Phone (+91)</div>
        <div className="field">T-shirt size — M ▾</div>
        <div className="field tall">Dietary requirements (optional)</div>

        <div className="row between">
          <div className="tiny muted">Attendee · Ticket 2 (C5)</div>
          <span className="tiny acc">+ Fill</span>
        </div>
        <div className="field muted">Tap to add details</div>

        <Note top={150} right={2} w={130}>
          per-event <span className="uline">custom_fields</span> (jsonb) drives this form
        </Note>
      </div>
      <div style={{ borderTop: '1.4px solid var(--ink)', padding: '8px 12px', display: 'flex', gap: 8 }}>
        <span className="btn grow">Back</span>
        <span className="btn primary grow">Continue</span>
      </div>
    </Phone>
  );
}

function PromoCode() {
  return (
    <Phone>
      <Status />
      <Bar title="Discounts" />
      <div className="body scroll">
        <div className="row gap6">
          <div className="field grow kmono">WELCOME10</div>
          <span className="btn">Apply</span>
        </div>
        <div className="card soft thin row">
          <span className="stamp acc">✓</span>
          <div className="grow"><b>WELCOME10</b><div className="tiny muted">10% off · −₹50</div></div>
          <span className="tiny acc">Remove</span>
        </div>

        <div className="muted tiny mt8">Available offers</div>
        <div className="card thin">
          <div className="row between">
            <div className="row gap6"><span className="stamp">%</span><b>EARLY20</b></div>
            <span className="btn sm">Apply</span>
          </div>
          <div className="tiny muted">20% off · ends Fri · members only</div>
        </div>
        <div className="card thin">
          <div className="row between">
            <div className="row gap6"><span className="stamp">%</span><b>NEW100</b></div>
            <span className="btn sm">Apply</span>
          </div>
          <div className="tiny muted">Flat ₹100 off your first ticket</div>
        </div>

        <div className="card">
          <PriceLine label="Subtotal" value="₹1 000" />
          <PriceLine label="Booking fee" value="₹100" />
          <PriceLine label="GST (18%)" value="₹18" />
          <PriceLine label="WELCOME10" value="−₹100" />
          <div className="hr" />
          <PriceLine label="Total" value="₹1 018" strong />
        </div>

        <Note top={64} right={2} w={120}>
          <span className="uline">price_rules</span> engine — applied at order scope
        </Note>
      </div>
      <div style={{ borderTop: '1.4px solid var(--ink)', padding: '8px 12px' }}>
        <span className="btn primary block">Continue to pay</span>
      </div>
      <SchemaList items={["price_rules","order_adjustments"]} />
    </Phone>
  );
}

function PaymentMethod() {
  return (
    <Phone>
      <Status />
      <Bar title="Payment" sub="Step 3 of 3" />
      <div className="body scroll">
        <div className="card">
          <div className="row between"><span className="muted tiny">Total</span><span className="hand-h2">₹1 018</span></div>
          <div className="tiny muted">Order #RG7352 · holds 8:47</div>
        </div>

        <div className="muted tiny">Saved methods</div>
        <div className="card thin row">
          <span className="radio on"></span>
          <div className="grow"><b>Visa •••• 4242</b><div className="tiny muted">Exp 12/27</div></div>
          <span className="stamp">VISA</span>
        </div>

        <div className="muted tiny">Pay with</div>
        <div className="card thin row">
          <span className="radio"></span>
          <div className="grow">UPI / Paystack</div>
          <span className="stamp">⇶</span>
        </div>
        <div className="card thin row">
          <span className="radio"></span>
          <div className="grow">Card · DeltaPay</div>
        </div>
        <div className="card thin row">
          <span className="radio"></span>
          <div className="grow">Wallet · Flutterwave</div>
        </div>
        <div className="card thin row">
          <span className="radio"></span>
          <div className="grow">Pay later (manual / bank transfer)</div>
        </div>

        <div className="row gap6 tiny muted">
          <span className="check on">✓</span>
          I accept refund &amp; cancellation policy
        </div>

        <Note top={130} right={2} w={140}>
          providers: <span className="uline">payments.provider</span> ∈ paystack | deltapay | flutterwave | manual
        </Note>
      </div>
      <div style={{ borderTop: '1.4px solid var(--ink)', padding: '8px 12px' }}>
        <span className="btn primary block">Pay ₹1 018</span>
      </div>
      <SchemaList items={["payments","payment_attempts","saved_payment_methods"]} />
    </Phone>
  );
}

function Confirmation() {
  return (
    <Phone>
      <Status />
      <Bar title="Confirmation" right={<span className="stamp">↗</span>} />
      <div className="body scroll" style={{ alignItems: 'center', textAlign: 'center' }}>
        <div className="stamp acc" style={{ width: 48, height: 48, borderRadius: 999, fontSize: 22 }}>✓</div>
        <div className="hand-h">You're in.</div>
        <div className="tiny muted">2 tickets · Order #RG7352</div>

        <div className="card thin row" style={{ alignSelf: 'stretch' }}>
          <div className="ph" style={{ width: 50, height: 50 }}>img</div>
          <div className="col grow" style={{ gap: 2, alignItems: 'flex-start' }}>
            <b style={{ fontSize: 14 }}>Tribal Tales</b>
            <div className="tiny muted">Wed 30 Aug · 3:50 PM</div>
            <div className="tiny muted">Seats C4, C5</div>
          </div>
        </div>

        <div className="row gap6 full">
          <span className="btn grow">View tickets</span>
          <span className="btn primary grow">Add to calendar</span>
        </div>

        <div className="card thin" style={{ alignSelf: 'stretch' }}>
          <div className="row between"><b className="tiny">Receipt by email</b><span className="acc tiny">Sent ✓</span></div>
          <div className="tiny muted">prateek@mail.in</div>
        </div>

        <div className="card soft row" style={{ alignSelf: 'stretch' }}>
          <span className="stamp">👥</span>
          <div className="grow tiny">Invite friends to join you</div>
          <span className="btn sm">Invite</span>
        </div>

        <Note bottom={6} left={6} w={120}>
          fires <span className="uline">notifications</span> + <span className="uline">ledger_entries</span>
        </Note>
      </div>
    </Phone>
  );
}

Object.assign(window, { BookTicket, SeatMap, AttendeeForm, PromoCode, PaymentMethod, Confirmation });
