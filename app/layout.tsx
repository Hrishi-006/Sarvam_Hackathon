import type { Metadata } from 'next';
import { Bricolage_Grotesque, Inter, Mukta, Yatra_One } from 'next/font/google';
import { KeyBanner } from './components/KeyBanner';
import './globals.css';

const bricolage = Bricolage_Grotesque({
  variable: '--font-bricolage',
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
});

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const yatra = Yatra_One({
  variable: '--font-yatra',
  subsets: ['devanagari', 'latin'],
  weight: '400',
});

const mukta = Mukta({
  variable: '--font-mukta',
  subsets: ['devanagari', 'latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'The Haggler — Colaba ka local price, ab sabke liye',
  description:
    'A voice bargaining copilot for Colaba Causeway. Hold up your phone while the shopkeeper talks — it listens, counters, and knows when to walk away, in Hindi or Marathi.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${inter.variable} ${yatra.variable} ${mukta.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <KeyBanner />
        {children}
      </body>
    </html>
  );
}
