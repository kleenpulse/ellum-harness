# Ellum design system

Ellum copies the layout grammar of two sibling apps and changes only the colors:

- **Raven** (`D:\Vxrcel\email-manager`): the icon rail, the header on the canvas, the rounded sheet, bento cards, motion.
- **Shadow Garden admin** (`D:\Vxrcel\admin_shadow-garden`): Raven's anatomy in a graphite ramp with a single amethyst accent.

Ellum uses the same anatomy with a single **blue** signal. Light is white paper; dark is navy-black lit by blue glows. As Raven's teal and Shadow Garden's violet do, the hue lives in the *base* (canvas, glows, cards, hairlines, secondary ink), not only in the accents. A neutral graphite base with blue buttons does not read as blue. The theme follows the OS (`defaultTheme="system"`).

If you are unsure how a layout or control should look, open the Raven or Shadow Garden equivalent and copy its classes onto Ellum's tokens.

All tokens live in `app/globals.css`. Tailwind v4 is configured in CSS only; there is no `tailwind.config`.

## Rules

1. **Use semantic tokens only.** Never write raw hex, and never use `zinc-*`, `slate-*`, `gray-*`, `white` or `black` utilities in components. If a color is missing, add a token to both skins.
2. **Signal is scarce.** Blue (`signal`, `primary`) marks what is *active, unread, primary or live*: the active rail item, the primary button, a live dot, a headline mark. Everything else is ink on surfaces.
3. **Two shadows, and only two.** `shadow-glow` is a halo (the active pill in dark, primary hover). `shadow-lift` is for things that float (the tab bar, menus, dialogs, hovered tiles). Resting cards get only the bento's own drop, and only in dark.
4. **Controls are pills and circles.** Buttons are `pill`, `pill-sm`, `circle` or `circle-sm`. Do not use square buttons in product UI.
5. **Use container queries, not viewport breakpoints, inside the sheet.** The rail takes 84px that the viewport doesn't account for. Use `@3xl:` / `@board:` (66rem).
6. **Keep the stock shadcn token names.** `components/ui/*` and anything added with `shadcn add` (style `base-nova`, Base UI) theme themselves. Ellum's own vocabulary sits *next to* the stock tokens; it does not replace them.

## Tokens

| Utility | Role | Paper (light) | Night (dark) |
|---|---|---|---|
| `bg-background` / `bg-band` | canvas, behind everything | `#f3f5f8` | `#04070f` + navy glows (`#15306a`, `#0c1f47`) + vignette |
| `bg-sheet` | the rounded sheet that holds a page | `#ffffff` | `rgb(4 9 22 / .5)` (glows read through) |
| `bg-card` (`bento`) | a card | `#f7f8fa` | `rgb(18 34 70 / .5)` + sheen |
| `bg-card-nested` (`well`) | a panel nested in a card | `#ffffff` | blue-white @ 4.5% |
| `text-ink` / `text-foreground` | primary text | `#111418` | `#e6edf8` |
| `text-ink-2` | secondary text, subtitles | `#545b66` | `#a3b3cc` |
| `text-ink-3` | captions, quiet marks | `#878e99` | `#5f6f8a` |
| `bg-signal` / `text-signal` | marks, dots, figures | `#2563eb` | `#3b82f6` |
| `text-signal-ink` | signal as **text** (AA) | `#1d4ed8` | `#7cb4ff` |
| `bg-signal-soft` | tinted fill behind an active pill or chip | signal @ 10% | signal @ 16% |
| `bg-primary` | filled buttons (white label) | `#2563eb` | `#2563eb` |
| `bg-inverse` / `text-inverse-foreground` | the brand disc | `#111418` / `#fff` | `#e6edf8` / `#04070f` |
| `glass` | frosted overlays only | white @ 86% | `rgb(10 19 40 / .8)` |
| `border-border`, `ring-border` | hairlines | `#e3e7ec` | blue @ 10% |
| `ring-glass-border` | hairlines on translucent dark surfaces | ink @ 7% | blue @ 14% |
| `ok` / `warn` / `critical` | status | `#2f8f5b` / `#b76a00` / `#dc2626` | `#5fd3a6` / `#f2b35b` / `#f87171` |
| `chart-1…5` | data series | blue, amber, slate, sky, emerald | brighter variants |

Other notes:

- **Dark-mode hairlines:** use `ring-border dark:ring-glass-border`.
- **`bench-50…950`** is a raw neutral graphite ramp. Night no longer uses it; keep it out of components.
- **shadcn's `accent`** is the neutral hover tint in Paper and a faint blue in Night. It is **not** the brand color; the brand color is `signal`.

## Type

| Role | Font | Spec |
|---|---|---|
| Page title | `font-display` (Instrument Sans) | 22px, `tracking-[-0.01em]` |
| Card title (`BentoTitle`) | `font-display` | 17px |
| Empty-state title | `font-display` | `text-xl` |
| Headline figure | `font-display tabular` | `text-kpi` 40px (card) / `text-kpi-sm` 26px (well) / 20px (stat tile) |
| Body | Geist (`font-sans`) | 13–14px; rows 13.5px |
| Subtitle, notes | Geist | 13px / 12px, `text-ink-2` |
| Labels | `readout` utility | mono 11px, uppercase, 0.06em, muted |
| Chips, captions, IDs, dates | Geist Mono | 10.5–11px |

