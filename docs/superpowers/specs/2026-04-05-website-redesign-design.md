# Nexus Website Full Redesign — Design Spec

## Decision Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scope | Full page overhaul | Every section refreshed to match top AI company standards |
| Logo slider | "Built with" tech stack logos | Honest — Anthropic, Twilio, Supabase, Vercel, Stripe, Next.js, Sentry |
| Hero density | Minimal (outlit-style) | Big headline + subline + single CTA. Stats move below. |
| Visual tone | Pure black + white (Sierra/Cognition) | No color accent. #000 bg, #fff text, pill CTAs. Premium. |

## Visual System

### Color Palette (replacing current)

```
Background:     #000000 (pure black, replacing #0a0a0f)
Surface:        #0a0a0a (cards, raised elements)
Border:         rgba(255,255,255,0.08)
Border hover:   rgba(255,255,255,0.15)
Text primary:   #ffffff
Text secondary: rgba(255,255,255,0.45)
Text muted:     rgba(255,255,255,0.25)
CTA bg:         #ffffff
CTA text:       #000000
CTA hover:      rgba(255,255,255,0.85)
```

No accent color. No red, no indigo, no gradients. Pure black and white with opacity variations for hierarchy.

### Typography

Keep Inter font family. Adjustments:
- Headlines: weight 700 (not 800), tighter letter-spacing (-0.03em)
- Body: weight 400, color rgba(255,255,255,0.45), line-height 1.7
- Labels: weight 500, uppercase, letter-spacing 0.1em, rgba(255,255,255,0.25)

### Buttons

- Primary: white bg, black text, pill-shaped (border-radius: 100px), padding 14px 32px
- Secondary: transparent bg, 1px solid rgba(255,255,255,0.15), white text, pill-shaped
- Hover: subtle opacity shift, no color change

### Spacing

Generous — outlit/Sierra style:
- Section padding: 140px vertical (up from 120px)
- Max-width: 1000px for text content (down from 1200px, tighter focus)
- Cards grid: max-width 1200px

## Page Sections (top to bottom)

### 1. Navbar
- Minimal: logo left, nav links center, single CTA right
- Transparent bg, blur on scroll
- Keep existing nav links

### 2. Hero
- Full viewport height
- Centered layout, max-width 700px
- Small uppercase label: "SELF-HEALING AI AGENTS" in rgba(255,255,255,0.25)
- Headline: "Your AI Agents Break. Ours Heal Themselves." in #ffffff, ~48-56px
- Subline: One sentence, rgba(255,255,255,0.45), ~17px
- Single CTA: "Book a Free Audit" — white pill button
- No stats, no secondary CTA, no badge dot, no background orbs/grids
- Subtle radial gradient glow at center (very faint white, almost invisible)

### 3. Logo Slider ("Built with")
- Directly below hero, no section gap
- Label: "BUILT WITH" centered, uppercase, rgba(255,255,255,0.2)
- Infinite horizontal scroll, right-to-left, ~30s loop
- Logos: Anthropic, Twilio, Supabase, Vercel, Stripe, Next.js, Sentry
- SVG logos in white (monochrome), opacity 0.3, hover opacity 0.6
- Edge fade: left and right gradient masks (black → transparent)
- Duplicated logo set for seamless infinite loop
- CSS-only animation (keyframes translateX), no JS

### 4. Problem / Solution
- Keep the 3 problem cards + solution banner concept
- Restyle cards: black bg (#0a0a0a), very subtle border, no hover glow
- Stats in cards: large white text, not colored
- Solution banner: subtle border, no green dot — use white dot instead
- Code block stays (strong differentiator) but restyle to match new palette

### 5. Services Preview
- 3 service cards in a row
- Restyle: black surface, white text, subtle border
- Featured card: slightly brighter border (rgba(255,255,255,0.15)) instead of colored glow
- Price ranges in white, not colored
- CTA buttons: white pill style
- Remove emoji icons, replace with minimal line icons or just numbers (01, 02, 03)

### 6. How It Works (Process)
- 4 steps with connectors
- Step numbers: large white text, not styled differently
- Simplify connectors to thin white lines
- More whitespace between steps

### 7. Self-Healing Demo (Terminal)
- Keep the terminal mockup — this is unique and powerful
- Restyle terminal: pure black bg, slightly lighter border
- Terminal dots: white/gray (not colored red/yellow/green)
- Text colors: white for normal, rgba(255,255,255,0.3) for dim, white for success
- Remove the healing steps diagram below (the terminal already shows it)

### 8. Social Proof / Testimonials
- Keep 3 testimonial cards
- Restyle: black surface, white text, subtle border
- Metric numbers: large white, not colored
- Quotation marks in rgba(255,255,255,0.1)

### 9. ROI Section
- Keep the split layout (text left, card right)
- Restyle card: black surface, monochrome
- Numbers: white (positive green → white, negative red → rgba(255,255,255,0.4))
- Net gain: white bold, not green

### 10. CTA Banner
- Full-width, minimal
- Large headline + single pill CTA
- No secondary link
- Subtle top border separator

## Animations

- Logo slider: CSS keyframes, infinite, linear, ~30s
- Page sections: subtle fade-in on scroll (IntersectionObserver), translateY(20px) → 0
- Terminal: keep existing typing effect if any, or add a subtle line-by-line reveal
- Hover states: opacity transitions only, 200ms ease

## Files to Modify

1. `apps/website/src/app/globals.css` — update CSS variables (color palette)
2. `apps/website/src/app/page.tsx` — restructure all sections, add logo slider
3. `apps/website/src/app/page.module.css` — complete restyle
4. `apps/website/src/components/ServiceCard.tsx` + CSS module — restyle
5. `apps/website/src/components/TestimonialCard.tsx` + CSS module — restyle
6. `apps/website/src/components/CTABanner.tsx` + CSS module — restyle
7. `apps/website/src/components/Navbar.tsx` + CSS module — restyle (if exists)
8. `apps/website/src/components/Footer.tsx` + CSS module — restyle (if exists)

## What NOT to Change

- CRM pages (/readycar, /readyride, /inbox, /dashboard) — keep current dark red theme
- Login page — keep current style
- Apply/funnel pages — keep current style
- API routes — no changes
- No new dependencies — pure CSS animations, no framer-motion or GSAP

## Logo Assets

Need 7 SVG logos in monochrome white:
- Anthropic (wordmark)
- Twilio
- Supabase
- Vercel
- Stripe
- Next.js
- Sentry

These can be inline SVGs in the component for simplicity.
