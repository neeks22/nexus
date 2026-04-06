# Nexus Website Full Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform nexusagents.ca from current red-accent glassmorphism design to pure black+white Sierra/Cognition-style premium aesthetic, add "Built with" logo slider, simplify hero to minimal layout.

**Architecture:** CSS-first redesign — update design tokens in globals.css, then restyle every section via CSS module changes. New LogoSlider component with CSS-only infinite scroll. All existing page structure stays, just visual overhaul. No new dependencies.

**Tech Stack:** Next.js 15, CSS Modules, CSS custom properties, CSS keyframe animations, inline SVGs

**Spec:** `docs/superpowers/specs/2026-04-05-website-redesign-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `apps/website/src/app/globals.css` | Modify | Design tokens — new color palette, button styles, typography |
| `apps/website/src/app/page.tsx` | Modify | Hero simplification, add LogoSlider, section restructure |
| `apps/website/src/app/page.module.css` | Modify | Complete restyle of all landing page sections |
| `apps/website/src/components/LogoSlider.tsx` | Create | New — infinite scroll "Built with" tech logos |
| `apps/website/src/components/LogoSlider.module.css` | Create | New — CSS-only marquee animation with edge fades |
| `apps/website/src/components/ServiceCard.tsx` | Modify | Remove emoji icon, use numbered labels (01/02/03) |
| `apps/website/src/components/ServiceCard.module.css` | Modify | Black surface, white text, pill CTAs |
| `apps/website/src/components/TestimonialCard.tsx` | Modify | Monochrome metric badge, white quotation marks |
| `apps/website/src/components/TestimonialCard.module.css` | Modify | Black surface, white text, subtle border |
| `apps/website/src/components/CTABanner.tsx` | Modify | Remove secondary CTA, simplify |
| `apps/website/src/components/CTABanner.module.css` | Modify | Remove gradient orbs, pill CTA, subtle border |
| `apps/website/src/components/Navbar.tsx` | Modify | Minimal — transparent bg, single CTA |
| `apps/website/src/components/Navbar.module.css` | Modify | Remove gradient logo mark, pill CTA |
| `apps/website/src/components/Footer.tsx` | Modify | Minor — remove gradient refs |
| `apps/website/src/components/Footer.module.css` | Modify | Monochrome restyle |

---

### Task 1: Update Design Tokens (globals.css)

**Files:**
- Modify: `apps/website/src/app/globals.css`

- [ ] **Step 1: Replace CSS custom properties**

Replace the `:root` block with the new black+white palette:

```css
:root {
  /* Backgrounds */
  --bg-primary: #000000;
  --bg-secondary: #050505;
  --bg-tertiary: #0a0a0a;
  --bg-glass: rgba(255,255,255,0.02);
  --bg-card: #0a0a0a;
  --bg-card-hover: #111111;

  /* Borders */
  --border: rgba(255,255,255,0.08);
  --border-subtle: rgba(255,255,255,0.06);
  --border-glow: rgba(255,255,255,0.15);

  /* Text */
  --text-primary: #ffffff;
  --text-secondary: rgba(255,255,255,0.45);
  --text-muted: rgba(255,255,255,0.25);

  /* Accent — monochrome (no color) */
  --accent-primary: #ffffff;
  --accent-secondary: rgba(255,255,255,0.85);
  --accent-gradient: none;
  --accent-glow: none;
  --accent-green: #ffffff;
  --accent-green-hover: rgba(255,255,255,0.85);
  --accent-green-dim: rgba(255,255,255,0.06);
  --accent-green-glow: rgba(255,255,255,0.15);
  --accent-amber: rgba(255,255,255,0.6);
  --red: rgba(255,255,255,0.4);
  --red-dim: rgba(255,255,255,0.06);

  /* Typography */
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  /* Layout */
  --radius: 8px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-pill: 100px;
  --max-width: 1200px;
  --max-width-text: 1000px;
  --section-padding: 140px 24px;
  --transition: 200ms ease;

  /* Shadows — minimal */
  --shadow-card: 0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04);
  --shadow-card-hover: 0 16px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.08);
  --shadow-glow: none;
}
```

- [ ] **Step 2: Update button styles**

Replace `.btn-primary` and `.btn-secondary` with pill-shaped monochrome buttons:

```css
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 32px;
  background: #ffffff;
  color: #000000;
  font-size: 15px;
  font-weight: 600;
  border-radius: var(--radius-pill);
  transition: opacity var(--transition);
}

.btn-primary:hover {
  opacity: 0.85;
}

.btn-primary:active {
  transform: scale(0.98);
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 32px;
  background: transparent;
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 600;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: var(--radius-pill);
  transition: border-color var(--transition), opacity var(--transition);
}

.btn-secondary:hover {
  border-color: rgba(255,255,255,0.25);
}
```

- [ ] **Step 3: Update typography, gradient-text, label, code, scrollbar, focus, selection**

Remove all color accent references:

```css
h1, h2, h3, h4, h5, h6 {
  line-height: 1.15;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.label {
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.25);
}

.gradient-text {
  color: #ffffff;
  -webkit-text-fill-color: unset;
  background: none;
  -webkit-background-clip: unset;
  background-clip: unset;
}

