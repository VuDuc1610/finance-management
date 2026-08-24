# Design Doc: Personal Finance Dashboard — "Zen Linen"

## 1. Thesis

The page is a piece of undyed linen that your money gets dyed into. The canvas —
background, cards, structure — stays quiet, textured, and neutral, like woven
fabric. Every number and chart is rendered in a small family of natural-dye
colors (indigo, madder, moss, saffron, plum), so the **data is the only color
in the room**. Calm surface, vivid content. That tension is the whole design:
zen restraint in the frame, real vibrancy in the substance.

This directly answers the brief: a soothing, non-anxious home for looking at
your money, where the charts (donut breakdown, Sankey flow) are allowed to be
rich and multi-hued because they're the entire point of the page.

---

## 2. Design tokens

### Color

| Token | Hex | Use |
|---|---|---|
| `linen-100` | `#EDE7DC` | Page background — warm, slightly gray oatmeal, not bright cream |
| `linen-300` | `#D8CFBE` | Card backgrounds, dividers, woven shadow |
| `linen-700` | `#8C8375` | Muted secondary text, axis labels |
| `ink-900` | `#2B2A28` | Primary text — warm charcoal, never pure black |
| `dye-indigo` | `#2F4858` | Chart color 1 · Chase-related accents |
| `dye-madder` | `#A8493A` | Chart color 2 · alerts, spending-over-budget |
| `dye-moss` | `#6B8A5A` | Chart color 3 · savings / positive balances |
| `dye-saffron` | `#D6A23C` | Chart color 4 · Discover-related accents |
| `dye-plum` | `#6C5B7B` | Chart color 5 · Robinhood / investments |

Explicitly avoid the generic AI-startup combo (bright `#F4F1EA` cream +
`#D97757` terracotta) — `linen-100` is deliberately grayer and dustier, and
`dye-madder` is a darker, brick-brown red rather than a warm orange-clay, so
the palette doesn't collapse into that default.

Five dye colors is enough diversity for a category donut or Sankey without
tipping into rainbow-chart chaos. Never introduce a 6th chart hue — reuse
tints/shades of these five (see Motion section for how a single hue can carry
multiple sub-categories via opacity steps).

### Type

- **Display (headlines, big numbers):** `Fraunces` (variable, optical size
  72–144), soft-serif with organic, slightly hand-cut terminals — reads as
  crafted, not corporate. Use at weight 400–500, never bold; let size carry
  emphasis instead of weight.
- **Body (labels, copy, nav):** `Karla` — a quiet humanist sans, warm without
  being trendy. Weight 400/500 only.
- **Data / numerals / captions:** `IBM Plex Mono` at small sizes for account
  numbers, timestamps, and axis ticks — gives figures a slightly technical,
  "ledger" texture that contrasts nicely with the soft serif headlines.

Type scale (rem): `2.75 / 2 / 1.5 / 1.125 / 1 / 0.8125`. Big hero numbers (like
"Spent this month: $1,244.65") sit at the top of the scale in Fraunces;
everything else stays modest.

### Spacing & shape

- Base unit `8px`. Section rhythm: `24 / 40 / 64 / 96`.
- Corner radius: `12px` on cards, `999px` (full pill) on badges/category tags
  only — no radius on the page shell itself, so the "fabric" reads as one flat
  plane, not a stack of app-y rounded panels.
- Card border: `1px solid linen-300`, no drop shadows — depth comes from the
  woven texture (below), not elevation shadows.

### Signature texture: the weave

A near-invisible background texture — a repeating diagonal cross-hatch SVG
pattern at ~4% opacity in `ink-900` over `linen-100` — runs behind the entire
page. It should be genuinely subtle (visible on close inspection, invisible
at a glance) so it reads as "linen," not "wallpaper." This is the one textural
flourish; nothing else on the page gets a pattern or gradient.

---

## 3. Signature interaction: "Dye bloom"

When a chart first renders (page load, or switching the month selector), its
colors don't fade or slide in — they **bloom**, like dye spreading into wet
fabric. Implementation: render the chart initially fully desaturated/blurred
(`filter: blur(6px) saturate(0)`), then animate to `blur(0) saturate(1)` over
~600ms with a soft ease-out. This is the one deliberate motion signature of
the whole app — used only for chart entrances, nowhere else (buttons, nav,
and hover states stay instant/simple so the bloom keeps its meaning).

Respect `prefers-reduced-motion`: fall back to a plain 200ms opacity fade.

---

## 4. Layout

