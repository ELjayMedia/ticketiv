// Single source for the Ticketiv and Ticketiv Organizer app marks: a notched
// ticket with a cut-out "T" between two perforation lines, drawn on a 512
// grid. Rendered by render-brand-assets.mjs.
//
// ticketiv  — the attendee app: violet tile (Quiet UI accent).
// organizer — Ticketiv Organizer: the original black icon, whose T ends in a
//             round cut-out holding the green entry check.
export const PRODUCTS = {
  ticketiv: { tile: "#6b3fbd", ticket: "#ffffff", dash: "#b9a5e8" },
  organizer: { tile: "#030407", ticket: "#ffffff", dash: "#562ada", check: "#09b94c" },
}

export function markSvg(product) {
  if (product === "organizer") return organizerSvg(PRODUCTS.organizer)
  const c = PRODUCTS[product]
  const dashes = [172, 202, 232, 262, 292, 322]
    .flatMap((y) => [131, 381].map((x) => `<rect x="${x - 4}" y="${y}" width="8" height="14" rx="4"/>`))
    .join("")
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">`,
    `<rect width="512" height="512" fill="${c.tile}"/>`,
    `<rect x="86" y="147" width="340" height="220" rx="24" fill="${c.ticket}"/>`,
    `<g fill="${c.tile}">`,
    `<circle cx="84" cy="257" r="32"/><circle cx="428" cy="257" r="32"/>`,
    `<rect x="184" y="190" width="144" height="44" rx="4"/>`,
    `<rect x="233" y="200" width="46" height="156" rx="23"/>`,
    `</g>`,
    `<g fill="${c.dash}">${dashes}</g>`,
    `</svg>`,
  ].join("")
}

function organizerSvg(c) {
  const dashes = [168, 200, 232, 264, 296, 328]
    .flatMap((y) => [160, 352].map((x) => `<rect x="${x - 3}" y="${y}" width="6" height="14" rx="3"/>`))
    .join("")
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">`,
    `<rect width="512" height="512" fill="${c.tile}"/>`,
    `<rect x="109" y="144" width="294" height="222" rx="16" fill="${c.ticket}"/>`,
    `<g fill="${c.tile}">`,
    `<circle cx="106" cy="255" r="28"/><circle cx="406" cy="255" r="28"/>`,
    `<rect x="190" y="184" width="132" height="46"/><rect x="232" y="228" width="48" height="110"/>`,
    `<circle cx="256" cy="354" r="50"/>`,
    `</g>`,
    `<g fill="${c.dash}">${dashes}</g>`,
    `<path d="M237 342l13 12 25-25" fill="none" stroke="${c.check}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`,
    `</svg>`,
  ].join("")
}