code {
  font-family: var(--font-mono);
  font-size: 0.875em;
  background: var(--bg-tertiary);
  padding: 2px 6px;
  border-radius: 6px;
  color: rgba(255,255,255,0.6);
  border: 1px solid var(--border);
}

::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.15);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255,255,255,0.25);
}

:focus-visible {
  outline: 2px solid rgba(255,255,255,0.4);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(255,255,255,0.08);
}

::selection {
  background: rgba(255,255,255,0.15);
  color: var(--text-primary);
}
```

- [ ] **Step 4: Verify build**

Run: `cd /Users/sayah/nexus && npm run build --workspace=apps/website 2>&1 | tail -20`
Expected: Build succeeds (no CSS syntax errors)

- [ ] **Step 5: Commit**

```bash
git add apps/website/src/app/globals.css
git commit -m "feat: update design tokens to pure black+white palette"
```

---

### Task 2: Create LogoSlider Component

**Files:**
- Create: `apps/website/src/components/LogoSlider.tsx`
- Create: `apps/website/src/components/LogoSlider.module.css`

- [ ] **Step 1: Create LogoSlider.tsx**

Create the component with inline SVG text logos for each tech partner. The logos use SVG text elements as clean wordmarks — these render crisply at any size and match the monochrome aesthetic:

```tsx
import styles from './LogoSlider.module.css';

const logos = [
  { name: 'Anthropic', width: 120 },
  { name: 'Twilio', width: 80 },
  { name: 'Supabase', width: 100 },
  { name: 'Vercel', width: 80 },
  { name: 'Stripe', width: 70 },
  { name: 'Next.js', width: 80 },
  { name: 'Sentry', width: 80 },
];

export function LogoSlider() {
  const renderLogo = (logo: typeof logos[0], index: number) => (
    <div key={`${logo.name}-${index}`} className={styles.logo} aria-label={logo.name}>
      <svg viewBox={`0 0 ${logo.width} 20`} fill="currentColor" height="20" width={logo.width}>
        <text x="0" y="15" fontFamily="Inter, system-ui" fontSize="16" fontWeight="600" letterSpacing="-0.02em">
          {logo.name}
        </text>
      </svg>
    </div>
  );

  return (
    <section className={styles.section}>
      <p className={styles.label}>BUILT WITH</p>
      <div className={styles.track}>
        <div className={styles.slider}>
          {logos.map((logo, i) => renderLogo(logo, i))}
          {logos.map((logo, i) => renderLogo(logo, i + logos.length))}
        </div>
      </div>
    </section>
  );
}
```

Note: The SVGs use text elements as placeholders. During implementation, these can be replaced with actual brand SVG paths if sourced. The text-based approach renders cleanly and matches the monochrome aesthetic.

- [ ] **Step 2: Create LogoSlider.module.css**

```css
.section {
  padding: 40px 24px 80px;
  text-align: center;
}

.label {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.2);
  margin-bottom: 32px;
}

.track {
  position: relative;
  overflow: hidden;
  max-width: 900px;
  margin: 0 auto;
}

/* Edge fade masks */
.track::before,
.track::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 120px;
  z-index: 2;
  pointer-events: none;
}

