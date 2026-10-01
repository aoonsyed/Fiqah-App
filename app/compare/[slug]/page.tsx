import type { Metadata } from 'next';
import { cache } from 'react';
import { CompareView } from '@/app/components/CompareView';
import { getQuestionBySlug } from '@/lib/fiqh/db';
import { questionHeading } from '@/lib/fiqh/question-heading';

const loadQuestion = cache((slug: string) => getQuestionBySlug(slug).catch(() => null));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = decodeURIComponent((await params).slug);
  const question = await loadQuestion(slug);
  if (!question) return { title: 'Compare maraji' };
  return {
    title: `Compare maraji: ${questionHeading(question.questionEn).heading.slice(0, 70)}`,
    description: 'How each marja answers this question, side by side, with the source of every answer.',
    // The canonical home of a question is its masail page.
    alternates: { canonical: `/masail/${encodeURIComponent(slug)}` },
  };
}

export default function ComparePage() {
  return <CompareView />;
}
