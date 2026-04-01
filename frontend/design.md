# CreatorJot — Frontend Design Document

## Overview

CreatorJot is a SaaS web app that converts YouTube videos into multi-platform social media content (Twitter threads, LinkedIn posts, blog drafts). The frontend is a Next.js 15 app with TypeScript, Tailwind CSS v4, and shadcn/ui.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Component Library | shadcn/ui (customized) |
| Auth / DB | Supabase |
| Animations | Framer Motion, custom CSS |
| Theme | next-themes (light/dark/system) |
| Font | SUSE (Google Fonts) |
| Icons | Lucide React, simple-icons |

---

## Project Structure

```
frontend/src/
├── app/
│   ├── layout.tsx                  # Root layout (font, theme, toaster)
│   ├── globals.css                 # Design tokens, Tailwind theme
│   ├── (public)/                   # Marketing site (header + footer)
│   │   ├── layout.tsx              # Public shell with scale borders
│   │   ├── (homepage)/page.tsx     # Landing page
│   │   ├── about/page.tsx
│   │   ├── auth/login|signup/      # Auth pages
│   │   ├── contact-us/page.tsx
│   │   ├── faq/page.tsx
│   │   ├── how-it-works/page.tsx
│   │   ├── pricing/page.tsx
│   │   └── refund-policy/page.tsx
│   ├── (private)/                  # Authenticated dashboard
│   │   └── dashboard/
│   │       ├── layout.tsx          # Sidebar + topbar shell
│   │       ├── page.tsx
│   │       ├── generate/
│   │       ├── payments/
│   │       └── profile/
│   └── _(waitlist)/page.tsx        # Waitlist capture page
├── components/
│   ├── layout/                     # Structural components
│   ├── sections/                   # Page-level section components
│   ├── ui/                         # Primitive UI components
│   ├── auth/                       # Auth-specific components
│   ├── fysk-provider.tsx           # Animation context provider
│   └── icon-wrapper.tsx            # SVG icon utility
├── hooks/
│   ├── useFyskAnimation.ts         # Custom animation hook
│   └── useWaitlist.ts              # Waitlist form logic
├── lib/
│   ├── utils.ts                    # cn() and helpers
│   ├── extract-error-msg.ts
│   ├── generate-promo-code.ts
│   └── server-function-response.ts
└── server/
    ├── supabase/
    │   ├── supabase-admin.ts       # Server-side admin client
    │   └── supabase-browser.ts     # Client-side browser client
    └── db/
        ├── auth/login.ts           # Auth server actions
        └── waitlist/               # Waitlist server actions
```

---

## Routing Architecture

### Route Groups

- `(public)` — Marketing pages. Wrapped in `Header` + `Footer` + decorative scale borders. No auth required.
- `(private)` — Dashboard. Wrapped in sidebar layout. Requires Supabase session.
- `_(waitlist)` — Standalone waitlist page. Underscore prefix excludes it from the public layout group.

### Pages

| Route | Description |
|---|---|
| `/` | Landing page — hero, product demo, solution, how-it-works, examples, pricing, FAQ |
| `/about` | About the product/team |
| `/how-it-works` | Detailed feature walkthrough |
| `/pricing` | Pricing plans (Free / Pro) |
| `/faq` | Accordion FAQ |
| `/contact-us` | Contact form |
| `/refund-policy` | Legal/policy page |
| `/auth/login` | Login form |
| `/auth/signup` | Signup form |
| `/auth/callback` | Supabase OAuth callback handler |
| `/dashboard` | Main dashboard |
| `/dashboard/generate` | Content generation flow |
| `/dashboard/payments` | Billing / subscription |
| `/dashboard/profile` | User profile settings |

---

## Design System

### Color Palette

Colors use the OKLCH color space via CSS custom properties. The palette is warm-neutral (slightly warm whites and near-blacks).