.track::before {
  left: 0;
  background: linear-gradient(90deg, #000000 0%, transparent 100%);
}

.track::after {
  right: 0;
  background: linear-gradient(270deg, #000000 0%, transparent 100%);
}

.slider {
  display: flex;
  align-items: center;
  gap: 64px;
  width: max-content;
  animation: scroll 30s linear infinite;
}

.logo {
  flex-shrink: 0;
  height: 20px;
  color: rgba(255,255,255,0.3);
  transition: color 200ms ease;
}

.logo:hover {
  color: rgba(255,255,255,0.6);
}

@keyframes scroll {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
}
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/sayah/nexus && npm run build --workspace=apps/website 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add apps/website/src/components/LogoSlider.tsx apps/website/src/components/LogoSlider.module.css
git commit -m "feat: add LogoSlider component with CSS-only infinite scroll"
```

---

### Task 3: Restyle Hero + Add LogoSlider to Page

**Files:**
- Modify: `apps/website/src/app/page.tsx` (lines 1-100 approx — hero section)
- Modify: `apps/website/src/app/page.module.css` (lines 75-290 — hero styles)

- [ ] **Step 1: Update hero section in page.tsx**

Replace the hero section (inside the `<section className={styles.hero}>` block) with:

```tsx
{/* Hero */}
<section className={styles.hero}>
  <div className={styles.heroGlow} />
  <div className={styles.heroInner}>
    <p className={styles.heroLabel}>SELF-HEALING AI AGENTS</p>
    <h1 className={styles.heroHeadline}>
      Your AI Agents Break.<br />
      Ours Heal Themselves.
    </h1>
    <p className={styles.heroSubline}>
      We build self-healing AI agent systems that run 24/7 without babysitting — so you can scale without hiring more engineers.
    </p>
    <div className={styles.heroActions}>
      <a href="/contact" className={styles.heroPrimary}>Book a Free Audit</a>
    </div>
  </div>
</section>
```

Remove: `heroGrid`, `heroOrb`, `heroOrbSecondary`, `heroBadge`, `heroBadgeDot`, `heroAccent`, `heroSecondary`, `heroStats`, `heroStat`, `heroStatValue`, `heroStatLabel`, `heroStatDivider` — all removed from JSX.

- [ ] **Step 2: Add LogoSlider import and placement**

At top of page.tsx, add import:
```tsx
import { LogoSlider } from '@/components/LogoSlider';
```

Place `<LogoSlider />` directly after the closing `</section>` of the hero and before the problems section.

- [ ] **Step 3: Restyle hero CSS in page.module.css**

Replace the entire hero CSS block (`.hero` through `.heroStatDivider` and related keyframes) with:

```css
/* ============================================
   HERO
   ============================================ */

.hero {
  min-height: 100vh;
  padding: 160px 24px 80px;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.heroGlow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 600px;
  height: 400px;
  background: radial-gradient(ellipse, rgba(255,255,255,0.03) 0%, transparent 70%);
  pointer-events: none;
}

.heroInner {
  max-width: 700px;
  margin: 0 auto;
  text-align: center;
  position: relative;
  z-index: 1;
}

.heroLabel {
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.25);
  margin-bottom: 24px;
}

.heroHeadline {
  font-size: clamp(2.5rem, 6vw, 3.5rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.1;
  color: #ffffff;
  margin-bottom: 24px;
}

.heroSubline {
  font-size: 17px;
  color: rgba(255,255,255,0.45);
  line-height: 1.7;
  max-width: 520px;
  margin: 0 auto 48px;
}

.heroActions {
  display: flex;
  justify-content: center;
}

.heroPrimary {
  display: inline-flex;
  align-items: center;
  padding: 14px 32px;
  background: #ffffff;
  color: #000000;
  font-size: 15px;
  font-weight: 600;
  border-radius: 100px;
  transition: opacity 200ms ease;
}

.heroPrimary:hover {
  opacity: 0.85;
}

.heroPrimary:active {
  transform: scale(0.98);
}
```

Remove these classes entirely (no longer used): `heroGrid`, `heroOrb`, `heroOrbSecondary`, `heroBadge`, `heroBadgeDot`, `heroAccent`, `heroSecondary`, `heroStats`, `heroStat`, `heroStatValue`, `heroStatLabel`, `heroStatDivider`, `@keyframes shimmer`, `@keyframes orbFloat`.

- [ ] **Step 4: Verify build**

Run: `cd /Users/sayah/nexus && npm run build --workspace=apps/website 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add apps/website/src/app/page.tsx apps/website/src/app/page.module.css
git commit -m "feat: redesign hero to minimal black+white, add LogoSlider"
```

---

### Task 4: Restyle Problem/Solution Section

**Files:**
- Modify: `apps/website/src/app/page.module.css` (lines 291-401 — problems/solution styles)
- Modify: `apps/website/src/app/page.tsx` (solution banner — change green dot to white dot)

- [ ] **Step 1: Update problem/solution CSS**

Replace the problems section CSS:

```css
/* ============================================
   PROBLEMS
   ============================================ */

.problems {
  padding: 140px 24px;
  position: relative;
}

.problems::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, #050505 0%, #000000 100%);
  z-index: -1;
}

.problemsHeader {
  text-align: center;
  margin-bottom: 56px;
}

.problemsGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-bottom: 48px;
}

.problemCard {
  padding: 40px 32px;
  background: #0a0a0a;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: var(--radius-xl);
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: border-color var(--transition);
}

.problemCard:hover {
  border-color: rgba(255,255,255,0.12);
}

.problemStat {
  font-size: 40px;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: #ffffff;
  font-family: var(--font-mono);
  line-height: 1;
}

.problemTitle {
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.02em;
}

.problemText {
  font-size: 14px;
  color: rgba(255,255,255,0.45);
  line-height: 1.7;
}

.solutionBanner {
  background: #0a0a0a;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: var(--radius-xl);
  padding: 40px 44px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  align-items: center;
}

.solutionText {
  font-size: 15px;
  color: rgba(255,255,255,0.45);
  line-height: 1.7;
}

.solutionCode {
  display: block;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.8;
  padding: 24px 28px;
  background: #000000;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  color: rgba(255,255,255,0.45);
  white-space: pre;
  overflow-x: auto;
}

.codeComment {
  color: rgba(255,255,255,0.25);
}

.codeDim {
  color: rgba(255,255,255,0.25);
}

.codeGreen {
  color: #ffffff;
  font-weight: 600;
}
```

- [ ] **Step 2: Update solution banner in page.tsx**

In the solution banner JSX, find the green dot element (the `labelPillDotGreen` class) and change it to use `labelPillDot` (which will be white after the shared styles update).

- [ ] **Step 3: Update shared label/section styles at top of page.module.css**

Replace the label pill and section header styles:

```css
.labelPill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.25);
  margin-bottom: 16px;
}

.labelPillDot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ffffff;
}

.labelPillDotGreen {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ffffff;
}

