import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500', '600'],
});

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
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
