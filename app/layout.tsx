import type { Metadata } from 'next';
import { AuthProvider } from '@/app/components/AuthProvider';
import { THEME_INIT_SCRIPT, ThemeProvider } from '@/app/components/ThemeProvider';
import { Navbar } from '@/app/components/Navbar';
import { Footer } from '@/app/components/Footer';
import { Aurora } from '@/app/components/Aurora';
import './globals.css';

export const metadata: Metadata = {
  title: 'Shia Fiqh — Comparative Marja Corpus',
  description:
    'Compare Shia fiqh masail, ask grounded questions, and find Qibla and Jafari prayer times for your location.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
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
