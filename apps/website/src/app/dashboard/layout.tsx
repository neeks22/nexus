import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nexus CRM — Dashboard',
  robots: 'noindex, nofollow',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`header, footer { display: none !important; }`}</style>
      {children}
    </>
  );
}
