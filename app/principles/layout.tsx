import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Usul & legal principles',
  description: 'Foundational principles of Shia jurisprudence applied across fiqh rulings.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