**Light mode:**
- Background: `oklch(1 0 0)` — pure white
- Foreground: `oklch(0.147 0.004 49.25)` — near-black with warm tint
- Primary: `oklch(0.216 0.006 56.043)` — dark warm brown/black
- Muted: `oklch(0.97 0.001 106.424)` — off-white
- Muted foreground: `oklch(0.553 0.013 58.071)` — medium warm gray
- Border: `oklch(0.923 0.003 48.717)` — light warm gray
- Destructive: `oklch(0.577 0.245 27.325)` — red

**Dark mode:**
- Background: `oklch(0.147 0.004 49.25)` — near-black
- Foreground: `oklch(0.985 0.001 106.423)` — near-white
- Card: `oklch(0.216 0.006 56.043)` — dark warm surface
- Primary: `oklch(0.923 0.003 48.717)` — light (inverted from light mode)
- Border: `oklch(1 0 0 / 10%)` — subtle white border

### Typography

- Font family: **SUSE** (Google Fonts), loaded via `next/font/google`
- CSS variable: `--font-suse`
- Applied globally via `font-family: var(--font-suse)` on `*`
- Utility class: `.font-suse` for explicit overrides
- Heading style: `font-bold tracking-tight font-suse`
- Body: `antialiased`, `text-foreground`

### Spacing & Radius

- Base radius: `0.625rem` (`--radius`)
- Scale: `sm` (-4px), `md` (-2px), `lg` (base), `xl` (+4px), `2xl` (+8px), `3xl` (+12px), `4xl` (+16px)
- Max content width: `max-w-7xl` (public layout), `max-w-4xl` (dashboard)
- Section padding: `py-24 md:py-32 px-6`

### Animations

Custom keyframes defined in `@theme inline`:

| Name | Description |
|---|---|
| `shimmer` | Horizontal sweep (used on CTA buttons) |
| `blink` | Opacity pulse (cursor blink) |
| `indeterminate` | Progress bar indeterminate sweep |
| `stripe-move` | Striped progress bar motion |

Framer Motion is used for scroll-triggered entrance animations on the homepage. The `Reveal` component wraps content with `opacity-0 translate-y-5` → `opacity-100 translate-y-0` on intersection.

### Background Texture

A `.bg-texture` utility applies a PNG texture overlay at 15% opacity with `mix-blend-mode: lighten` — used as a fixed full-screen layer behind the public layout.

---

## Component Library

### Layout Components (`components/layout/`)

| Component | Description |
|---|---|
| `Header` | Fixed top nav. Logo, nav links, theme toggle, login/signup CTAs. Mobile hamburger menu with dropdown. |
| `Footer` | Simple centered footer with nav links and copyright. |
| `Sidebar` | Dashboard sidebar using shadcn/ui `Sidebar` primitive. |
| `ProfileDropdown` | User avatar + dropdown menu in dashboard topbar. |
| `ThemeToggle` | Light/dark/system toggle button. |
| `ScaleCard` | Card with decorative "scale" border strips on all four sides. Supports title, headerAction, footer slots. |
| `ScaleBorder` | Inline border wrapper with scale decoration. Used for the hero URL input. |
| `Toaster` | Toast notification wrapper. |

### Section Components (`components/sections/`)

| Component | Description |
|---|---|
| `PricingSection` | Full pricing section with `PricingCards` (Free + Pro). |
| `FaqSection` | Accordion-based FAQ. |
| `HowItWorksCards` | Step-by-step cards for the how-it-works flow. |

### UI Primitives (`components/ui/`)

| Component | Description |
|---|---|
| `Button` | shadcn/ui button with `icon` and `iconPosition` props added. |
| `Input` | shadcn/ui input with `variant="ghost"` and `icon` slot. |
| `Reveal` | Scroll-triggered fade+slide-up animation wrapper. |
| `Progress` | Progress bar with `size`, `variant` (striped), `state` (success/loading), `label` props. |
| `LightRays` | WebGL/canvas light ray effect for the hero background. |
| `DottedGlowBackground` | Animated dotted grid with radial glow, used in pricing cards. |
| `Scale` | Repeating scale/fish-scale decorative pattern (SVG tiles). |
| `AsciiArt` | ASCII art display component. |
| `BackgroundLines` | Animated background line decoration. |
| `CrossBorderFrame` | Decorative cross-corner frame. |
| `HoverBorderGradient` | Gradient border on hover. |
| `Empty` | Empty state placeholder. |
| `Kbd` | Keyboard shortcut display. |
| `Tooltip` | shadcn/ui tooltip. |

