import type { Metadata } from 'next';
import { AuthProvider } from '@/app/components/AuthProvider';
import { Navbar } from '@/app/components/Navbar';
import { Footer } from '@/app/components/Footer';
import { Aurora } from '@/app/components/Aurora';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nūr — Shia Hadith Library',
  description: 'Ask questions of the Shia hadith corpus and get answers traced to their chain of narration.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen">
        <AuthProvider>
          <Aurora />
          <Navbar />
          <div className="pt-20">{children}</div>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
