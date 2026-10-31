# Ticketiv Design System — Quiet UI

Ticketiv uses one bespoke design system, **Quiet UI**. There is no second kit:
the shadcn/ui components that used to live in `components/ui/` and their
tokens (`bg-background`, `bg-primary`, `text-muted-foreground`, …) were
removed because those tokens are not defined in the theme and rendered
unstyled.

- Tokens: the `@theme` block in [`app/globals.css`](app/globals.css)
  (mirrored for React Native in `packages/tokens` — keep them in sync).
- Components: [`components/quiet/ui/`](components/quiet/ui) — always import from here.
- Screens: `components/quiet/screens/`; shells: `components/quiet/shell/`.

## Tokens

| Purpose | Utilities |
|---|---|
| Page / surfaces | `bg-bg` (page), `bg-surface` (cards, inputs), `bg-surface-2` (subtle fills) |
| Text | `text-ink` (primary), `text-ink-2`, `text-ink-3` (secondary/meta), `text-ink-4` (placeholders) |
| Borders | `border-line` (dividers, cards), `border-line-2` (inputs, outlined buttons) |
| Accent (violet) | `bg-accent`, `text-accent`, `bg-accent-soft`, `ring-accent/30` |
| Status | `text-danger` / `bg-danger-soft`, `text-success`, `text-warning` |
| Radius | `rounded-[var(--radius)]` (8), `--radius-md` (10), `--radius-lg` (12), `--radius-xl` (16) |
| Shadow | `shadow-[var(--shadow-card)]`, `shadow-[var(--shadow-elev)]` |

Fonts: `font-sans` (Inter Tight), `font-mono` (JetBrains Mono), `font-display` (Anton).

### Typography helpers
```
text-h1   text-h2   text-h3   text-label
font-mono text-[11px] uppercase tracking-wider   ← meta labels
font-mono text-[22px] font-semibold tabular-nums ← big numbers
```

### Replacing legacy shadcn tokens
| Don't use | Use |
|---|---|
| `bg-background` | `bg-bg` (page) or `bg-surface` (component) |
| `text-foreground` | `text-ink` |
| `text-muted-foreground` | `text-ink-3` |
| `bg-muted` | `bg-surface-2` |
| `bg-card` / `text-card-foreground` | `bg-surface` / `text-ink` |
| `border` / `border-input` | `border-line` / `border-line-2` |
| `bg-primary` / `text-primary-foreground` | `bg-accent` / `text-white` (brand action) or `bg-ink` / `text-surface` (neutral primary) |
| `text-primary` | `text-accent` |
| `text-destructive` / `bg-destructive` | `text-danger` / `bg-danger` |

## Components (`@/components/quiet/ui/*`)

| Component | Notes |
|---|---|
| `Button` | variants `default` · `primary` · `accent` · `ghost` · `outline`; sizes `xs` · `sm` · `md`. Defaults to `type="button"` — pass `type="submit"` in forms. |
| `Card`, `CardBody`, `CardDivider` | `flat` prop removes the shadow. |
| `Chip` | variants `default` · `active` · `accent` · `muted` — use for badges and status pills. |
| `Icon` (+ `IconName`) | See the icon map in `icon.tsx`; there is no `circle`, `x` or `arrowL`. |
| `FormField`, `Input`, `Textarea`, `Label` | `FormField` = label + input + hint/error. The bare primitives share its styling. |
| `RadioCard`, `Stepper`, `QuantityStepper` | Checkout-style selection and progress. |
| `Select`, `SelectOption` | Radix Select with Quiet styling; supports `label`, `hint`, `error`. |
| `Modal`, `ModalContent`, `ModalFooter` | Radix Dialog; `footer` slot pins actions below the scroll area. |
| `ToastProvider`, `useToast` | `toast({ title, description, variant })`. Mounted in the root layout. |
| `Progress` | Thin accent progress bar. |
| `Skeleton`, `EmptyState`, `Avatar`, `Photo`, `Divider`, `Segmented`, `LiveDot` | Utility primitives. |

## Rules

1. Import UI only from `@/components/quiet/ui/` — never `@/components/ui/`.
2. Use the tokens above; never Tailwind's default palette (`gray-*`, `blue-*`) or shadcn tokens.
3. Money is formatted with the helpers in `@/lib/format` (`SZL X,XXX.XX`).
4. Prefer an existing Quiet component over a one-off; add new primitives to `components/quiet/ui/` and document them here.
