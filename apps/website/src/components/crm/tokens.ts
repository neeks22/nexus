/** CRM Design Tokens — references CSS variables from globals.css */

export const colors = {
  bg: 'var(--crm-bg)',
  bgPanel: 'var(--crm-bg-panel)',
  bgCard: 'var(--crm-bg-card)',
  bgCardHover: 'var(--crm-bg-card-hover)',
  bgInput: 'var(--crm-bg-input)',
  bgModal: 'var(--crm-bg-modal)',
  border: 'var(--crm-border)',
  borderStrong: 'var(--crm-border-strong)',
  text: 'var(--crm-text)',
  textSecondary: 'var(--crm-text-secondary)',
  textMuted: 'var(--crm-text-muted)',
  textDim: 'var(--crm-text-dim)',
  brand: 'var(--crm-brand)',
  brandDark: 'var(--crm-brand-dark)',
  brandGradient: 'var(--crm-brand-gradient)',
  green: 'var(--crm-green)',
  greenBright: 'var(--crm-green-bright)',
  amber: 'var(--crm-amber)',
  cyan: 'var(--crm-cyan)',
  purple: 'var(--crm-purple)',
  red: 'var(--crm-red)',
} as const;

export const radius = {
  sm: 'var(--crm-radius)',
  md: 'var(--crm-radius-lg)',
  lg: 'var(--crm-radius-xl)',
  pill: '100px',
} as const;

export const STATUS_COLORS: Record<string, string> = {
  new: 'var(--crm-brand)',
  contacted: 'var(--crm-amber)',
  appointment: 'var(--crm-green)',
  showed: 'var(--crm-cyan)',
  credit_app: 'var(--crm-brand-dark)',
  approved: 'var(--crm-green-bright)',
  delivered: 'var(--crm-green)',
  lost: 'var(--crm-red)',
};

export const DEAL_STATUS_COLORS: Record<string, string> = {
  negotiating: 'var(--crm-amber)',
  approved: 'var(--crm-green)',
  funded: 'var(--crm-cyan)',
  delivered: 'var(--crm-green-bright)',
  lost: 'var(--crm-red)',
};

export const APPOINTMENT_STATUS_COLORS: Record<string, string> = {
  scheduled: 'var(--crm-amber)',
  confirmed: 'var(--crm-green)',
  completed: 'var(--crm-cyan)',
  no_show: 'var(--crm-red)',
  cancelled: 'var(--crm-text-dim)',
};

export const INVENTORY_STATUS_COLORS: Record<string, string> = {
  available: 'var(--crm-green)',
  sold: 'var(--crm-red)',
  pending: 'var(--crm-amber)',
};

// Monthly funded-units sales target per tenant — used by Dashboard "Funded This Month" goal progress.
// Adjust per tenant business plan; falls back to 30 if tenant unknown.
export const MONTHLY_GOALS: Record<string, number> = {
  readycar: 30,
  readyride: 15,
};

// Industry benchmark: first-touch response time on internet leads must be <15 min to avoid churn.
export const RESPONSE_TIME_TARGET_MIN = 15;

export const GRADE_COLORS: Record<string, string> = {
  'A+': 'var(--crm-green)', 'A': 'var(--crm-green)', 'A-': '#34d399',
  'B+': 'var(--crm-green-bright)', 'B': 'var(--crm-green-bright)', 'B-': '#86efac',
  'C+': 'var(--crm-amber)', 'C': 'var(--crm-amber)', 'C-': '#fbbf24',
  'D+': '#f97316', 'D': '#f97316', 'D-': '#fb923c',
  'F': 'var(--crm-red)',
};