Never write `font-display uppercase` for a label; use `readout`. Every number uses `tabular`.

## Radii, from the outside in

`rounded-frame` 40px (sheet top corners) → `rounded-card` 28px (bento) → `rounded-well` 22px (well) → 20px / 18px nested panels → `rounded-pill` (controls, chips). The stock scale (`rounded-lg` and so on) comes from `--radius: 0.875rem` and is used by the shadcn components.

## Shell (`components/shell/`)

```
┌──────┬──────────────────────────────────────────────┐
│ rail │  Title                          [actions]    │  ← header on the canvas
│ 84px │  subtitle                                    │
│      │  [stat][stat][stat][stat]                    │  ← optional intro band
│  e   │ ╭────────────────────────────────────────────╮│
│ (●)  │ │ sheet (rounded-t-frame bg-sheet)           ││
│  ○   │ │  ╭ bento ──────────╮ ╭ bento ──╮           ││
│      │ │  │  ╭ well ╮       │ │         │           ││
│  ☾   │ │  ╰──────────────── ╯ ╰─────────╯           ││
│ user │ ╰────────────────────────────────────────────╯│
└──────┴──────────────────────────────────────────────┘
```

- **`app/(app)/layout.tsx`** wraps every signed-in route. It contains `NavRail` (md and up), `<main>` and `MobileTabBar` (below md). It also holds the `auth.protect()` gate inside `<Suspense>`, which `cacheComponents` requires for request-time reads.
- **`nav-rail.tsx`** is an 84px icon rail on `bg-band`:
  - **Top:** the `EllumMark` disc and the create menu (`+`: new bot, group chat). Expanded, the `+` sits right of the logo; collapsed, below it. "Create new bot" opens `BotDialogPanel` (the controlled half of `BotDialog`) grown from the `+`.
  - **Nav capsule:** `rounded-full bg-sheet p-1.5 ring-1`, holding 44px circles with 18px icons at stroke 1.75.
  - **Active item:** a `motion.span layoutId` pill that springs between items (`SPRING_DETENT`). It is `bg-primary` in light and `bg-signal-soft shadow-glow` in dark.
  - **Tooltips:** shown on the right with a 12px offset.
  - **Bottom:** the collapse toggle (`[`), the theme toggle and Clerk's `UserButton`.
  - **Expands** to 248px (cookie `ellum-rail`, `lib/shell/rail.ts`): labels fade in beside icons that never move; tooltips only while collapsed.
- **`theme-toggle.tsx`** reveals the new theme as a circle growing from the button (`lib/theme-transition.ts`, View Transitions with a mask fallback; instant under reduced motion).
- **`nav.ts`** is the single list of destinations, shared by the rail and the tab bar. Add routes there.
- **`mobile-tab-bar.tsx`** is a glass pill fixed at the bottom (`inset-x-3 bottom-3 h-16 shadow-lift`).
- **`styles.ts`** exports `circle`, the shared 44px control. It is a plain module so server components can import it.
- **`page-frame.tsx`** contains `PageFrame` (props `title`, `subtitle`, `actions`, `intro`, `children`), `SheetHeading` and `PAGE_COLUMN` (`max-w-[calc(1900px-84px)] px-5 md:px-8`). The sheet body is an `@container`. For columns, use `grid grid-cols-12 gap-4` and span with `@3xl:` / `@board:`.

A new page is a server component that renders `<PageFrame>` with bento cards inside it.

## Primitives (`components/ui/`)

- **`bento.tsx`**:
  - `Bento` (`i` staggers its entrance) and `BentoTitle`.
  - `Well`.
  - `Caption`: mono 11px.
  - `Chip`: an h-7 mono ring pill.
  - `DeltaChip`: favorable moves show in signal, unfavorable in critical, and anything under 1% is neutral.
  - `StatTile` and `StatStrip`: for the intro band.
- **`status-pill.tsx`**: `StatusPill` with tones `ok`, `warn`, `attention`, `running` (spinner), `paused` and `idle`. Use it for state; leave `Badge` for counts and labels.
- **`components/avatar-stage.tsx`**: `AvatarStage`, a DiceBear *gaze* avatar (inline SVG from `gazeSvg(seed)` in `components/chat-avatar.tsx`) set inside parallax rings. On fine pointers the rings and face lean toward the cursor at increasing depth, and the eyes (`.dbga-look`) track it through the `--gx`/`--gy` custom properties (CSS under `.gaze-eyes` in `globals.css`). It holds still under reduced motion. Pass it as `PaneState`'s `media`.
- **Avatar seed** (`lib/avatar.ts`, server-only): `getAvatarSeed()` returns the user's preferred seed from Clerk `unsafeMetadata.avatarSeed` (picked in **Settings → Avatar**), otherwise a fresh random seed per request. `components/bots/bots-empty.tsx` is the shared "No bots yet" state that uses it.
- **`pane-state.tsx`**: `PaneState`, the empty or fault state (two hairline rings, a recessed core, one dot, a title, a body line and an optional action). Pass `media` to replace the rings.
- **`button.tsx`**: the stock shadcn variants plus `inverse`, `surface` (paper or well button with a ring) and `glass`, and the sizes `pill` (h-10), `pill-sm` (h-8), `circle` (44px) and `circle-sm` (36px). The `primary` + `pill` combination is the page CTA.
- The other 60+ shadcn components (Base UI) are stock and pick up the tokens automatically.

