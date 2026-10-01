import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { QuestionView } from '@/app/components/QuestionView';
import { errorMessage } from '@/lib/errors';
import { getQuestionBySlug, listFatwasForQuestion } from '@/lib/fiqh/db';
import { formatFatwaDisplay, pickPrimaryOfficialFatwa } from '@/lib/fiqh/format-fatwa-display';
import { questionHeading } from '@/lib/fiqh/question-heading';

// Rulings change only on re-import; each page is rendered on first visit and cached.
export const revalidate = 3600;

type Params = { params: Promise<{ slug: string }> };

/**
 * Shared by generateMetadata and the page (React dedupes the call per request).
 * null = no such question; undefined = database unreachable, so the client retries.
 */
const loadQuestion = cache(async (slug: string) => {
  try {
    const question = await getQuestionBySlug(slug);
    if (!question) return null;
    return { question, fatwas: await listFatwasForQuestion(question.id) };
  } catch (error) {
    console.error(`Masail ${slug} unavailable:`, errorMessage(error));
    return undefined;
  }
});

const truncate = (text: string, max: number) =>
  text.length <= max ? text : `${text.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const slug = decodeURIComponent((await params).slug);
  const data = await loadQuestion(slug);
  if (!data) return { title: 'Ruling' };

  const { question, fatwas } = data;
  const primary = pickPrimaryOfficialFatwa(fatwas);
  const heading = questionHeading(question.questionEn).heading;
  const marja = primary?.marja?.nameEn.replace(/^(Grand\s+)?(Ayatollah|Allamah)\s+(Sayyid\s+)?/i, '');
  const answer = primary ? formatFatwaDisplay(primary, question.questionEn) : null;

  return {
    title: truncate(marja ? `${heading} — ${marja}` : heading, 90),
    description: truncate(answer?.rulingText || primary?.answerEn || question.questionEn, 160),
    alternates: { canonical: `/masail/${encodeURIComponent(slug)}` },
    // Placeholder-only pages aren't a marja's ruling; keep them out of search results.
    robots: primary ? undefined : { index: false, follow: true },
  };
}

export default async function MasailPage({ params }: Params) {
  const slug = decodeURIComponent((await params).slug);
  const data = await loadQuestion(slug);
  if (data === null) notFound();
  return <QuestionView slug={slug} initial={data} />;
}
