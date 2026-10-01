import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy — Shia Fiqh',
  description: 'What data Fiqah collects, why, who processes it, and how to have it deleted.',
};

const LAST_UPDATED = '1 October 2026';
const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: 'The short version',
    body: (
      <ul className="list-disc space-y-2 pl-5">
        <li>No advertising, no tracking cookies, no analytics scripts, and we never sell data.</li>
        <li>An account needs only an email and a password. We never see or store your password.</li>
        <li>The questions you ask are answered and then discarded — they are not saved to our database.</li>
        <li>Your location is used only to work out prayer times and the Qibla, and is kept on your own device.</li>
      </ul>
    ),
  },
  {
    title: 'Your account',
    body: (
      <>
        <p>
          Signing up stores your email address and a one-way hash of your password with our authentication provider,
          Supabase. Passwords are hashed with bcrypt before they are stored, so neither we nor Supabase can read them.
          Supabase also records when you signed up and last signed in.
        </p>
        <p>
          Your signed-in session is kept in your browser&rsquo;s local storage, not in a cookie, and is removed when you
          sign out.
        </p>
      </>
    ),
  },
  {
    title: 'Questions and searches',
    body: (
      <p>
        When you ask a question or search the corpus, the text is sent to our server, matched against the rulings
        library, and passed to Google&rsquo;s Gemini API to write and rank the answer. We do not store your questions or
        the answers. Google processes the text under its{' '}
        <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noopener noreferrer" className="text-gold-200 hover:underline">
          Gemini API terms
        </a>
        . Please avoid typing personal details you would not want a third party to process.
      </p>
    ),
  },
  {
    title: 'Location',
    body: (
      <>
        <p>
          Prayer times and the Qibla need to know roughly where you are. By default we estimate your city from your IP
          address using ipwho.is or GeoJS, so no permission prompt is needed. If you allow it, your browser&rsquo;s precise
          location is used instead, and you can also pick a city by hand.
        </p>
        <p>
          Coordinates are sent to our server only to look up prayer times (Aladhan), city names (OpenStreetMap
          Nominatim) and city search results (Open-Meteo). The location you choose is remembered in your browser&rsquo;s
          local storage so you don&rsquo;t have to set it again; we do not keep it.
        </p>
      </>
    ),
  },
  {
    title: 'Technical data',
    body: (
      <p>
        To stop abuse, the server counts requests per IP address in memory for about a minute and then forgets them. Our
        hosting provider keeps standard request logs (IP address, time, page requested) for security and debugging.
        Your light/dark theme choice is stored in local storage on your device.
      </p>
    ),
  },
  {
    title: 'Security',
    body: (
      <p>
        All traffic is encrypted with HTTPS. Database access is restricted with row-level security so the public can only
        read the published rulings library, and administrative functions require a verified admin session.
      </p>
    ),
  },
  {
    title: 'Your choices',
    body: (
      <>
        <p>
          You can use search, the rulings library, prayer times and the Qibla without an account. You can clear
          locally stored settings at any time through your browser&rsquo;s site-data settings.
        </p>
        <p>
          To get a copy of your account data or have your account deleted,{' '}
          {CONTACT_EMAIL ? (
            <>
              email{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-gold-200 hover:underline">
                {CONTACT_EMAIL}
              </a>{' '}
              from the address you signed up with
            </>
          ) : (
            'contact the site administrator from the address you signed up with'
          )}
          . We will act on the request within 30 days.
        </p>
      </>
    ),
  },
  {
    title: 'Changes',
    body: <p>If this policy changes, the date at the top of this page will change with it.</p>,
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
      <Link href="/" className="text-sm text-gold-200 hover:underline">
        ← Home
      </Link>
      <h1 className="section-title mt-6">Privacy policy</h1>
      <p className="mt-4 text-sm text-white/45">Last updated {LAST_UPDATED}</p>

      <div className="mt-12 space-y-10">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="font-display text-xl font-bold text-white">{s.title}</h2>
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-white/65">{s.body}</div>
          </section>
        ))}
      </div>
    </main>
  );
}
