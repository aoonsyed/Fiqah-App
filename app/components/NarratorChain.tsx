'use client';

import React from 'react';
import { chainOf, type ChainRoute, type LinkKind } from '@/lib/rag/isnad';

/** How each narrator received the report from the one after them. */
const LINK_LABEL: Record<LinkKind, string> = {
  narrated: 'narrated to him by',
  from: 'from',
  heard: 'heard it from',
  raised: 'raising it to',
  read: 'read it to',
};

/**
 * The chain of transmission drawn as people, not a block of Arabic: who
 * narrated to whom, ending at the Imam or Prophet. Chains that reach us by
 * more than one route ("ح") are shown as separate routes.
 */
export function NarratorChain({ isnadRaw, matnArabic }: { isnadRaw?: string; matnArabic?: string }) {
  const routes = chainOf(isnadRaw, matnArabic);
  const raw = isnadRaw?.trim();

  if (!routes.length && !raw) return null;

  const heading = (
    <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-300/80">
      Chain of narrators · Isnad
    </h3>
  );

  if (!routes.length) {
    // Parsing failed but the chain text exists — never hide the source wording.
    return (
      <section>
        {heading}
        <p className="mt-3 rounded-xl border border-white/8 bg-white/[0.03] p-4 font-arabic text-sm leading-loose text-white/65" dir="rtl">
          {raw}
        </p>
      </section>
    );
  }

  return (
    <section>
      {heading}
      <div className="mt-3 space-y-5">
        {routes.map((route, i) => (
          <Route key={i} route={route} index={i} total={routes.length} />
        ))}
      </div>
      {!raw && (
        <p className="mt-2 text-[11px] text-white/30">
          Read from the narration text; the source stored chain and report as one block.
        </p>
      )}
    </section>
  );
}

function Route({ route, index, total }: { route: ChainRoute; index: number; total: number }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
      {total > 1 && (
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
          Route {index + 1} of {total}
        </p>
      )}

      <ol className="space-y-0">
        {route.steps.map((step, i) => (
          <li key={i} className="relative pl-7">
            {/* Connector line to the next narrator */}
            {i < route.steps.length - 1 && (
              <span className="absolute left-[9px] top-6 h-[calc(100%-1rem)] w-px bg-gradient-to-b from-gold-300/40 to-white/10" />
            )}

            <span className="absolute left-0 top-1.5 grid h-[19px] w-[19px] place-items-center rounded-full border border-gold-300/35 bg-gold-300/10 text-[10px] font-bold text-gold-200">
              {i + 1}
            </span>

            <div className="pb-4">
              {i > 0 && (
                <span className="block text-[10px] uppercase tracking-[0.12em] text-white/30">
                  {LINK_LABEL[step.link]}
                </span>
              )}
              <span className="font-arabic text-base leading-relaxed text-white/85" dir="rtl">
                {step.name}
              </span>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-1 border-t border-white/8 pt-3 text-[11px] text-white/30">
        {route.steps.length} narrators · read top to bottom, from the collector back to the source
      </p>
    </div>
  );
}
