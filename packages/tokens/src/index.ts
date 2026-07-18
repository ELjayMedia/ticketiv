/**
 * Quiet UI design tokens for React Native.
 *
 * These values mirror the `@theme` block in `app/globals.css` — that file
 * remains the source of truth for the web. If a value changes there, change
 * it here in the same PR (a lint-time sync check can come later).
 */

export const colors = {
  /* surfaces */
  bg: "#fafafa",
  surface: "#ffffff",
  surface2: "#f3f1ee",

  /* ink (foreground) ramp */
  ink: "#0a0a0c",
  ink2: "#2a2a2e",
  ink3: "#6e6c70",
  ink4: "#a8a6aa",

  /* lines */
  line: "#ececea",
  line2: "#d8d6d3",

  /* accent (violet) */
  accent: "#6b3fbd",
  accentSoft: "#efe7fb",
  accentInk: "#ffffff",

  /* semantics */
  danger: "#ef4444",
  dangerSoft: "#fee2e2",
  success: "#16a34a",
  warning: "#f59e0b",
} as const;

export const radii = {
  xs: 4,
  sm: 6,
  base: 8,
  md: 10,
  lg: 12,
  xl: 16,
} as const;

/** Type primitives matching the web's .text-h1/.text-h2/.text-h3/.text-label */
export const typography = {
  h1: { fontSize: 28, fontWeight: "600", letterSpacing: -0.6 },
  h2: { fontSize: 20, fontWeight: "600", letterSpacing: -0.4 },
  h3: { fontSize: 16, fontWeight: "600", letterSpacing: -0.16 },
  label: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.22,
    textTransform: "uppercase",
  },
} as const;

export const fonts = {
  sans: "Inter Tight",
  display: "Anton",
  mono: "JetBrains Mono",
} as const;

export type QuietColor = keyof typeof colors;
