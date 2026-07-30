'use client';

import { useState } from 'react';
import { colors, radius } from './tokens';
import { renderTemplate, templateForStep, SENDER_EMAIL, type CampaignTemplate } from '@/lib/campaign-templates';
import type { CampaignContact } from '@/hooks/use-campaigns';

interface CampaignSendCardProps {
  contact: CampaignContact;
  onMarkSent: (payload: { id: string; template: string; subject: string }) => void;
  onSetStatus: (payload: { id: string; status: string }) => void;
  isBusy: boolean;
}

const btn = (bg: string, text: string): React.CSSProperties => ({
  padding: '8px 14px',
  borderRadius: radius.sm,
  border: '1px solid rgba(255,255,255,0.1)',
  background: bg,
  color: text,
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
});

/** Gmail compose URL — opens a prefilled draft in the browser Gmail the user already runs. */
function gmailComposeUrl(to: string, subject: string, body: string): string {
  const params = new URLSearchParams({ view: 'cm', fs: '1', to, su: subject, body });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

export default function CampaignSendCard({
  contact,
  onMarkSent,
  onSetStatus,
  isBusy,
}: CampaignSendCardProps): React.ReactElement {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const template: CampaignTemplate | null = templateForStep(contact.sequence_step);

  if (!template) {
    return (
      <div style={{ padding: '14px', color: colors.textMuted, fontSize: '13px' }}>
        {contact.email} — sequence complete
      </div>
    );
  }

  const { subject, body } = renderTemplate(template, contact);
  const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || contact.email;
  const expiredConsent = contact.consent_basis === 'implied_expired';

  const copyEmail = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('[campaign] clipboard copy failed:', err);
      setExpanded(true);
    }
  };

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: radius.md,
        padding: '16px',
        marginBottom: '10px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 240px', minWidth: 0 }}>
          <div style={{ color: colors.text, fontSize: '14px', fontWeight: 600 }}>{name}</div>
          <div style={{ color: colors.textMuted, fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {contact.email}
            {contact.phone ? ` · ${contact.phone}` : ''}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              padding: '3px 9px',
              borderRadius: radius.pill,
              background: 'rgba(220,38,38,0.12)',
              color: colors.brand,
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            Day {template.day} · {template.name}
          </span>
          {expiredConsent && (
            <span
              style={{
                padding: '3px 9px',
                borderRadius: radius.pill,
                background: 'rgba(245,158,11,0.12)',
                color: colors.amber,
                fontSize: '11px',
                fontWeight: 600,
              }}
              title="CASL implied consent from the original inquiry has lapsed (older than 6 months)"
            >
              consent lapsed
            </span>
          )}
        </div>
      </div>

      <div style={{ color: colors.textSecondary, fontSize: '13px', margin: '12px 0 10px' }}>
        <strong style={{ color: colors.text }}>Subject:</strong> {subject}
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <a
          href={gmailComposeUrl(contact.email, subject, body)}
          target="_blank"
          rel="noopener noreferrer"
          style={{ ...btn(colors.brand, '#fff'), textDecoration: 'none', display: 'inline-block' }}
        >
          Open in Gmail
        </a>
        <button onClick={copyEmail} style={btn('rgba(255,255,255,0.05)', colors.text)}>
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button
          onClick={() => setExpanded(!expanded)}
          style={btn('rgba(255,255,255,0.05)', colors.textSecondary)}
        >
          {expanded ? 'Hide' : 'Preview'}
        </button>
        <button
          onClick={() => onMarkSent({ id: contact.id, template: template.id, subject })}
          disabled={isBusy}
          style={{ ...btn('rgba(16,185,129,0.15)', colors.green), opacity: isBusy ? 0.5 : 1 }}
        >
          Mark sent
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
          <button
            onClick={() => onSetStatus({ id: contact.id, status: 'replied' })}
            disabled={isBusy}
            style={btn('rgba(255,255,255,0.04)', colors.cyan)}
          >
            Replied
          </button>
          <button
            onClick={() => onSetStatus({ id: contact.id, status: 'unsubscribed' })}
            disabled={isBusy}
            style={btn('rgba(255,255,255,0.04)', colors.textMuted)}
          >
            Unsub
          </button>
          <button
            onClick={() => onSetStatus({ id: contact.id, status: 'bounced' })}
            disabled={isBusy}
            style={btn('rgba(255,255,255,0.04)', colors.textMuted)}
          >
            Bounced
          </button>
        </div>
      </div>

      {expanded && (
        <pre
          style={{
            marginTop: '12px',
            padding: '14px',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: radius.sm,
            color: colors.textSecondary,
            fontSize: '12.5px',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontFamily: 'inherit',
            maxHeight: '340px',
            overflowY: 'auto',
          }}
        >
          {`From: ${SENDER_EMAIL}\nTo: ${contact.email}\nSubject: ${subject}\n\n${body}`}
        </pre>
      )}
    </div>
  );
}
