/**
 * Renders the printable ticket strip to a PNG for sharing on WhatsApp /
 * email. Drawn on a canvas in the browser so it needs no extra
 * dependencies and works with any cover format the browser can decode.
 *
 * The layout mirrors `TicketPrintCard`: the cover fills the left with the
 * title, date, venue, holder and ticket type over a dark fade; a dashed
 * tear line with notches separates the white QR stub on the right.
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

// Same 190 × 70 proportion as the printed strip, at ~320 dpi.
export const TICKET_IMAGE_WIDTH = 2400;
export const TICKET_IMAGE_HEIGHT = 880;

const INK = "#0a0a0c";
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
  const STUB_W = 660;
  const CUT_X = W - STUB_W;
  const P = 88;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");

  // Page behind the rounded strip.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  roundRect(ctx, 0, 0, W, H, 44);
  ctx.clip();

  // ── Left: cover + dark fade ───────────────────────────────────
  if (cover) {
    drawCover(ctx, cover, 0, 0, CUT_X, H);
  } else {
    const g = ctx.createLinearGradient(0, 0, CUT_X, H);
    g.addColorStop(0, INK);
    g.addColorStop(1, ACCENT);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CUT_X, H);
  }
  const fade = ctx.createLinearGradient(0, 0, CUT_X, 0);
  fade.addColorStop(0, "rgba(10,10,12,0.92)");
  fade.addColorStop(0.5, "rgba(10,10,12,0.72)");
  fade.addColorStop(0.88, "rgba(10,10,12,0.15)");
  fade.addColorStop(1, "rgba(10,10,12,0.1)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, CUT_X, H);

  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "top";

  // Top label
  ctx.globalAlpha = 0.8;
  ctx.font = `500 28px ${MONO}`;
  setLetterSpacing(ctx, "4px");
  ctx.fillText("TICKETIV · ADMIT ONE", P, P);
  setLetterSpacing(ctx, "0px");
  ctx.globalAlpha = 1;

  // Bottom fields (holder, ticket)
  const fieldsTop = H - P - 76;
  let fx = P;
  const field = (label: string, value: string, maxW: number) => {
    ctx.globalAlpha = 0.65;
    ctx.font = `500 22px ${MONO}`;
    setLetterSpacing(ctx, "3px");
    ctx.fillText(label.toUpperCase(), fx, fieldsTop);
    setLetterSpacing(ctx, "0px");
    ctx.globalAlpha = 1;
    ctx.font = `700 40px ${SANS}`;
    const text = fit(ctx, value, maxW);
    ctx.fillText(text, fx, fieldsTop + 34);
    fx += Math.max(ctx.measureText(text).width, ctx.measureText(label).width) + 96;
  };
  if (d.holderName) field("Holder", d.holderName, 640);
  field("Ticket", d.typeLabel, 520);

  // Middle block: title, when, where — centred between label and fields.
  const textW = 1120;
  ctx.font = `900 132px ${SANS}`;
  const titleLines = wrap(ctx, d.eventTitle.toUpperCase(), textW, 2);
  const when = [d.dateLabel.toUpperCase(), d.timeLabel].filter(Boolean).join(" · ");
  const where = [d.venueName, d.venueAddress].filter(Boolean).join(" · ").toUpperCase();
  const blockH = titleLines.length * 126 + 30 + 42 + (where ? 14 + 34 : 0);
  const areaTop = P + 60;
  const areaBottom = fieldsTop - 40;
  let y = Math.max(areaTop, areaTop + (areaBottom - areaTop - blockH) / 2);
  for (const line of titleLines) {
    ctx.fillText(line, P - 4, y);
    y += 126;
  }
  y += 30;
  ctx.font = `700 40px ${MONO}`;
  ctx.fillText(fit(ctx, when, textW), P, y);
  y += 42 + 14;
  if (where) {
    ctx.globalAlpha = 0.85;
    ctx.font = `500 32px ${MONO}`;
    ctx.fillText(fit(ctx, where, textW), P, y);
    ctx.globalAlpha = 1;
  }

  // ── Right: white QR stub ──────────────────────────────────────
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(CUT_X, 0, STUB_W, H);
  const cx = CUT_X + STUB_W / 2;
  const qrSize = 480;
  const stubTop = (H - (26 + 34 + qrSize + 34 + 30)) / 2;
  ctx.textAlign = "center";
  ctx.font = `500 26px ${SANS}`;
  ctx.fillStyle = INK_3;
  setLetterSpacing(ctx, "2px");
  ctx.fillText("SCAN AT GATE", cx, stubTop);
  setLetterSpacing(ctx, "0px");
  const qrY = stubTop + 26 + 34;
  ctx.save();
  roundRect(ctx, cx - qrSize / 2, qrY, qrSize, qrSize, 24);
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
  ctx.drawImage(qr, cx - qrSize / 2 + 22, qrY + 22, qrSize - 44, qrSize - 44);
  ctx.font = `500 30px ${MONO}`;
  ctx.fillStyle = INK_3;
  ctx.fillText(`#${d.orderNumber} · ${d.shortCode}`, cx, qrY + qrSize + 34);
  ctx.textAlign = "left";

  // ── Tear line + notches ───────────────────────────────────────
  ctx.save();
  ctx.strokeStyle = LINE_2;
  ctx.lineWidth = 5;
  ctx.setLineDash([18, 14]);
  ctx.beginPath();
  ctx.moveTo(CUT_X, 0);
  ctx.lineTo(CUT_X, H);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = "#ffffff";
  for (const ny of [0, H]) {
    ctx.beginPath();
    ctx.arc(CUT_X, ny, 34, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  // Hairline edge so the strip reads as a ticket on white backgrounds.
  ctx.save();
  roundRect(ctx, 1.5, 1.5, W - 3, H - 3, 43);
  ctx.strokeStyle = LINE_2;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

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
