import type { Metadata } from 'next';
import { AuthProvider } from '@/app/components/AuthProvider';
import { THEME_INIT_SCRIPT, ThemeProvider } from '@/app/components/ThemeProvider';
import { Navbar } from '@/app/components/Navbar';
import { Footer } from '@/app/components/Footer';
import { Aurora } from '@/app/components/Aurora';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fiqah — Comparative Shia Fiqh',
  description:
    'Compare Shia fiqh masail across maraji, ask grounded questions, and find Qibla and Jafari prayer times.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen font-sans">
        <ThemeProvider>
          <AuthProvider>
            <Aurora />
            <Navbar />
            <div className="pt-[4.25rem]">{children}</div>
            <Footer />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
