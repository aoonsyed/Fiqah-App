/**
 * Canonical taxonomy: 11 maraji/scholars, 10 main categories, 80+ subcategories.
 * Used by the seed generator and for static fallbacks when the DB is empty.
 */

export interface CatalogMarja {
  slug: string;
  nameEn: string;
  nameAr: string;
  era: 'contemporary' | 'classical' | 'historical';
  bioEn: string;
  orderIndex: number;
  websiteUrl?: string;
}

export interface CatalogSubcategory {
  slug: string;
  nameEn: string;
  nameAr: string;
  /** Target question count at full corpus scale */
  targetQuestions: number;
}

export interface CatalogCategory {
  slug: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  orderIndex: number;
  subcategories: CatalogSubcategory[];
}

export const MARAJI: CatalogMarja[] = [
  {
    slug: 'sistani',
    nameEn: 'Ayatollah Sayyid Ali al-Sistani',
    nameAr: 'السيد علي السistani',
    era: 'contemporary',
    bioEn: 'Marjaʿ in Najaf; widely followed on worship, transactions, and social conduct.',
    orderIndex: 1,
    websiteUrl: 'https://www.sistani.org',
  },
  {
    slug: 'khamenei',
    nameEn: 'Ayatollah Sayyid Ali Khamenei',
    nameAr: 'السيد علي خامنئي',
    era: 'contemporary',
    bioEn: 'Supreme Leader of Iran; publishes detailed risalah-style rulings.',
    orderIndex: 2,
  },
  {
    slug: 'al-khui',
    nameEn: 'Ayatollah Sayyid Abu al-Qasim al-Khui',
    nameAr: 'السيد أبو القاسم الخوئي',
    era: 'classical',
    bioEn: 'Leading Najaf marjaʿ of the 20th century; influential on usul and practical law.',
    orderIndex: 3,
  },
  {
    slug: 'makarem-shirazi',
    nameEn: 'Ayatollah Naser Makarem Shirazi',
    nameAr: 'آية الله ناصر مكارم شيرازي',
    era: 'contemporary',
    bioEn: 'Qom-based marjaʿ known for accessible risalah and contemporary masail.',
    orderIndex: 4,
  },
  {
    slug: 'javadi-amoli',
    nameEn: 'Ayatollah Abdullah Javadi Amoli',
    nameAr: 'آية الله عبد الله جوادي آملي',
    era: 'contemporary',
    bioEn: 'Scholar in Qom emphasizing ethics, worship, and social responsibility.',
    orderIndex: 5,
  },
  {
    slug: 'muhammad-ali-ansari',
    nameEn: 'Ayatollah Muhammad Ali Ansari',
    nameAr: 'آية الله محمد علي الأنصاري',
    era: 'contemporary',
    bioEn: 'Contemporary marjaʿ with detailed guidance on family and financial law.',
    orderIndex: 6,
  },
  {
    slug: 'waseem-shirazi',
    nameEn: 'Ayatollah Waseem Shirazi',
    nameAr: 'آية الله وسيم شيرازي',
    era: 'contemporary',
    bioEn: 'Marjaʿ addressing modern technology, media, and daily conduct.',
    orderIndex: 7,
  },
  {
    slug: 'al-majlisi',
    nameEn: 'Ayatollah Muhammad Baqir al-Majlisi',
    nameAr: 'محمد باقر المجلسي',
    era: 'classical',
    bioEn: 'Safavid-era jurist; Bihar al-Anwar compiler with extensive legal commentary.',
    orderIndex: 8,
  },
  {
    slug: 'hassan-nasrallah',
    nameEn: 'Sayyid Hassan Nasrallah',
    nameAr: 'السيد حسن نصر الله',
    era: 'historical',
    bioEn: 'Historical reference for resistance-era social and political ethics (corpus placeholder).',
    orderIndex: 9,
  },
  {
    slug: 'muhammad-tabraizi',
    nameEn: 'Ayatollah Muhammad Tabraizi',
    nameAr: 'آية الله محمد تبريزي',
    era: 'contemporary',
    bioEn: 'Contemporary rulings on medical ethics, fasting, and modern dilemmas.',
    orderIndex: 10,
  },
  {
    slug: 'muhammad-husayn-tabatabai',
    nameEn: 'Allamah Sayyid Muhammad Husayn Tabataba\'i',
    nameAr: 'العلامة السيد محمد حسين الطباطبائي',
    era: 'classical',
    bioEn:
      'Twentieth-century Qur\'an scholar and philosopher; author of Islamic Teachings in Brief and Tafsir al-Mizan. Teaching corpus here covers usul, ethics, and fiqh foundations — not a living marjaʿ for taqlid.',
    orderIndex: 11,
    websiteUrl: 'https://al-islam.org/person/sayyid-muhammad-husayn-tabatabai',
  },
];

