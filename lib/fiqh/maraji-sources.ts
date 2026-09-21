/**
 * Official / scrapeable sources for growing the comparative corpus.
 * Status reflects typical import path in this repo (not live DB counts).
 */

export type MarjaSourceStatus = 'imported' | 'partial' | 'comparative_seed' | 'planned';

export interface MarjaSourceRecord {
  catalogSlug: string;
  nameEn: string;
  status: MarjaSourceStatus;
  sources: Array<{ label: string; url: string; lang: string; notes?: string }>;
  importScript?: string;
}

export const MARAJI_SOURCE_CATALOG: MarjaSourceRecord[] = [
  {
    catalogSlug: 'sistani',
    nameEn: 'Ayatollah al-Sistani',
    status: 'imported',
    sources: [
      { label: 'Tauzeeh ul Masail (Urdu)', url: 'https://www.sistani.org/urdu/book/61/', lang: 'ur' },
      { label: 'Islamic Laws (English)', url: 'https://www.sistani.org/english/book/48/', lang: 'en' },
    ],
    importScript: 'fiqh:import (Urdu), fiqh:expand (English)',
  },
  {
    catalogSlug: 'khamenei',
    nameEn: 'Ayatollah Khamenei',
    status: 'imported',
    sources: [
      { label: 'Practical Laws EPUB', url: 'https://www.leader.ir/en/book/32/Practical-Laws-of-Islam', lang: 'en' },
    ],
    importScript: 'fiqh:import',
  },
  {
    catalogSlug: 'makarem-shirazi',
    nameEn: 'Ayatollah Makarem Shirazi',
    status: 'partial',
    sources: [
      { label: 'English istifta & treatise', url: 'https://makaremshirazi.ir/ahkam/en/home/index', lang: 'en' },
      { label: 'Persian ahkam portal', url: 'https://ahkam.makarem.ir/', lang: 'fa' },
    ],
    importScript: 'fiqh:expand (makarem), fiqh:seed-maraji',
  },
  {
    catalogSlug: 'al-khui',
    nameEn: 'Ayatollah al-Khui',
    status: 'comparative_seed',
    sources: [
      { label: 'Minhaj al-Salihin summaries (al-islam)', url: 'https://al-islam.org/person/al-sayyid-abu-l-qasim-al-musawi-al-khui', lang: 'en' },
    ],
    importScript: 'fiqh:seed-maraji; needs curl for al-islam scrape',
  },
  {
    catalogSlug: 'muhammad-husayn-tabatabai',
    nameEn: 'Allamah Tabataba\'i',
    status: 'partial',
    sources: [
      { label: 'Islamic Teachings in Brief', url: 'https://al-islam.org/islamic-teachings-brief-sayyid-muhammad-husayn-tabatabai', lang: 'en' },
    ],
    importScript: 'fiqh:expand (tabatabai teachings)',
  },
  {
    catalogSlug: 'javadi-amoli',
    nameEn: 'Ayatollah Javadi Amoli',
    status: 'comparative_seed',
    sources: [{ label: 'Official site', url: 'https://www.javadiamoli.com/', lang: 'fa' }],
    importScript: 'fiqh:seed-maraji',
  },
  {
    catalogSlug: 'muhammad-ali-ansari',
    nameEn: 'Ayatollah Muhammad Ali Ansari',
    status: 'comparative_seed',
    sources: [{ label: 'Office istifta', url: 'https://alansari.ir/', lang: 'fa' }],
    importScript: 'fiqh:seed-maraji',
  },
  {
    catalogSlug: 'waseem-shirazi',
    nameEn: 'Ayatollah Waseem Shirazi',
    status: 'comparative_seed',
    sources: [{ label: 'Official English', url: 'https://waseemshirazi.com/en', lang: 'en' }],
    importScript: 'planned: scrape EN istifta',
  },
  {
    catalogSlug: 'muhammad-tabraizi',
    nameEn: 'Ayatollah Muhammad Tabraizi',
    status: 'comparative_seed',
    sources: [{ label: 'Office', url: 'https://tabrizi.org/', lang: 'fa' }],
    importScript: 'fiqh:seed-maraji',
  },
  {
    catalogSlug: 'al-majlisi',
    nameEn: 'Ayatollah al-Majlisi',
    status: 'comparative_seed',
    sources: [{ label: 'Classical reference (Bihar excerpts)', url: 'https://al-islam.org/person/muhammad-baqir-majlisi', lang: 'en' }],
    importScript: 'historical frame only',
  },
  {
    catalogSlug: 'hassan-nasrallah',
    nameEn: 'Sayyid Hassan Nasrallah',
    status: 'comparative_seed',
    sources: [{ label: 'Ethics speeches (not risalah)', url: 'https://english.almanar.com.lb/', lang: 'en' }],
    importScript: 'placeholder corpus',
  },
];

/** Deepen imports for maraji already in MARAJI — run expand-existing-maraji, not new catalog rows. */
export const DEEPEN_IMPORT_HINTS = [
  { catalogSlug: 'makarem-shirazi', action: 'fiqh:expand-existing (--deep) — EN + FA ahkam site' },
  { catalogSlug: 'sistani', action: 'fiqh:expand-existing — English book 48; Urdu via fiqh:import' },
  { catalogSlug: 'khamenei', action: 'fiqh:expand-existing — leader.ir EPUB incremental' },
  { catalogSlug: 'waseem-shirazi', action: 'fiqh:expand-existing --extend-generated when site unreachable' },
];