.sectionTitle {
  font-size: clamp(1.75rem, 4vw, 2.75rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  color: #ffffff;
  line-height: 1.15;
  margin-bottom: 16px;
}

.sectionSubtitle {
  font-size: 17px;
  color: rgba(255,255,255,0.45);
  max-width: 560px;
  margin: 0 auto;
  line-height: 1.7;
}
```

Remove `@keyframes pulse` and the `backdrop-filter` / `box-shadow` properties from label dots.

- [ ] **Step 4: Verify build**

Run: `cd /Users/sayah/nexus && npm run build --workspace=apps/website 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add apps/website/src/app/page.tsx apps/website/src/app/page.module.css
git commit -m "feat: restyle problem/solution section to monochrome"
```

---

### Task 5: Restyle ServiceCard Component

**Files:**
- Modify: `apps/website/src/components/ServiceCard.tsx`
- Modify: `apps/website/src/components/ServiceCard.module.css`
- Modify: `apps/website/src/app/page.tsx` (service card props — change icon to number)

- [ ] **Step 1: Update ServiceCard.tsx**

Replace `icon` prop with `number` prop:

```tsx
import styles from './ServiceCard.module.css';

interface ServiceCardProps {
  number: string;
  title: string;
  priceRange: string;
  description: string;
  deliverables: string[];
  featured?: boolean;
  cta?: string;
  href?: string;
}

export function ServiceCard({
  number,
  title,
  priceRange,
  description,
  deliverables,
  featured = false,
  cta = 'Learn More',
  href = '/contact',
}: ServiceCardProps) {
  return (
    <div className={`${styles.card} ${featured ? styles.featured : ''}`}>
      <div className={styles.number}>{number}</div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.price}>{priceRange}</p>
      <p className={styles.description}>{description}</p>
      <ul className={styles.deliverables}>
        {deliverables.map((d) => (
          <li key={d} className={styles.deliverable}>
            <span className={styles.check}>&#10003;</span>
            {d}
          </li>
        ))}
      </ul>
      <a href={href} className={styles.cta}>{cta}</a>
    </div>
  );
}
```

- [ ] **Step 2: Update ServiceCard.module.css**

Replace entire file:

```css
.card {
  padding: 40px 32px;
  background: #0a0a0a;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: border-color 200ms ease;
  position: relative;
}

.card:hover {
  border-color: rgba(255,255,255,0.12);
}

.featured {
  border-color: rgba(255,255,255,0.15);
}

.number {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255,255,255,0.25);
  letter-spacing: 0.05em;
  font-family: var(--font-mono);
}

.title {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #ffffff;
}

.price {
  font-size: 15px;
  font-weight: 600;
  color: #ffffff;
}

.description {
  font-size: 14px;
  color: rgba(255,255,255,0.45);
  line-height: 1.7;
}

.deliverables {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
  padding: 0;
}

.deliverable {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: rgba(255,255,255,0.45);
}

.check {
  color: rgba(255,255,255,0.25);
  font-size: 12px;
  flex-shrink: 0;
}

.cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 28px;
  background: #ffffff;
  color: #000000;
  font-size: 14px;
  font-weight: 600;
  border-radius: 100px;
  transition: opacity 200ms ease;
  margin-top: auto;
  text-align: center;
}

.cta:hover {
  opacity: 0.85;
}
```

- [ ] **Step 3: Update service card usage in page.tsx**

Find the three `<ServiceCard>` usages and change `icon` prop to `number`:

```tsx
<ServiceCard
  number="01"
  title="AI Agent Audit"
  priceRange="$5,000 - $15,000"
  ...
/>
<ServiceCard
  number="02"
  title="Custom Build"
  priceRange="$15,000 - $50,000"
  featured
  ...
/>
<ServiceCard
  number="03"
  title="Managed Operations"
  priceRange="$5,000 - $25,000/mo"
  ...
/>
```

- [ ] **Step 4: Update services section CSS in page.module.css**

Replace services styles:

```css
.services {
  padding: 140px 24px;
}

.servicesGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.servicesFooter {
  text-align: center;
  margin-top: 40px;
}

.servicesLink {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255,255,255,0.45);
  transition: color 200ms ease;
}

.servicesLink:hover {
  color: #ffffff;
}
```

Remove the `::after` pseudo-element styles from `.servicesLink`.

- [ ] **Step 5: Verify build**

Run: `cd /Users/sayah/nexus && npm run build --workspace=apps/website 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
git add apps/website/src/components/ServiceCard.tsx apps/website/src/components/ServiceCard.module.css apps/website/src/app/page.tsx
git commit -m "feat: restyle ServiceCard to monochrome with numbered labels"
```

---

### Task 6: Restyle How It Works Section

**Files:**
- Modify: `apps/website/src/app/page.module.css` (lines 454-539 — howItWorks/steps styles)

- [ ] **Step 1: Update How It Works CSS**

Replace the full howItWorks block:

```css
.howItWorks {
  padding: 140px 24px;
  position: relative;
}

.howItWorks::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, #050505 0%, #000000 100%);
  z-index: -1;
}

.steps {
  display: flex;
  align-items: flex-start;
  gap: 0;
}