export const CATEGORIES: CatalogCategory[] = [
  {
    slug: 'worship',
    nameEn: 'Worship',
    nameAr: 'العبادات',
    descriptionEn: 'Salah, fasting, hajj, purity, and devotional obligations.',
    orderIndex: 1,
    subcategories: [
      { slug: 'taharah', nameEn: 'Purification (Taharah)', nameAr: 'الطهارة', targetQuestions: 220 },
      { slug: 'salah', nameEn: 'Prayer (Salah)', nameAr: 'الصلاة', targetQuestions: 280 },
      { slug: 'fasting', nameEn: 'Fasting', nameAr: 'الصوم', targetQuestions: 200 },
      { slug: 'hajj-umrah', nameEn: 'Hajj & Umrah', nameAr: 'الحج والعمرة', targetQuestions: 180 },
      { slug: 'khums', nameEn: 'Khums', nameAr: 'الخمس', targetQuestions: 160 },
      { slug: 'zakat-sadaqa', nameEn: 'Zakat & Charity', nameAr: 'الزكاة والصدقة', targetQuestions: 140 },
      { slug: 'adhan-iqamah', nameEn: 'Adhan & Iqamah', nameAr: 'الأذان والإقامة', targetQuestions: 80 },
      { slug: 'jamaah-congregation', nameEn: 'Congregational Prayer', nameAr: 'صلاة الجماعة', targetQuestions: 120 },
      { slug: 'qibla-mihrab', nameEn: 'Qibla & Prayer Space', nameAr: 'القبلة ومكان الصلاة', targetQuestions: 90 },
      { slug: 'travel-prayer', nameEn: 'Travel & Prayer', nameAr: 'السفر والصلاة', targetQuestions: 110 },
      { slug: 'missed-prayers', nameEn: 'Missed Prayers (Qada)', nameAr: 'القضاء', targetQuestions: 150 },
      { slug: 'friday-prayer', nameEn: 'Friday Prayer', nameAr: 'صلاة الجمعة', targetQuestions: 100 },
      { slug: 'eid-prayers', nameEn: 'Eid Prayers', nameAr: 'صلاة العيد', targetQuestions: 70 },
      { slug: 'dhikr-dua', nameEn: 'Dhikr & Duʿa', nameAr: 'الذكر والدعاء', targetQuestions: 130 },
      { slug: 'mosque-etiquette', nameEn: 'Mosque Etiquette', nameAr: 'آداب المسجد', targetQuestions: 90 },
    ],
  },
  {
    slug: 'family-law',
    nameEn: 'Family Law',
    nameAr: 'الأحوال الشخصية',
    descriptionEn: 'Marriage, divorce, custody, inheritance, and kinship duties.',
    orderIndex: 2,
    subcategories: [
      { slug: 'marriage-contract', nameEn: 'Marriage Contract', nameAr: 'عقد الزواج', targetQuestions: 220 },
      { slug: 'mahr-marriage-dues', nameEn: 'Mahr & Marriage Dues', nameAr: 'المهر', targetQuestions: 140 },
      { slug: 'spousal-rights', nameEn: 'Spousal Rights', nameAr: 'حقوق الزوجين', targetQuestions: 200 },
      { slug: 'divorce-talaq', nameEn: 'Divorce', nameAr: 'الطلاق', targetQuestions: 210 },
      { slug: 'khula-mubarat', nameEn: 'Khulʿ & Mubarat', nameAr: 'الخلع والمباراة', targetQuestions: 120 },
      { slug: 'custody-nafaqah', nameEn: 'Custody & Nafaqah', nameAr: 'الحضانة والنفقة', targetQuestions: 190 },
      { slug: 'inheritance', nameEn: 'Inheritance', nameAr: 'المواريث', targetQuestions: 250 },
      { slug: 'wasiyyah', nameEn: 'Wills (Wasiyyah)', nameAr: 'الوصية', targetQuestions: 130 },
      { slug: 'adoption-lineage', nameEn: 'Adoption & Lineage', nameAr: 'التبني والنسب', targetQuestions: 110 },
      { slug: 'breastfeeding-rida', nameEn: 'Breastfeeding (Ridaʿ)', nameAr: 'الرضاع', targetQuestions: 90 },
      { slug: 'interfaith-marriage', nameEn: 'Interfaith Marriage', nameAr: 'زواج الكتابيات', targetQuestions: 100 },
      { slug: 'family-mediation', nameEn: 'Family Mediation', nameAr: 'الصلح الأسري', targetQuestions: 80 },
    ],
  },
  {
    slug: 'financial-law',
    nameEn: 'Financial Law',
    nameAr: 'المعاملات',
    descriptionEn: 'Trade, riba, contracts, debt, and commercial ethics.',
    orderIndex: 3,
    subcategories: [
      { slug: 'sale-purchase', nameEn: 'Sale & Purchase', nameAr: 'البيع والشراء', targetQuestions: 280 },
      { slug: 'riba-interest', nameEn: 'Riba & Interest', nameAr: 'الربا', targetQuestions: 220 },
      { slug: 'partnership-mudarabah', nameEn: 'Partnership & Mudarabah', nameAr: 'الشركة والمضاربة', targetQuestions: 180 },
      { slug: 'leasing-ijarah', nameEn: 'Leasing (Ijarah)', nameAr: 'الإجارة', targetQuestions: 160 },
      { slug: 'debt-qard', nameEn: 'Debt & Qard', nameAr: 'الدين والقرض', targetQuestions: 200 },
      { slug: 'bankruptcy-insolvency', nameEn: 'Insolvency', nameAr: 'الإفلاس', targetQuestions: 120 },
      { slug: 'guarantee-warranty', nameEn: 'Guarantee & Warranty', nameAr: 'الضمان والكفالة', targetQuestions: 140 },
      { slug: 'gambling-speculation', nameEn: 'Gambling & Speculation', nameAr: 'القمار والمضاربة المحرمة', targetQuestions: 150 },
    ],
  },
  {
    slug: 'personal-conduct',
    nameEn: 'Personal Conduct',
    nameAr: 'الأخلاق والسلوك',
    descriptionEn: 'Adab, dress, food, social interaction, and daily habits.',
    orderIndex: 4,
    subcategories: [
      { slug: 'dress-hijab', nameEn: 'Dress & Hijab', nameAr: 'اللباس والحجاب', targetQuestions: 200 },
      { slug: 'food-drink', nameEn: 'Food & Drink', nameAr: 'الأطعمة والأشربة', targetQuestions: 220 },
      { slug: 'music-entertainment', nameEn: 'Music & Entertainment', nameAr: 'الغناء والترفيه', targetQuestions: 180 },
      { slug: 'friendship-mixing', nameEn: 'Friendship & Mixing', nameAr: 'الاختلاط والصداقة', targetQuestions: 160 },
      { slug: 'lying-backbiting', nameEn: 'Truthfulness & Ghiba', nameAr: 'الصدق والغيبة', targetQuestions: 140 },
      { slug: 'work-ethics', nameEn: 'Work Ethics', nameAr: 'أخلاقيات العمل', targetQuestions: 150 },
      { slug: 'travel-adab', nameEn: 'Travel Adab', nameAr: 'آداب السفر', targetQuestions: 100 },
      { slug: 'home-neighbors', nameEn: 'Neighbors & Home', nameAr: 'الجيران والمنزل', targetQuestions: 110 },
    ],
  },
  {
    slug: 'medical-health',
    nameEn: 'Medical & Health',
    nameAr: 'الطب والصحة',
    descriptionEn: 'Treatment, fasting exemptions, organ donation, and end-of-life.',
    orderIndex: 5,
    subcategories: [
      { slug: 'medical-treatment', nameEn: 'Medical Treatment', nameAr: 'العلاج', targetQuestions: 220 },
      { slug: 'fasting-exemptions', nameEn: 'Fasting Exemptions', nameAr: 'استثناءات الصوم', targetQuestions: 180 },
      { slug: 'organ-donation', nameEn: 'Organ Donation', nameAr: 'التبرع بالأعضاء', targetQuestions: 140 },
      { slug: 'abortion-reproduction', nameEn: 'Reproduction & Abortion', nameAr: 'الإنجاب والإجهاض', targetQuestions: 200 },
      { slug: 'mental-health', nameEn: 'Mental Health', nameAr: 'الصحة النفسية', targetQuestions: 130 },
      { slug: 'autopsy-death', nameEn: 'Death & Autopsy', nameAr: 'الموت والتشريح', targetQuestions: 120 },
    ],
  },
  {
    slug: 'technology-modern',
    nameEn: 'Technology & Modern Life',
    nameAr: 'التقنية والحياة المعاصرة',
    descriptionEn: 'Digital media, AI, finance apps, and contemporary tools.',
    orderIndex: 6,
    subcategories: [
      { slug: 'social-media', nameEn: 'Social Media', nameAr: 'وسائل التواصل', targetQuestions: 200 },
      { slug: 'photography-video', nameEn: 'Photography & Video', nameAr: 'التصوير والفيديو', targetQuestions: 160 },
      { slug: 'cryptocurrency', nameEn: 'Cryptocurrency', nameAr: 'العملات الرقمية', targetQuestions: 140 },
      { slug: 'online-commerce', nameEn: 'Online Commerce', nameAr: 'التجارة الإلكترونية', targetQuestions: 180 },
      { slug: 'artificial-intelligence', nameEn: 'Artificial Intelligence', nameAr: 'الذكاء الاصطناعي', targetQuestions: 120 },
      { slug: 'remote-work', nameEn: 'Remote Work', nameAr: 'العمل عن بعد', targetQuestions: 100 },
    ],
  },
  {
    slug: 'social-political',
    nameEn: 'Social & Political',
    nameAr: 'الاجتماع والسياسة',
    descriptionEn: 'Citizenship, justice, war, peace, and community duties.',
    orderIndex: 7,
    subcategories: [
      { slug: 'citizenship-law', nameEn: 'Citizenship & Law', nameAr: 'المواطنة والقانون', targetQuestions: 160 },
      { slug: 'justice-testimony', nameEn: 'Justice & Testimony', nameAr: 'العدالة والشهادة', targetQuestions: 140 },
      { slug: 'war-defense', nameEn: 'War & Defense', nameAr: 'الجهاد والدفاع', targetQuestions: 180 },
      { slug: 'migration-refugees', nameEn: 'Migration & Refugees', nameAr: 'الهجرة واللاجئون', targetQuestions: 120 },
      { slug: 'community-leadership', nameEn: 'Community Leadership', nameAr: 'قيادة المجتمع', targetQuestions: 100 },
    ],
  },
  {
    slug: 'economics',
    nameEn: 'Economics',
    nameAr: 'الاقتصاد',
    descriptionEn: 'Zakat economics, public finance, labor, and welfare.',
    orderIndex: 8,
    subcategories: [
      { slug: 'labor-wages', nameEn: 'Labor & Wages', nameAr: 'العمل والأجور', targetQuestions: 180 },
      { slug: 'public-welfare', nameEn: 'Public Welfare', nameAr: 'الرعاية الاجتماعية', targetQuestions: 140 },
      { slug: 'taxation-state', nameEn: 'Taxation & State', nameAr: 'الضرائب والدولة', targetQuestions: 160 },
      { slug: 'natural-resources', nameEn: 'Natural Resources', nameAr: 'الموارد الطبيعية', targetQuestions: 120 },
      { slug: 'economic-justice', nameEn: 'Economic Justice', nameAr: 'العدالة الاقتصادية', targetQuestions: 100 },
    ],
  },
  {
    slug: 'judicial-procedure',
    nameEn: 'Judicial Procedure',
    nameAr: 'القضاء والإجراءات',
    descriptionEn: 'Courts, evidence, oaths, and dispute resolution.',
    orderIndex: 9,
    subcategories: [
      { slug: 'evidence-burden', nameEn: 'Evidence & Burden of Proof', nameAr: 'البينة والإثبات', targetQuestions: 150 },
      { slug: 'oaths-qasam', nameEn: 'Oaths (Qasam)', nameAr: 'اليمين', targetQuestions: 120 },
      { slug: 'arbitration-tahkim', nameEn: 'Arbitration', nameAr: 'التحكيم', targetQuestions: 100 },
      { slug: 'judges-qualification', nameEn: 'Judges & Qualification', nameAr: 'القاضي وأهليته', targetQuestions: 90 },
      { slug: 'penal-sanctions', nameEn: 'Penal Sanctions', nameAr: 'العقوبات', targetQuestions: 110 },
    ],
  },
  {
    slug: 'usul-principles',
    nameEn: 'Legal Principles (Usul)',
    nameAr: 'أصول الفقه',
    descriptionEn: 'Foundational principles applied across domains.',
    orderIndex: 10,
    subcategories: [
      { slug: 'taqlid-ijtihad', nameEn: 'Taqlid & Ijtihad', nameAr: 'التقليد والاجتهاد', targetQuestions: 120 },
      { slug: 'istishab-precaution', nameEn: 'Istishab & Precaution', nameAr: 'الاستصحاب والاحتياط', targetQuestions: 100 },
      { slug: 'hierarchy-evidence', nameEn: 'Hierarchy of Evidence', nameAr: 'ترتيب الأدلة', targetQuestions: 90 },
      { slug: 'custom-urf', nameEn: 'Custom (Urf)', nameAr: 'العرف', targetQuestions: 80 },
      { slug: 'conflict-rules', nameEn: 'Conflict of Evidences', nameAr: 'تعارض الأدلة', targetQuestions: 80 },
      { slug: 'language-terms', nameEn: 'Legal Terms', nameAr: 'الاصطلاحات', targetQuestions: 70 },
      { slug: 'fatwa-change', nameEn: 'Changing Fatwas', nameAr: 'تغير الفتوى', targetQuestions: 60 },
    ],
  },
];

