/** CRM Shared Styles — reusable style objects for CRM components */

import { colors, radius } from './tokens';

export const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: radius.sm,
  border: `1px solid ${colors.borderStrong}`,
  background: colors.bgInput,
  color: colors.text,
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box' as const,
};

export const cardStyle: React.CSSProperties = {
  background: colors.bgCard,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.md,
  padding: '20px',
};

export const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.7)',
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backdropFilter: 'blur(4px)',
};

export const modalContentStyle: React.CSSProperties = {
  background: colors.bgModal,
  borderRadius: radius.lg,
  padding: '32px',
  width: '100%',
  maxWidth: '480px',
  border: `1px solid ${colors.borderStrong}`,
  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
};

export const tooltipStyle: React.CSSProperties = {
  background: colors.bgModal,
  border: `1px solid ${colors.borderStrong}`,
  borderRadius: radius.sm,
  color: colors.text,
};

export const badgeStyle = (bgColor: string): React.CSSProperties => ({
  background: bgColor,
  color: '#fff',
  padding: '2px 8px',
  borderRadius: '10px',
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
});

export const tableHeaderStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderBottom: `1px solid ${colors.border}`,
  color: colors.textMuted,
  fontSize: '12px',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};

export const tableRowStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderBottom: `1px solid ${colors.border}`,
  cursor: 'pointer',
  transition: 'background 0.1s',
};

export const primaryButtonStyle: React.CSSProperties = {
  padding: '10px 20px',
  borderRadius: radius.sm,
  border: 'none',
  background: colors.brandGradient,
  color: '#fff',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
};

export const secondaryButtonStyle: React.CSSProperties = {
  padding: '10px 20px',
  borderRadius: radius.sm,
  border: `1px solid ${colors.borderStrong}`,
  background: 'transparent',
  color: colors.textMuted,
  fontSize: '14px',
  cursor: 'pointer',
};

export const labelStyle: React.CSSProperties = {
  color: colors.textMuted,
  fontSize: '12px',
  display: 'block',
  marginBottom: '4px',
};

export const pageContainerStyle = (isMobile: boolean): React.CSSProperties => ({
  padding: isMobile ? '16px' : '24px',
  overflowY: 'auto',
  height: isMobile ? 'calc(100vh - 116px)' : 'calc(100vh - 52px)',
});

export const pageTitleStyle = (isMobile: boolean): React.CSSProperties => ({
  color: colors.text,
  fontSize: isMobile ? '18px' : '22px',
  fontWeight: 700,
  margin: '0 0 24px',
});

export const sectionTitleStyle: React.CSSProperties = {
  color: colors.text,
  fontSize: '15px',
  fontWeight: 600,
  margin: '0 0 16px',
};