.step {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 40px 28px;
  background: #0a0a0a;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: var(--radius-xl);
  transition: border-color 200ms ease;
}

.step:hover {
  border-color: rgba(255,255,255,0.12);
}

.stepConnector {
  display: flex;
  align-items: center;
  padding-top: 48px;
  width: 40px;
  flex-shrink: 0;
}

.stepConnector span {
  display: block;
  width: 100%;
  height: 1px;
  background: rgba(255,255,255,0.1);
}

.stepNumber {
  font-size: 24px;
  font-weight: 700;
  color: #ffffff;
  font-family: var(--font-mono);
  letter-spacing: -0.02em;
}

.stepTitle {
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #ffffff;
}

.stepText {
  font-size: 14px;
  color: rgba(255,255,255,0.45);
  line-height: 1.7;
}
```

Remove the circular badge styling from `.stepNumber` (no border-radius, no background).

- [ ] **Step 2: Update step numbers in page.tsx if needed**

Check that step numbers in JSX are plain text (01, 02, 03, 04) — no special wrapper needed since we simplified the CSS.

- [ ] **Step 3: Verify build**

Run: `cd /Users/sayah/nexus && npm run build --workspace=apps/website 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add apps/website/src/app/page.module.css apps/website/src/app/page.tsx
git commit -m "feat: restyle How It Works section to monochrome"
```

---

### Task 7: Restyle Self-Healing Demo (Terminal)

**Files:**
- Modify: `apps/website/src/app/page.module.css` (lines 541-715 — healingDemo styles)
- Modify: `apps/website/src/app/page.tsx` (remove healing steps diagram below terminal)

- [ ] **Step 1: Update terminal CSS**

Replace the healing demo CSS block:

```css
.healingDemo {
  padding: 140px 24px;
}

.terminalWindow {
  background: #000000;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: 0 16px 64px rgba(0,0,0,0.5);
}

.terminalBar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  background: rgba(255,255,255,0.02);
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.terminalDots {
  display: flex;
  gap: 6px;
}

.dotRed { width: 12px; height: 12px; border-radius: 50%; background: rgba(255,255,255,0.2); }
.dotYellow { width: 12px; height: 12px; border-radius: 50%; background: rgba(255,255,255,0.15); }
.dotGreen { width: 12px; height: 12px; border-radius: 50%; background: rgba(255,255,255,0.1); }

.terminalTitle {
  font-size: 12px;
  color: rgba(255,255,255,0.25);
  font-family: var(--font-mono);
  margin-left: auto;
  margin-right: auto;
}

