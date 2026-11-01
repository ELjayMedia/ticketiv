/**
 * Renders the shareable ticket image (portrait card) for WhatsApp / email.
 * Drawn on a canvas in the browser so it needs no extra dependencies and
 * works with any cover format the browser can decode.
 *
 * Layout: cover image, title, date/venue, a tear line, then the QR beside
 * holder / ticket / order details. This is deliberately not the printed
 * strip (`TicketPrintCard`): a tall card reads better in a chat thread.
 *
 * The QR is passed in as the SVG markup already rendered on the page, so
 * the image always encodes exactly what the gate scanner expects.
 */

export interface TicketImageData {
  eventTitle: string;
  dateLabel: string;
  timeLabel: string;
  venueName: string;
  venueAddress: string;
  holderName: string;
  typeLabel: string;
  orderNumber: string;
  shortCode: string;
  coverUrl: string | null;
  qrSvg: string;
}

// Portrait 1240 × 1748 (A5 proportion) — stays sharp when opened on a phone.
export const TICKET_IMAGE_WIDTH = 1240;
export const TICKET_IMAGE_HEIGHT = 1748;

const INK = "#0a0a0c";
const INK_2 = "#2a2a2e";
const INK_3 = "#6e6c70";
const LINE = "#ececea";
const LINE_2 = "#d8d6d3";
const ACCENT = "#6b3fbd";
const SANS = '"Inter Tight Variable", "Inter Tight", "Inter", system-ui, sans-serif';
const MONO = '"JetBrains Mono Variable", "JetBrains Mono", ui-monospace, Menlo, monospace';

