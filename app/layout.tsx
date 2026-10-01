import type { Metadata } from 'next';
import { Amiri, Fraunces, Inter } from 'next/font/google';
import { AuthProvider } from '@/app/components/AuthProvider';
import { THEME_INIT_SCRIPT, ThemeProvider } from '@/app/components/ThemeProvider';
import { Navbar } from '@/app/components/Navbar';
import { Footer } from '@/app/components/Footer';
import { Aurora } from '@/app/components/Aurora';
import './globals.css';

// Self-hosted at build time: no request to Google, and metric-matched fallbacks
// keep text from jumping when the real face arrives.
const display = Fraunces({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const arabic = Amiri({ subsets: ['arabic'], weight: ['400', '700'], variable: '--font-arabic', display: 'swap' });

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Fiqah — Shia rulings from the maraji, searchable',
    template: '%s · Fiqah',
  },
  description:
    'Search published rulings from Shia maraji, ask questions in plain language, and find Qibla and Jafari prayer times for your location.',
  openGraph: { siteName: 'Fiqah', type: 'website' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${display.variable} ${sans.variable} ${arabic.variable}`}
    >
      <head>
        {/* Applies the saved theme before first paint, avoiding a dark flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen">
        <ThemeProvider>
          <AuthProvider>
            <Aurora />
            <Navbar />
            <div className="pt-20">{children}</div>
            <Footer />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
