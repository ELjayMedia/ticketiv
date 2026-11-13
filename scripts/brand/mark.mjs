// Single source for the Ticketiv and Ticketiv Organizer app marks.
// The mark is a ticket with a cut-out "T" and an entry check, drawn on a 512 grid.
export const PRODUCTS = {
  ticketiv: { tile: "#030407", ticket: "#ffffff", dash: "#562ada", check: "#09b94c" },
  organizer: { tile: "#6b3fbd", ticket: "#ffffff", dash: "#6b3fbd", check: "#ffffff" },
}

export function markSvg(product, { shape = "square" } = {}) {
  const c = PRODUCTS[product]
  const dashes = [168, 200, 232, 264, 296, 328]
    .flatMap((y) => [160, 352].map((x) => `<rect x="${x - 3}" y="${y}" width="6" height="14" rx="3"/>`))
    .join("")
  const tile = shape === "round" ? `<circle cx="256" cy="256" r="256" fill="${c.tile}"/>` : `<rect width="512" height="512" fill="${c.tile}"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${tile}<rect x="109" y="144" width="294" height="222" rx="16" fill="${c.ticket}"/><g fill="${c.tile}"><circle cx="106" cy="255" r="28"/><circle cx="406" cy="255" r="28"/><rect x="190" y="184" width="132" height="46"/><rect x="232" y="228" width="48" height="110"/><circle cx="256" cy="354" r="50"/></g><g fill="${c.dash}">${dashes}</g><path d="M237 342l13 12 25-25" fill="none" stroke="${c.check}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>`
}
