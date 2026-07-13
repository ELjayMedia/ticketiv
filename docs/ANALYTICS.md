# Buyer funnel analytics (TICK-264)

Ticketiv uses Vercel Web Analytics for page views and custom buyer-funnel events.
The root layout mounts `@vercel/analytics/next`, and the funnel helpers live in
`components/analytics/buyer-funnel.tsx`.

## Event contract

| Event | Fired when | Key properties |
|---|---|---|
| `buyer_funnel_event_view` | Public event detail renders | `event_id`, `event_slug`, `category`, `from_price_minor`, `ticket_type_count` |
| `buyer_funnel_add_to_checkout` | Buyer submits the event-detail ticket hold form | `event_id`, `event_slug`, `ticket_type_id`, `quantity`, `surface` |
| `buyer_funnel_checkout_start` | Checkout page renders | `event_id`, `event_slug`, `ticket_type_count`, `has_hold` |
| `buyer_funnel_checkout_error` | Checkout cannot start a payment | `event_id`, `event_slug`, `reason`, `surface` |
| `buyer_funnel_payment_redirect` | Buyer is sent to Paystack or internal confirmation | `event_id`, `event_slug`, `ticket_type_id`, `quantity`, `total_minor`, `provider`, `surface` |
| `buyer_funnel_payment_success` | Confirmation page shows a paid order | `order_id`, `event_slug`, `quantity`, `total_minor` |
| `buyer_funnel_payment_failure` | Confirmation page shows a failed order | `order_id`, `event_slug`, `quantity`, `total_minor` |
| `buyer_funnel_payment_pending` | Confirmation page is still waiting on provider/webhook settlement | `order_id`, `event_slug`, `quantity`, `total_minor` |

## Dashboard

In Vercel Analytics, build a conversion view in this order:

1. `buyer_funnel_event_view`
2. `buyer_funnel_add_to_checkout`
3. `buyer_funnel_checkout_start`
4. `buyer_funnel_payment_redirect`
5. `buyer_funnel_payment_success`

Segment by `event_slug`, `surface`, and `provider` to find event-level or
device-specific drop-off. Treat `buyer_funnel_checkout_error` and
`buyer_funnel_payment_failure` as the diagnostic series beside the main funnel.

No personal buyer data is sent. Order IDs appear only on the confirmation-page
payment outcome events so support can reconcile failed/pending states with the
server-side order record.
