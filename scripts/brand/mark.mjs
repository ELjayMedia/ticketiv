// Single source for the Ticketiv and Ticketiv Organizer app marks: a notched
// ticket with a cut-out "T" (rounded stem) between two perforation lines,
// drawn on a 512 grid. Rendered by render-brand-assets.mjs.
//
// ticketiv  — the attendee app: violet tile (Quiet UI accent).
// organizer — Ticketiv Organizer: ink tile, violet perforations.
export const PRODUCTS = {
  ticketiv: { tile: "#6b3fbd", ticket: "#ffffff", dash: "#b9a5e8" },
  organizer: { tile: "#0a0a0c", ticket: "#ffffff", dash: "#6b3fbd" },
}

export function markSvg(product) {
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
