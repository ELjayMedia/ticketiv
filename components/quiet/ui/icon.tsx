import { cn } from "@/lib/cn";

/* Stroked 24×24 icon paths — designed to be paired one-to-one with the
 * mockup library, so visual fidelity to the hi-fi designs is exact. */
const PATHS: Record<string, string> = {
  search: "M15.5 15.5 21 21 M10 17a7 7 0 100-14 7 7 0 000 14z",
  heart:
    "M12 21s-7-4.5-9.5-9C.5 8.5 2 4 6 4c2 0 3 .8 4 2 1-1.2 2-2 4-2 4 0 5.5 4.5 3.5 8-2.5 4.5-9.5 9-9.5 9z",
  bell: "M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9z M10 21h4",
  user: "M4 21v-1a6 6 0 0112 0v1 M8 11a4 4 0 100-8 4 4 0 000 8z",
  pin: "M12 22s8-7.5 8-13a8 8 0 10-16 0c0 5.5 8 13 8 13z M12 11.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  cal: "M3 7h18 M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z M9 2v4 M15 2v4",
  ticket:
    "M3 8a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 000 4v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 000-4V8z M12 6v12",
  share: "M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7 M16 6l-4-4-4 4 M12 2v14",
  filter: "M4 5h16 M7 12h10 M10 19h4",
  chevR: "M9 6l6 6-6 6",
  chevL: "M15 6l-9 6 9 6",
  chevD: "M6 9l6 6 6-6",
  chevU: "M6 15l6-6 6 6",
  plus: "M12 5v14 M5 12h14",
  minus: "M5 12h14",
  arrowR: "M5 12h14 M13 5l7 7-7 7",
  arrowUR: "M7 17L17 7 M8 7h9v9",
  close: "M18 6L6 18 M6 6l12 12",
  check: "M5 12l5 5L20 7",
  map: "M1 6v15l7-3 8 3 7-3V3l-7 3-8-3-7 3z M8 3v15 M16 6v15",
  music: "M9 18V6l10-2v12 M9 18a2 2 0 100-4 2 2 0 000 4z M19 16a2 2 0 100-4 2 2 0 000 4z",
  spark:
    "M12 3v3 M12 18v3 M3 12h3 M18 12h3 M5.5 5.5l2 2 M16.5 16.5l2 2 M5.5 18.5l2-2 M16.5 7.5l2-2",
  copy: "M9 9h11v11H9z M5 5h11v3 M5 5v11h3",
  fire: "M12 2c2 4-4 4-4 9a4 4 0 008 0c0-3-2-4-2-7 0-1 .5-2 1-3-3 0-3-0-3 1z",
  zap: "M13 2L3 14h7l-1 8 10-12h-7l1-8z",
  globe:
    "M12 21a9 9 0 100-18 9 9 0 000 18z M3 12h18 M12 3a13 13 0 010 18 M12 3a13 13 0 000 18",
  wallet:
    "M3 7v12a2 2 0 002 2h14a2 2 0 002-2V7 M3 7l3-4h12l3 4 M17 13a1 1 0 100 2 1 1 0 000-2z",
  qr: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h3v3h-3z M20 14v3 M14 20h3 M20 20v1",
  nfc: "M7 8a7 7 0 010 8 M10 6a10 10 0 010 12 M13 4a13 13 0 010 16 M4 11v2",
  clock: "M12 21a9 9 0 100-18 9 9 0 000 18z M12 7v5l3 2",
  fileText:
    "M14 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V8l-7-5z M8 13h8 M8 17h5",
  download: "M12 3v12 M5 11l7 7 7-7 M3 21h18",
  trash:
    "M3 6h18 M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2 M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6",
  settings:
    "M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.6 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.6-1.1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3H10a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9V10a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z",
  trending: "M3 17l6-6 4 4 8-8 M21 7h-6 M21 7v6",
  users:
    "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8z M22 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75",
};

export type IconName = keyof typeof PATHS;

interface IconProps extends React.SVGAttributes<SVGSVGElement> {
  name: IconName | string;
  size?: number;
  strokeWidth?: number;
}

export function Icon({
  name,
  size = 20,
  strokeWidth = 1.7,
  className,
  ...rest
}: IconProps) {
  const d = PATHS[name];
  if (!d) return null;
  // split path data on " M" so each subpath becomes its own <path>;
  // makes stroke joins predictable across browsers
  const segments = d.split(" M").map((p, i) => (i === 0 ? p : "M" + p));

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn("inline-block shrink-0", className)}
      {...rest}
    >
      {segments.map((s, i) => (
        <path key={i} d={s} />
      ))}
    </svg>
  );
}
