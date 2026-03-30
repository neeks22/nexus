import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nexus AI — Inbox',
  description: 'SMS Conversation Inbox',
  robots: 'noindex, nofollow',
};

export default function InboxLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        header, footer, nav:not([data-inbox-nav]) { display: none !important; }
      `}</style>
      {children}
    </>
  );
}