export const LEGAL_PRINCIPLES: Array<{
  slug: string;
  nameEn: string;
  nameAr: string;
  explanationEn: string;
  relatedCategorySlugs: string[];
  orderIndex: number;
}> = [
  {
    slug: 'taharat-al-yaqin',
    nameEn: 'Certainty is not removed by doubt',
    nameAr: 'اليقين لا يزول بالشك',
    explanationEn: 'When a state is known with certainty, subsequent doubt does not overturn it unless verified.',
    relatedCategorySlugs: ['worship', 'usul-principles'],
    orderIndex: 1,
  },
  {
    slug: 'al-mashaqqa-tajlib-al-taysir',
    nameEn: 'Hardship brings ease',
    nameAr: 'المشقة تجلب التيسير',
    explanationEn: 'Severe difficulty can justify concessions where the law provides relief (rukhsah).',
    relatedCategorySlugs: ['worship', 'medical-health'],
    orderIndex: 2,
  },
  {
    slug: 'la-darar-wala-dirar',
    nameEn: 'No harm, no reciprocal harm',
    nameAr: 'لا ضرر ولا ضرار',
    explanationEn: 'Actions that cause unjust harm to oneself or others are prohibited or restricted.',
    relatedCategorySlugs: ['personal-conduct', 'medical-health', 'financial-law'],
    orderIndex: 3,
  },
  {
    slug: 'al-ibaha-al-asliyya',
    nameEn: 'Original permissibility',
    nameAr: 'الإباحة الأصلية',
    explanationEn: 'Worldly acts are permissible unless evidence establishes prohibition or obligation.',
    relatedCategorySlugs: ['personal-conduct', 'technology-modern'],
    orderIndex: 4,
  },
  {
    slug: 'al-wilaya',
    nameEn: 'Guardianship (Wilaya)',
    nameAr: 'الولاية',
    explanationEn: 'Authority over minors, dependents, and certain property follows defined sharʿi limits.',
    relatedCategorySlugs: ['family-law'],
    orderIndex: 5,
  },
];

/** Subcategory count across the catalog (80+). */
export function catalogSubcategoryCount(): number {
  return CATEGORIES.reduce((n, c) => n + c.subcategories.length, 0);
}

/** Full-scale question target (~15k+). */
export function catalogQuestionTarget(): number {
  return CATEGORIES.reduce(
    (n, c) => n + c.subcategories.reduce((s, sub) => s + sub.targetQuestions, 0),
    0,
  );
}