export async function renderTicketImage(data: TicketImageData): Promise<Blob> {
  await loadFonts();
  const [cover, qr] = await Promise.all([
    data.coverUrl ? loadImage(data.coverUrl, true).catch(() => null) : Promise.resolve(null),
    loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(data.qrSvg)}`, false),
  ]);

  try {
    return await toPng(draw(data, cover, qr));
  } catch {
    // A cover served without CORS headers taints the canvas; retry without it
    // so the attendee still gets a scannable ticket.
    return toPng(draw(data, null, qr));
  }
}

function draw(
  d: TicketImageData,
  cover: HTMLImageElement | null,
  qr: HTMLImageElement,
): HTMLCanvasElement {
  const W = TICKET_IMAGE_WIDTH;
  const H = TICKET_IMAGE_HEIGHT;
  const P = 84;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Cover (16:9, rounded)
  const coverW = W - P * 2;
  const coverH = Math.round((coverW * 9) / 16);
  ctx.save();
  roundRect(ctx, P, P, coverW, coverH, 36);
  ctx.clip();
  if (cover) {
    drawCover(ctx, cover, P, P, coverW, coverH);
  } else {
    const g = ctx.createLinearGradient(P, P, P + coverW, P + coverH);
    g.addColorStop(0, INK);
    g.addColorStop(1, ACCENT);
    ctx.fillStyle = g;
    ctx.fillRect(P, P, coverW, coverH);
  }
  ctx.restore();

  // Title (max two lines)
  let y = P + coverH + 64;
  ctx.fillStyle = INK;
  ctx.textBaseline = "top";
  ctx.font = `800 76px ${SANS}`;
  for (const line of wrap(ctx, d.eventTitle, coverW, 2)) {
    ctx.fillText(line, P, y);
    y += 86;
  }

  // Date · time, then venue
  y += 8;
  ctx.font = `600 30px ${MONO}`;
  ctx.fillStyle = INK_2;
  const when = [d.dateLabel.toUpperCase(), d.timeLabel].filter(Boolean).join(" · ");
  ctx.fillText(fit(ctx, when, coverW), P, y);
  y += 46;
  const where = [d.venueName, d.venueAddress].filter(Boolean).join(", ");
  ctx.fillStyle = INK_3;
  ctx.fillText(fit(ctx, where.toUpperCase(), coverW), P, y);
  y += 72;

  // Tear line
  ctx.save();
  ctx.strokeStyle = LINE_2;
  ctx.lineWidth = 4;
  ctx.setLineDash([16, 12]);
  ctx.beginPath();
  ctx.moveTo(P, y);
  ctx.lineTo(W - P, y);
  ctx.stroke();
  ctx.restore();
  y += 56;

  // QR block
  const qrSize = 500;
  ctx.save();
  roundRect(ctx, P, y, qrSize, qrSize, 28);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
  ctx.drawImage(qr, P + 26, y + 26, qrSize - 52, qrSize - 52);

  // Details column
  const colX = P + qrSize + 56;
  const colW = W - P - colX;
  let cy = y + 12;
  const field = (label: string, value: string) => {
    ctx.font = `500 24px ${SANS}`;
    ctx.fillStyle = INK_3;
    setLetterSpacing(ctx, "2px");
    ctx.fillText(label.toUpperCase(), colX, cy);
    setLetterSpacing(ctx, "0px");
    cy += 36;
    ctx.font = `600 38px ${SANS}`;
    ctx.fillStyle = INK;
    for (const line of wrap(ctx, value, colW, 2)) {
      ctx.fillText(line, colX, cy);
      cy += 46;
    }
    cy += 30;
  };
  if (d.holderName) field("Holder", d.holderName);
  field("Ticket", d.typeLabel);
  ctx.font = `500 26px ${MONO}`;
  ctx.fillStyle = INK_3;
  ctx.fillText(fit(ctx, `#${d.orderNumber} · ${d.shortCode}`, colW), colX, cy);

  // Footer
  ctx.textBaseline = "alphabetic";
  ctx.font = `500 24px ${SANS}`;
  ctx.fillStyle = INK_3;
  ctx.fillText("Show this QR at the gate · one entry per ticket", P, H - P);
  ctx.font = `600 24px ${MONO}`;
  ctx.fillStyle = ACCENT;
  ctx.textAlign = "right";
  ctx.fillText("ticketiv.app", W - P, H - P);
  ctx.textAlign = "left";

  return canvas;
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.naturalWidth - sw) / 2;
  const sy = (img.naturalHeight - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Greedy word wrap; the last allowed line is ellipsised if text remains. */
export function wrapText(
  measure: (text: string) => number,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (let i = 0; i < words.length; i++) {
    const next = current ? `${current} ${words[i]}` : words[i];
    if (measure(next) <= maxWidth || !current) {
      current = next;
      continue;
    }
    lines.push(current);
    current = words[i];
    if (lines.length === maxLines - 1) {
      current = words.slice(i).join(" ");
      break;
    }
  }
  if (current) lines.push(current);
  const last = lines.length - 1;
  if (last >= 0) lines[last] = fitText(measure, lines[last], maxWidth);
  return lines.slice(0, maxLines);
}

export function fitText(measure: (text: string) => number, text: string, maxWidth: number): string {
  if (measure(text) <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && measure(`${out}…`) > maxWidth) out = out.slice(0, -1);
  return `${out.trimEnd()}…`;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  return wrapText((t) => ctx.measureText(t).width, text, maxWidth, maxLines);
}

function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  return fitText((t) => ctx.measureText(t).width, text, maxWidth);
}

function setLetterSpacing(ctx: CanvasRenderingContext2D, value: string) {
  // Supported in current Chrome / Safari; harmless no-op elsewhere.
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = value;
}

async function loadFonts() {
  if (typeof document === "undefined" || !document.fonts) return;
  await Promise.all([
    document.fonts.load(`800 76px ${SANS}`),
    document.fonts.load(`600 38px ${SANS}`),
    document.fonts.load(`600 30px ${MONO}`),
  ]).catch(() => undefined);
}

function loadImage(src: string, crossOrigin: boolean): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src.slice(0, 60)}`));
    img.src = src;
  });
}

function toPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("PNG encoding failed"))), "image/png");
    } catch (error) {
      reject(error);
    }
  });
}