```
┌─────────────────────────────────────────────────────────┐
│  zen linen ⌘                              [ August ▾ ]   │  <- wordmark + month picker, quiet
├─────────────────────────────────────────────────────────┤
│                                                           │
│   ┌───────────────────────┐    Spent this August         │  <- HERO, asymmetric
│   │                       │    $1,244.65                 │     donut chart left,
│   │   ◜ donut chart ◝     │                               │     big Fraunces numeral
│   │   (5 dye colors)      │    ↳ 4 line legend w/ %       │     + legend right
│   └───────────────────────┘                               │
│                                                           │
├─────────────────────────────────────────────────────────┤
│  Where it went — full-width Sankey                       │
│  Paychecks → Income → [Housing / Financial / Bills /...] │  <- flow diagram,
│  (dye palette bands, thin linen-300 rails between nodes) │     full bleed width
├─────────────────────────────────────────────────────────┤
│  [ Chase card ]   [ Discover card ]   [ Robinhood card ] │  <- 3-up account
│   balance, mini    balance, due date   balance, holdings │     cards, color-coded
│   sparkline        chip                sparkline         │     top edge per dye hue
├─────────────────────────────────────────────────────────┤
│  Recent activity                          [ See all → ] │
│  ● Whole Foods         Food & Dining        -$62.14      │  <- transaction rows,
│  ● Con Edison          Bills & Utilities    -$140.00     │     colored dot = category,
│  ● Robinhood dividend  Investments          +$4.32       │     mono numerals
└─────────────────────────────────────────────────────────┘
```

Grid: 12-column, hero breaks the grid intentionally (chart at 5 cols, numeral
block at 7, vertically centered against each other) — the one asymmetric
gesture on an otherwise calm, aligned page.

---

## 5. Component → data mapping

| Component | Backend source | Notes |
|---|---|---|
| **Donut — spending by category** | `/transactions/:label` grouped by `personal_finance_category` | Cap at 5 wedges; roll anything past the top 4 into "Other" (`dye` tints at 60% opacity of nearest hue) |
| **Sankey — income → category flow** | Paychecks/deposits from `/transactions` (income side) + category totals (spend side) | Only build this once transactions volume is enough to be meaningful (skip for near-empty months) |
| **Account cards** | `/accounts/:label` | One card per institution; top border = that institution's dye color (indigo=Chase, saffron=Discover, plum=Robinhood) |
| **Balance sparkline** | Daily balance snapshots (store a daily cron read from `/accounts`) | Tiny inline line chart, single dye hue, no axes |
| **Investment holdings** | `investmentsHoldingsGet` (see prior discussion — not yet in `server.js`) | Small-multiple bars: one per position, sized by current value |
| **Liabilities / due date chip** | `liabilitiesGet` (Discover) | Small pill badge on the Discover card: "Due Sep 12 · $340" |
| **Transaction list rows** | `/transactions/:label` | Category dot uses the dye palette; amount in `IBM Plex Mono` |

---

## 6. Voice & content

- Section labels are plain and literal: "Where it went," "Recent activity" —
  not "Insights" or "Analytics."
- Empty states are an invitation, not an apology: e.g., "No transactions yet
  this month — link an account above to see it here," not "Oops, nothing to
  show!"
- Numbers never get rounded language ("about $1,200") — always exact, in
  mono, since precision is the entire value of a finance dashboard.

---

## 7. Accessibility & responsive floor

- All dye colors checked against `linen-100`/`ink-900` for 4.5:1 text
  contrast; chart colors additionally get a pattern-fill fallback (subtle
  diagonal hatch per wedge) so category differences don't rely on hue alone.
- Keyboard focus: visible `2px dye-indigo` outline, offset 2px, on every
  interactive element.
- Mobile: hero stacks (chart above numeral), Sankey becomes a simple stacked
  bar (Sankeys don't survive narrow viewports), account cards go to 1-up.
- Reduced motion: dye-bloom becomes a flat fade (see Section 3).

---

## 8. Implementation notes (for build)

- Suggested stack: React + Tailwind (custom theme extending the tokens
  above) + **Recharts** for donut/line/bar, **d3-sankey** (or `react-sankey`)
  for the flow diagram — Recharts alone doesn't do Sankeys well.
- Define the palette and both fonts as CSS variables / Tailwind theme extension
  once, at the root, so every chart and component pulls from the same five
  dye tokens rather than hardcoding hex values per-component.
- Fraunces and Karla are both on Google Fonts (variable); IBM Plex Mono too —
  no paid font licensing needed.