.terminalBody {
  padding: 24px 28px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.terminalLine {
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.6;
  opacity: 0;
  animation: fadeInLine 0.3s ease forwards;
}

.terminalLine:nth-child(1) { animation-delay: 0.1s; }
.terminalLine:nth-child(2) { animation-delay: 0.4s; }
.terminalLine:nth-child(3) { animation-delay: 0.9s; }
.terminalLine:nth-child(4) { animation-delay: 1.5s; }
.terminalLine:nth-child(5) { animation-delay: 1.9s; }
.terminalLine:nth-child(6) { animation-delay: 2.4s; }
.terminalLine:nth-child(7) { animation-delay: 3.0s; }
.terminalLine:nth-child(8) { animation-delay: 3.6s; }

@keyframes fadeInLine {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.lineTime { color: rgba(255,255,255,0.25); font-size: 12px; flex-shrink: 0; }
.lineDim { color: rgba(255,255,255,0.25); flex-shrink: 0; }
.lineGreen { color: #ffffff; flex-shrink: 0; font-weight: 700; }
.lineRed { color: rgba(255,255,255,0.5); flex-shrink: 0; font-weight: 700; }
.lineYellow { color: rgba(255,255,255,0.4); flex-shrink: 0; font-weight: 700; }
.lineNormal { color: rgba(255,255,255,0.45); }
.lineError { color: #ffffff; }
.lineWarning { color: rgba(255,255,255,0.45); }
.lineSuccess { color: #ffffff; }

.terminalCursor {
  padding-top: 4px;
  opacity: 0;
  animation: fadeInLine 0.1s ease 4s forwards;
}

.cursor {
  color: #ffffff;
  animation: blink 1s step-end infinite 4s;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
```

- [ ] **Step 2: Remove healing steps diagram from page.tsx**

Find and remove the entire `<div className={styles.healingSteps}>` block with the four healing step icons and arrows below the terminal. The terminal already demonstrates the self-healing flow.

- [ ] **Step 3: Remove unused CSS classes**

Delete these classes from page.module.css: `.healingSteps`, `.healingStep`, `.healingStepIcon`, `.healingStepIcon[data-state="fail"]`, `.healingStepIcon[data-state="diagnose"]`, `.healingStepIcon[data-state="recover"]`, `.healingStepIcon[data-state="continue"]`, `.healingStepLabel`, `.healingArrow`.

- [ ] **Step 4: Verify build**

Run: `cd /Users/sayah/nexus && npm run build --workspace=apps/website 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add apps/website/src/app/page.tsx apps/website/src/app/page.module.css
git commit -m "feat: restyle terminal demo to monochrome, remove healing steps diagram"
```

---

### Task 8: Restyle TestimonialCard Component

**Files:**
- Modify: `apps/website/src/components/TestimonialCard.tsx`
- Modify: `apps/website/src/components/TestimonialCard.module.css`
- Modify: `apps/website/src/app/page.module.css` (testimonials section)

- [ ] **Step 1: Update TestimonialCard.module.css**

Replace entire file:

```css
.card {
  padding: 36px 32px;
  background: #0a0a0a;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: border-color 200ms ease;
}

.card:hover {
  border-color: rgba(255,255,255,0.12);
}

.stars {
  font-size: 14px;
  color: rgba(255,255,255,0.25);
  letter-spacing: 2px;
}

.metric {
  display: inline-flex;
  padding: 4px 12px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 100px;
  font-size: 13px;
  font-weight: 700;
  color: #ffffff;
  font-family: var(--font-mono);
}

.quote {
  font-size: 15px;
  color: rgba(255,255,255,0.45);
  line-height: 1.7;
  font-style: italic;
  position: relative;
  padding-left: 16px;
}

.quote::before {
  content: '\201C';
  position: absolute;
  left: 0;
  top: -4px;
  font-size: 24px;
  color: rgba(255,255,255,0.1);
  font-style: normal;
}

.author {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid rgba(255,255,255,0.06);
  margin-top: auto;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255,255,255,0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: rgba(255,255,255,0.4);
}

.authorInfo {
  display: flex;
  flex-direction: column;
}

.authorName {
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
}

.authorTitle {
  font-size: 12px;
  color: rgba(255,255,255,0.25);
}
```

- [ ] **Step 2: Update testimonials section CSS in page.module.css**

Replace:

```css
.testimonials {
  padding: 140px 24px;
  position: relative;
}

.testimonials::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, #050505 0%, #000000 100%);
  z-index: -1;
}

.testimonialsGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/sayah/nexus && npm run build --workspace=apps/website 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add apps/website/src/components/TestimonialCard.tsx apps/website/src/components/TestimonialCard.module.css apps/website/src/app/page.module.css
git commit -m "feat: restyle TestimonialCard to monochrome"
```

---

### Task 9: Restyle ROI Section

**Files:**
- Modify: `apps/website/src/app/page.module.css` (lines 740-913 — ROI styles)

- [ ] **Step 1: Update ROI CSS**

Replace the entire ROI section CSS:

```css
.roi {
  padding: 140px 24px;
}

.roiInner {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 80px;
  align-items: center;
}

.roiTitle {
  font-size: clamp(1.75rem, 3.5vw, 2.5rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  color: #ffffff;
  margin-bottom: 16px;
}

.roiText {
  font-size: 15px;
  color: rgba(255,255,255,0.45);
  line-height: 1.7;
  margin-bottom: 32px;
}

.roiText strong {
  color: #ffffff;
  font-weight: 700;
}

.roiMetrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

.roiMetric {
  text-align: center;
  padding: 20px 16px;
  background: #0a0a0a;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px;
  transition: border-color 200ms ease;
}

.roiMetric:hover {
  border-color: rgba(255,255,255,0.12);
}

.roiMetricValue {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: #ffffff;
}

.roiMetricLabel {
  font-size: 11px;
  color: rgba(255,255,255,0.25);
  margin-top: 4px;
  line-height: 1.4;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.roiCta {
  display: inline-flex;
  align-items: center;
  font-size: 15px;
  font-weight: 600;
  color: rgba(255,255,255,0.45);
  transition: color 200ms ease;
}

.roiCta:hover {
  color: #ffffff;
}

.roiCard {
  background: #0a0a0a;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: var(--radius-xl);
  padding: 36px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.roiCardTitle {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255,255,255,0.25);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}

.roiRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.roiRowLabel {
  font-size: 14px;
  color: rgba(255,255,255,0.45);
}

.roiRowValueNeg {
  font-size: 14px;
  font-weight: 700;
  color: rgba(255,255,255,0.4);
  font-family: var(--font-mono);
  white-space: nowrap;
}

.roiRowValuePos {
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
  font-family: var(--font-mono);
  white-space: nowrap;
}

.roiDivider {
  height: 1px;
  background: rgba(255,255,255,0.06);
}

.roiTotal .roiRowLabel {
  color: #ffffff;
  font-weight: 700;
}

.roiTotal .roiRowValuePos {
  font-size: 18px;
  color: #ffffff;
  font-weight: 800;
}

.roiDisclaimer {
  font-size: 12px;
  color: rgba(255,255,255,0.25);
  font-style: italic;
  margin-top: 4px;
}
```

Remove all `var(--accent-gradient)` / `-webkit-background-clip` / `-webkit-text-fill-color` from ROI section. Remove `backdrop-filter` from `.roiMetric` and `.roiCard`. Remove `var(--border-glow)` hover effects.

- [ ] **Step 2: Verify build**

Run: `cd /Users/sayah/nexus && npm run build --workspace=apps/website 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add apps/website/src/app/page.module.css
git commit -m "feat: restyle ROI section to monochrome"
```

---

### Task 10: Restyle CTABanner Component

**Files:**
- Modify: `apps/website/src/components/CTABanner.tsx`
- Modify: `apps/website/src/components/CTABanner.module.css`

- [ ] **Step 1: Simplify CTABanner.tsx**

Remove the secondary CTA and simplify:

```tsx
import styles from './CTABanner.module.css';

interface CTABannerProps {
  headline: string;
  subline?: string;
  ctaText?: string;
  ctaHref?: string;
}

export function CTABanner({
  headline,
  subline,
  ctaText = 'Book a Free Audit',
  ctaHref = '/contact',
}: CTABannerProps) {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <h2 className={styles.headline}>{headline}</h2>
        {subline && <p className={styles.subline}>{subline}</p>}
        <a href={ctaHref} className={styles.cta}>
          {ctaText}
        </a>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Replace CTABanner.module.css**

```css
.section {
  padding: 140px 24px;
  border-top: 1px solid rgba(255,255,255,0.06);
}

.inner {
  max-width: 600px;
  margin: 0 auto;
  text-align: center;
}

.headline {
  font-size: clamp(1.5rem, 4vw, 2.25rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  color: #ffffff;
  margin-bottom: 16px;
  line-height: 1.15;
}

.subline {
  font-size: 17px;
  color: rgba(255,255,255,0.45);
  line-height: 1.7;
  margin-bottom: 32px;
}

.cta {
  display: inline-flex;
  align-items: center;
  padding: 14px 32px;
  background: #ffffff;
  color: #000000;
  font-size: 15px;
  font-weight: 600;
  border-radius: 100px;
  transition: opacity 200ms ease;
}

.cta:hover {
  opacity: 0.85;
}

@media (max-width: 768px) {
  .section {
    padding: 100px 20px;
  }
}
```

- [ ] **Step 3: Update CTABanner usage in page.tsx**

Remove `secondaryText` and `secondaryHref` props from the `<CTABanner>` in page.tsx (if present).

- [ ] **Step 4: Verify build**

Run: `cd /Users/sayah/nexus && npm run build --workspace=apps/website 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add apps/website/src/components/CTABanner.tsx apps/website/src/components/CTABanner.module.css apps/website/src/app/page.tsx
git commit -m "feat: restyle CTABanner to minimal monochrome with pill CTA"
```

---

### Task 11: Restyle Navbar

**Files:**
- Modify: `apps/website/src/components/Navbar.module.css`

- [ ] **Step 1: Update Navbar CSS**

Replace the full Navbar.module.css:

```css
.header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(0,0,0,0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.nav {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.02em;
}

.logoMark {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 800;
  color: #000000;
}

.logoText {
  color: #ffffff;
}

.links {
  display: flex;
  align-items: center;
  gap: 32px;
}

.link {
  font-size: 14px;
  font-weight: 500;
  color: rgba(255,255,255,0.45);
  transition: color 200ms ease;
  position: relative;
}

.link:hover,
.link.active {
  color: #ffffff;
}

.cta {
  display: inline-flex;
  align-items: center;
  padding: 10px 24px;
  background: #ffffff;
  color: #000000;
  font-size: 14px;
  font-weight: 600;
  border-radius: 100px;
  transition: opacity 200ms ease;
}

.cta:hover {
  opacity: 0.85;
}

.toggle {
  display: none;
  flex-direction: column;
  gap: 5px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
}

.toggleBar {
  width: 20px;
  height: 2px;
  background: #ffffff;
  border-radius: 1px;
}

@media (max-width: 768px) {
  .links, .cta {
    display: none;
  }

  .toggle {
    display: flex;
  }
}
```

Remove: gradient logo mark, underline animations on links, box-shadow on CTA, saturate filter.

- [ ] **Step 2: Verify build**

Run: `cd /Users/sayah/nexus && npm run build --workspace=apps/website 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add apps/website/src/components/Navbar.module.css
git commit -m "feat: restyle Navbar to minimal monochrome with pill CTA"
```

---

### Task 12: Restyle Footer

**Files:**
- Modify: `apps/website/src/components/Footer.module.css`

- [ ] **Step 1: Update Footer CSS**

Replace the full Footer.module.css:

```css
.footer {
  border-top: 1px solid rgba(255,255,255,0.06);
  padding: 80px 24px 40px;
}

.inner {
  max-width: 1200px;
  margin: 0 auto;
}

.top {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 64px;
  padding-bottom: 48px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.brand {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logoMark {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 800;
  color: #000000;
}

.logoText {
  font-size: 15px;
  font-weight: 700;
  color: #ffffff;
}

.tagline {
  font-size: 14px;
  color: rgba(255,255,255,0.35);
  line-height: 1.6;
}

.location {
  font-size: 12px;
  color: rgba(255,255,255,0.25);
}

.columns {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 40px;
}

.columnTitle {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255,255,255,0.25);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 16px;
}

.columnLinks {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.columnLinks a {
  font-size: 14px;
  color: rgba(255,255,255,0.45);
  transition: color 200ms ease;
}

.columnLinks a:hover {
  color: #ffffff;
}

.code {
  font-family: var(--font-mono);
  font-size: 12px;
  padding: 2px 6px;
  background: rgba(255,255,255,0.04);
  border-radius: 4px;
  color: rgba(255,255,255,0.45);
}

.bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 32px;
}

.copyright {
  font-size: 12px;
  color: rgba(255,255,255,0.25);
}

.builtWith {
  font-size: 12px;
  color: rgba(255,255,255,0.25);
}

@media (max-width: 768px) {
  .top {
    grid-template-columns: 1fr;
  }

  .columns {
    grid-template-columns: 1fr 1fr;
  }

  .bottom {
    flex-direction: column;
    gap: 8px;
    text-align: center;
  }
}
```

Remove all gradient text styling from logo.

- [ ] **Step 2: Verify build**

Run: `cd /Users/sayah/nexus && npm run build --workspace=apps/website 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add apps/website/src/components/Footer.module.css
git commit -m "feat: restyle Footer to monochrome"
```

---

### Task 13: Update Responsive Breakpoints

**Files:**
- Modify: `apps/website/src/app/page.module.css` (responsive section at bottom)

- [ ] **Step 1: Update responsive styles**

Replace the responsive section at the bottom of page.module.css:

```css
/* ============================================
   RESPONSIVE
   ============================================ */

@media (max-width: 1024px) {
  .steps {
    flex-wrap: wrap;
    gap: 16px;
  }

  .stepConnector {
    display: none;
  }

  .step {
    flex: 1 1 calc(50% - 16px);
    min-width: 220px;
  }
}

@media (max-width: 768px) {
  .hero {
    min-height: auto;
    padding: 120px 20px 60px;
  }

  .problemsGrid { grid-template-columns: 1fr; }
  .solutionBanner { grid-template-columns: 1fr; }
  .servicesGrid { grid-template-columns: 1fr; }
  .steps { flex-direction: column; }
  .step { flex: none; }
  .testimonialsGrid { grid-template-columns: 1fr; }
  .roiInner { grid-template-columns: 1fr; }
  .roiMetrics { grid-template-columns: repeat(3, 1fr); }
}
```

Remove all hero stats responsive styles (they no longer exist).

- [ ] **Step 2: Verify build**

Run: `cd /Users/sayah/nexus && npm run build --workspace=apps/website 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add apps/website/src/app/page.module.css
git commit -m "feat: update responsive styles for redesigned sections"
```

---

### Task 14: Add Scroll Fade-In Animations

**Files:**
- Modify: `apps/website/src/app/page.tsx` (add data-animate attributes and inline script)
- Modify: `apps/website/src/app/globals.css` (add global fade-in styles)

- [ ] **Step 1: Add fade-in styles to globals.css**

Add at the bottom of globals.css (before the responsive media query):

```css
/* Scroll fade-in animations */
[data-animate] {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}

[data-animate].visible {
  opacity: 1;
  transform: translateY(0);
}
```

- [ ] **Step 2: Add data-animate attributes to sections in page.tsx**

Add `data-animate` attribute to each major section element:

```tsx
<section className={styles.problems} data-animate>
<section className={styles.services} data-animate>
<section className={styles.howItWorks} data-animate>
<section className={styles.healingDemo} data-animate>
<section className={styles.testimonials} data-animate>
<section className={styles.roi} data-animate>
```

- [ ] **Step 3: Add IntersectionObserver script to page.tsx**

Add before the closing `</main>` tag:

```tsx
<script
  suppressHydrationWarning
  dangerouslySetInnerHTML={{
    __html: `(function(){var o=new IntersectionObserver(function(e){e.forEach(function(n){if(n.isIntersecting){n.target.classList.add("visible");o.unobserve(n.target)}})},{threshold:0.1});document.querySelectorAll("[data-animate]").forEach(function(el){o.observe(el)})})();`,
  }}
/>
```

This is a static self-executing script with no user input — safe from XSS.

- [ ] **Step 4: Verify build**

Run: `cd /Users/sayah/nexus && npm run build --workspace=apps/website 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add apps/website/src/app/page.tsx apps/website/src/app/globals.css
git commit -m "feat: add scroll fade-in animations to landing sections"
```

---

### Task 15: Final Verification and Cleanup

**Files:**
- All modified files

- [ ] **Step 1: Full build check**

Run: `cd /Users/sayah/nexus && npm run build --workspace=apps/website 2>&1 | tail -30`
Expected: Build succeeds with no errors

- [ ] **Step 2: Check for unused CSS classes referencing old colors**

Run: `grep -rn "accent-gradient\|99,102,241\|DC2626\|B91C1C\|139,92,246" apps/website/src/app/page.module.css`
Expected: No matches

- [ ] **Step 3: Check components for old color references**

Run: `grep -rn "accent-gradient\|DC2626\|B91C1C\|99,102,241" apps/website/src/components/`
Expected: No matches

- [ ] **Step 4: Visual check — start dev server**

Run: `cd /Users/sayah/nexus && npm run dev --workspace=apps/website`
Open: http://localhost:3000
Verify: Pure black background, white text, pill-shaped CTAs, no color accents, logo slider scrolling

- [ ] **Step 5: Final commit if any cleanup needed**

```bash
git add -A
git commit -m "chore: cleanup old color references from website redesign"
```
