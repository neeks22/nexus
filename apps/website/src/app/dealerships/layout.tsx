import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Lead Response for Car Dealerships | Nexus AI',
  description:
    'Your internet leads wait 47 minutes. Ours get answered in 60 seconds. AI-powered lead response that works 24/7, speaks EN/FR, and plugs into Activix CRM. Free 30-day pilot.',
  openGraph: {
    title: 'AI Lead Response for Car Dealerships | Nexus AI',
    description:
      'AI-powered lead response that works 24/7, speaks EN/FR, and plugs into your Activix CRM. Free 30-day pilot — no contracts, no setup fees.',
  },
};

export default function DealershipsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
