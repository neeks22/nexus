import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Get Pre-Qualified | Nexus Auto',
  description: 'Get pre-qualified for vehicle financing in 2 minutes. All credit situations welcome. 94% approval rate.',
  robots: 'index, follow',
};

export default function ApplyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        header, footer, nav { display: none !important; }
      `}</style>
      {children}
    </>
  );
}
