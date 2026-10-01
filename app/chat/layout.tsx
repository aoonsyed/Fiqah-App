import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ask a fiqh question',
  description: 'Ask about Shia fiqh in plain language. Answers come from published marja rulings, with citations to the book and issue.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
