'use client';

import { useState } from 'react';
import StatCard from './StatCard';
import CampaignSendCard from './CampaignSendCard';
import useIsMobile from './useIsMobile';
import { colors, radius } from './tokens';
import {
  useCampaignStats,
  useCampaignQueue,
  useCampaignContacts,
  useMarkSent,
  useUpdateCampaignContact,
} from '@/hooks/use-campaigns';

interface CampaignsTabProps {
  tenant: string;
}

const CONTACT_STATUS_COLORS: Record<string, string> = {
  pending: colors.textMuted,
  in_sequence: colors.amber,
  replied: colors.green,
  unsubscribed: colors.textDim,
  bounced: colors.red,
  closed: colors.textDim,
  sold: colors.greenBright,
};

const FILTERS = ['all', 'pending', 'in_sequence', 'replied', 'unsubscribed', 'bounced', 'sold'] as const;

export default function CampaignsTab({ tenant }: CampaignsTabProps): React.ReactElement {
  const isMobile = useIsMobile();
  const [caslOnly, setCaslOnly] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const { data: stats } = useCampaignStats(tenant);
  const { data: queue, isLoading: queueLoading } = useCampaignQueue(tenant, {
    consentActiveOnly: caslOnly,
    limit: 25,
  });
  const { data: contacts } = useCampaignContacts(tenant, {
    status: filter === 'all' ? undefined : filter,
    search: search || undefined,
  });

  const markSent = useMarkSent(tenant);
  const updateContact = useUpdateCampaignContact(tenant);
  const isBusy = markSent.isPending || updateContact.isPending;

  const capReached = stats ? stats.remainingToday <= 0 : false;

  return (
    <div
      style={{
        padding: isMobile ? '16px' : '24px',
        overflowY: 'auto',
        height: isMobile ? 'calc(100vh - 116px)' : 'calc(100vh - 52px)',
      }}
    >
      <h1 style={{ color: colors.text, fontSize: isMobile ? '18px' : '22px', fontWeight: 700, margin: '0 0 24px' }}>
        Email Campaign
      </h1>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <StatCard title="Contacts" value={stats?.total ?? '—'} subtitle={`${stats?.pending ?? 0} not yet contacted`} color={colors.textMuted} />
        <StatCard
          title="Sent Today"
          value={stats ? `${stats.sentToday} / ${stats.dailyCap}` : '—'}
          subtitle={capReached ? 'Daily cap reached — stop here' : `${stats?.remainingToday ?? 0} left today`}
          color={capReached ? colors.red : colors.green}
        />
        <StatCard title="Replies" value={stats?.replied ?? '—'} subtitle={`${stats?.replyRate ?? 0}% reply rate`} color={colors.green} />
        <StatCard title="In Sequence" value={stats?.inSequence ?? '—'} subtitle="Mid-sequence, awaiting next touch" color={colors.amber} />
        <StatCard title="Sold" value={stats?.sold ?? '—'} subtitle="Closed from this campaign" color={colors.greenBright} />
        <StatCard
          title="Unsub / Bounced"
          value={stats ? stats.unsubscribed + stats.bounced : '—'}
          subtitle={`${stats?.unsubscribed ?? 0} unsub · ${stats?.bounced ?? 0} bounced`}
          color={colors.red}
        />
      </div>

      {capReached && (
        <div
          style={{
            padding: '12px 16px',
            marginBottom: '16px',
            borderRadius: radius.sm,
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.25)',
            color: colors.red,
            fontSize: '13px',
          }}
        >
          Daily cap of {stats?.dailyCap} reached. Sending more from nicolas@readycar.ca risks Google throttling or
          suspending the mailbox — pick this back up tomorrow.
        </div>
      )}

      {/* TODAY'S WAVE */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <h2 style={{ color: colors.text, fontSize: '16px', fontWeight: 600, margin: 0 }}>
            Today&apos;s wave{queue ? ` · ${queue.totalDue} due` : ''}
          </h2>
          <label
            style={{ display: 'flex', alignItems: 'center', gap: '7px', color: colors.textSecondary, fontSize: '13px', cursor: 'pointer' }}
          >
            <input type="checkbox" checked={caslOnly} onChange={(e) => setCaslOnly(e.target.checked)} />
            CASL-safe only (inquiry under 6 months)
          </label>
        </div>

        {queueLoading && <div style={{ color: colors.textMuted, fontSize: '13px' }}>Loading queue...</div>}

        {!queueLoading && (!queue || queue.contacts.length === 0) && (
          <div
            style={{
              padding: '32px',
              textAlign: 'center',
              color: colors.textMuted,
              fontSize: '13px',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: radius.md,
            }}
          >
            {caslOnly
              ? 'Nobody due right now under the CASL-safe filter. Untick it to see the full list.'
              : 'Nobody due right now — everyone has been touched within their wait window.'}
          </div>
        )}

        {queue?.contacts.map((c) => (
          <CampaignSendCard
            key={c.id}
            contact={c}
            isBusy={isBusy}
            onMarkSent={(payload) => markSent.mutate(payload)}
            onSetStatus={(payload) => updateContact.mutate(payload)}
          />
        ))}
      </div>

      {/* ROSTER */}
      <h2 style={{ color: colors.text, fontSize: '16px', fontWeight: 600, margin: '0 0 12px' }}>All contacts</h2>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email or phone"
          style={{
            padding: '8px 12px',
            borderRadius: radius.sm,
            border: `1px solid ${colors.border}`,
            background: colors.bgInput,
            color: colors.text,
            fontSize: '13px',
            fontFamily: 'inherit',
            flex: '1 1 240px',
          }}
        />
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '8px 12px',
              borderRadius: radius.sm,
              border: `1px solid ${filter === f ? colors.brand : colors.border}`,
              background: filter === f ? 'rgba(220,38,38,0.12)' : 'transparent',
              color: filter === f ? colors.brand : colors.textSecondary,
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {f.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div style={{ overflowX: 'auto', borderRadius: radius.md, border: `1px solid ${colors.border}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '680px' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
              {['Name', 'Email', 'Status', 'Step', 'Last sent', 'Consent'].map((h) => (
                <th
                  key={h}
                  style={{ padding: '10px 12px', textAlign: 'left', color: colors.textMuted, fontWeight: 600, whiteSpace: 'nowrap' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(contacts ?? []).map((c) => (
              <tr key={c.id} style={{ borderTop: `1px solid ${colors.border}` }}>
                <td style={{ padding: '10px 12px', color: colors.text, whiteSpace: 'nowrap' }}>
                  {[c.first_name, c.last_name].filter(Boolean).join(' ') || '—'}
                </td>
                <td style={{ padding: '10px 12px', color: colors.textSecondary }}>{c.email}</td>
                <td style={{ padding: '10px 12px', color: CONTACT_STATUS_COLORS[c.status] ?? colors.textMuted, whiteSpace: 'nowrap' }}>
                  {c.status.replace('_', ' ')}
                </td>
                <td style={{ padding: '10px 12px', color: colors.textSecondary }}>{c.sequence_step} / 5</td>
                <td style={{ padding: '10px 12px', color: colors.textMuted, whiteSpace: 'nowrap' }}>
                  {c.last_sent_at ? new Date(c.last_sent_at).toLocaleDateString('en-CA') : '—'}
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    color: c.consent_basis === 'implied_active' ? colors.green : colors.amber,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {c.consent_basis === 'implied_active' ? 'active' : 'lapsed'}
                </td>
              </tr>
            ))}
            {(contacts ?? []).length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: colors.textMuted }}>
                  No contacts match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