---

## Public Layout Shell

The `(public)/layout.tsx` wraps all marketing pages with:

1. Fixed full-screen texture background (z-0)
2. `max-w-7xl` centered container with `bg-background` (z-10)
3. Vertical `Scales` decorative strips on left/right edges (xl+ screens only)
4. `Header` (fixed, z-50) and `Footer`

The header uses `backdrop-blur-lg` and is positioned `fixed top-0` with a decorative scale strip along its bottom edge.

---

## Dashboard Layout

The `(private)/dashboard/layout.tsx` uses a two-column layout:

- Left: `SidebarLayout` (collapsible, uses shadcn/ui `Sidebar`)
- Right: flex column with sticky topbar (`border-b`, `backdrop-blur-md`) and scrollable `<main>`
- Max content width: `max-w-4xl`
- Subtle radial gradient wash behind the content area

---

## Homepage Sections (in order)

1. **Hero** — Full-viewport, white/black bg, `LightRays` WebGL effect, headline, URL input with `ScaleBorder`, CTA buttons
2. **Product Preview** — 3-column `ScaleCard` grid: Input → Processing → Generated output
3. **Solution** — "1 video → 10+ posts" visual with content multiplier chips
4. **How It Works** — 3-step cards via `HowItWorksCards`
5. **Output Examples** — Typewriter-animated content previews (Twitter, LinkedIn, Blog)
6. **Pricing** — `PricingSection` with Free ($0) and Pro ($19/mo) plans
7. **FAQ** — `FaqSection` accordion

A floating mobile CTA appears when the hero scrolls out of view (tracked via `IntersectionObserver`).

---

## Authentication Flow

- Supabase Auth (email/password + OAuth)
- `supabase-browser.ts` — client-side Supabase instance
- `supabase-admin.ts` — server-side admin instance (for server actions)
- `server/db/auth/login.ts` — server action for login
- `/auth/callback` — handles Supabase OAuth redirect
- Protected routes under `(private)` rely on Supabase session checks

---

## State & Data

- No global state manager — React local state + server actions
- Theme state: `next-themes` (persisted to `class` attribute on `<html>`)
- Toast notifications: shadcn/ui Toaster
- Waitlist: `useWaitlist` hook + `server/db/waitlist/` server actions
- Animation state: `useFyskAnimation` hook + `FyskProvider` context

---

## Pricing

| Plan | Price | Limits |
|---|---|---|
| Free | $0/mo | 2 generations/month, Twitter only |
| Pro | $19/mo | 60 generations, multi-platform, tone controls, viral hooks |

---

## PWA / Meta

- Manifest: `/site.webmanifest`
- Theme color: `#000000`
- Icons: 96x96 PNG, SVG favicon, Apple touch icon (180x180)
- App title in manifest: `PixEarn` (legacy — may need updating to CreatorJot)
- OG description: "Turn your YouTube videos into Twitter posts, LinkedIn content, and blog drafts automatically."

---

## Key Design Patterns

- **Scale borders** — The signature visual motif. Repeating fish-scale SVG tiles used as decorative borders on cards, the header bottom edge, and the page layout edges.
- **Reveal on scroll** — All major sections use the `Reveal` component for staggered entrance animations.
- **Warm neutral palette** — OKLCH-based colors with a slight warm tint throughout, avoiding pure grays.
- **Minimal chrome** — Cards use `ring-1 ring-ring/5` instead of heavy shadows. Borders are subtle.
- **Dark mode first** — Both modes are fully specified; dark mode inverts the primary/background relationship.
- **Backdrop blur** — Used on the header, mobile menu, and dashboard topbar for depth.