## Utilities (from `globals.css`)

- `bento`: a card surface.
- `well`: a nested panel surface.
- `dialog-surface`: an opaque dialog panel lit like the canvas (signal bloom top right, navy pool bottom left in Night; a faint signal tint in Paper). Pair with `shadow-lift`. Dialog footers have no hairline or tinted band.
- `glass`: frosted overlays only.
- `readout`: the mono label style.
- `tabular`: tabular figures.
- `font-display`: Instrument Sans.
- `lift`: hover rises 2px with `shadow-lift`, press scales to 0.985; fine pointers only.
- `entrance`: rise-in, staggered via the `--i` custom property.
- `scrollbar-none`: hides the scrollbar.

## Motion

- **Curves** (CSS tokens, usable as `ease-*` utilities):
  - `instrument` (reveal/settle)
  - `detent` (drawers, sheets, the rail)
  - `swell` (hover)
  - `cut` (exits)
- **Springs** (`lib/motion.ts`):
  - `SPRING_DETENT` (345/30): every sliding indicator
  - `SPRING_POP`: small things popping in
  - `EASE_INSTRUMENT`: the same curve for `motion/react`
- **Library:** `motion` (`motion/react`).
- **Rules:**
  - Animate only transform and opacity.
  - Pass stagger delays as custom properties (`--i`), never as an inline `animationDelay`.
  - Pair every hover translate with reduced-motion handling. A global `prefers-reduced-motion` clamp is the backstop.
  - Entrances use `backwards` fill, not `both`, because a filled opacity animation breaks `backdrop-filter` in Chrome.

## Theme

- next-themes is configured with `attribute="class"`, `defaultTheme="system"` and `enableSystem`, and the dark variant is `.dark`.
- The theme is unknown on the server. Swap theme-dependent icons and labels with CSS (`dark:hidden` / `hidden dark:block`), as `theme-toggle.tsx` does. Do not branch on `resolvedTheme` in render.
- The Clerk components use `@clerk/ui/themes/shadcn`, so they inherit `--primary` and the surfaces automatically.

## Seeing protected pages (agents)

> **Gotcha:** edits to `app/globals.css` may not hot-reload in `next dev` on this setup (Turbopack + `@tailwindcss/turbopack` on Windows); the server keeps serving the old stylesheet. Before judging a token change, check that the served CSS contains it, or restart the dev server.

Run `bun run shot [routes…] [--base http://localhost:3000] [--out .shots]` — routes without the leading slash, `.` = home (Git Bash rewrites `/x` args into Windows paths) (`scripts/dev-shot.ts`). It:

- signs a real dev user (`DEV_AGENT_EMAIL`, default `agent+clerk_test@example.com`, created on first run) in through `@clerk/testing` sign-in tokens;
- screenshots each route in light and dark, at desktop (1440) and mobile (390) widths, into the git-ignored `.shots/`.

Add `--pointer x,y` to park the cursor before each desktop shot (hover and pointer-follow states). It refuses to run unless the Clerk key is `sk_test_` and the base URL is localhost. Auth itself is never bypassed. It uses the installed Chrome; set `SHOT_CHANNEL` to use another channel.

## Don't

- Don't use raw hex, zinc or slate, or `bg-white` in components.
- Don't add a third shadow, or drop shadows on resting cards in light.
- Don't use signal blue for decoration, section headings or icons that aren't active.
- Don't use viewport breakpoints inside the sheet.
- Don't use square buttons in product UI.
- Don't nest a bento in a bento. Nest a well, and inside it 20px or 18px panels.
- Don't branch on `resolvedTheme` during render.

## Not built yet (follow the sibling apps when adding these)

- **Expanding rail** (84 → 232px with labels, cookie-persisted): see Shadow Garden `components/shell/shell-frame.tsx` and `nav-rail.tsx`.
- **Circular view-transition theme reveal:** see Raven `components/shell/theme-toggle.tsx` (`revealTheme`).
- **Once-per-session intro gate** (`data-intro="off"`): see `hooks/use-intro-gate.ts` in either app.
- **Command palette and floating search pill:** see Shadow Garden `components/shell/floating-pill.tsx`.
- **Charts:** vendored shadcn `chart.tsx` styled the Raven way (no grid, mono ticks, signal stroke over a soft fill, glass tooltip).
