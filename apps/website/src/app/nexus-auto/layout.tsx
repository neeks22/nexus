import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Get Approved for a Vehicle | Nexus Auto',
  description:
    'Your income is your credit. Get approved for vehicle financing even with bad credit. Ottawa and surrounding areas. Delivery to your door.',
  robots: 'noindex, nofollow',
  openGraph: {
    title: 'Get Approved for a Vehicle — Even with Bad Credit | Nexus Auto',
    description:
      'Your income is your credit. No credit check required. 3,500+ applications processed. Ottawa and surrounding areas.',
    type: 'website',
    siteName: 'Nexus Auto',
  },
};

export default function NexusAutoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        header, footer, nav { display: none !important; }
      `}</style>
      {children}
    </>
  );
}
