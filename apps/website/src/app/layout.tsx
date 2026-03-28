import type { Metadata } from 'next';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Nexus — Self-Healing AI Agent Systems',
    template: '%s | Nexus',
  },
  description:
    'We build AI agent systems that fix themselves. Self-healing multi-agent pipelines that run 24/7 without babysitting. Ottawa-based AI agency.',
  keywords: [
    'AI agents',
    'self-healing AI',
    'multi-agent systems',
    'AI automation',
    'Ottawa AI agency',
    'AI consulting',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_CA',
    url: 'https://nexusai.ca',
    siteName: 'Nexus',
    title: 'Nexus — Self-Healing AI Agent Systems',
    description:
      'Your AI agents break. Ours heal themselves. Self-healing multi-agent pipelines that run 24/7.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nexus — Self-Healing AI Agent Systems',
    description: 'Your AI agents break. Ours heal themselves.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
