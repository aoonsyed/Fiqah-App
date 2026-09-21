/**
 * Fiqh-adjacent teaching points attributed to Allamah Sayyid Muhammad Husayn Tabataba'i
 * (Islamic Teachings in Brief; usul and ethics of worship). Short paraphrases for search/RAG —
 * not a marjaʿ taqlid code; verify detailed ahkam with your living marjaʿ.
 */
export interface TabatabaiTeaching {
  number: string;
  chapter: string;
  questionEn: string;
  answerEn: string;
}

export const TABATABAI_TEACHINGS: TabatabaiTeaching[] = [
  {
    number: '1',
    chapter: 'Taqlid and Ijtihad',
    questionEn: 'Why does Islam require learning religious laws rather than relying on ignorance?',
    answerEn:
      'Islam obliges Muslims to learn the religious teachings needed for belief and practice. The sources are the Qur’an and the reports of the Prophet and the infallible Imams. One who derives rulings through qualified study is a mujtahid; one who follows a mujtahid in practice performs taqlid. Belief (usul al-din) cannot be taken by blind imitation of others in the same way as everyday transactions.',
  },
  {
    number: '2',
    chapter: 'Taqlid and Ijtihad',
    questionEn: 'Who may a muqallid follow for practical laws?',
    answerEn:
      'A muqallid should refer to a living, just, and fully qualified mujtahid who is a marjaʿ of taqlid, or to the most knowledgeable among available jurists according to the evidence one can obtain. The goal is to practice the shariʿah with confidence that the rulings are soundly derived.',
  },
  {
    number: '3',
    chapter: 'Shariʿah and society',
    questionEn: 'How does Islamic law relate to human nature and society?',
    answerEn:
      'The shariʿah is a permanent divine program aligned with human nature (fiṭrah) and the stable needs of the species. Its fixed rules guide worship, ethics, and transactions toward felicity in this world and the next. Regulations that change with technology or social conditions are distinct from these fixed laws and are handled within the framework Islam provides for governance and ijtihad.',
  },
  {
    number: '4',
    chapter: 'Worship',
    questionEn: 'What is the purpose of worship in Islam?',
    answerEn:
      'Worship connects the human being to Allah, disciplines the soul, and orders social life. It is not mere ritual: prayer, fasting, hajj, and similar acts cultivate awareness of God, justice, and responsibility toward others.',
  },
  {
    number: '5',
    chapter: 'Taharah',
    questionEn: 'Why does Islam emphasize purity before prayer?',
    answerEn:
      'Physical and spiritual purity (taharah) prepares the worshipper for presence before God. Laws of wudu, ghusl, and removal of impurity are linked to dignity of worship and health; they are part of the rational structure of the shariʿah, not arbitrary customs.',
  },
  {
    number: '6',
    chapter: 'Salah',
    questionEn: 'What role does congregational prayer play?',
    answerEn:
      'Salah in congregation, when conditions are met, strengthens unity and public witness to faith. Islam encourages jamaʿah where it does not cause hardship, while preserving the validity of individual prayer when participation is not possible.',
  },
  {
    number: '7',
    chapter: 'Fasting',
    questionEn: 'What is the wisdom of fasting in Ramadan?',
    answerEn:
      'Fasting cultivates self-restraint, empathy for the poor, and gratitude for sustenance. Its rules define who must fast, valid exemptions, and how to make up or compensate missed days — balancing mercy with discipline.',
  },
  {
    number: '8',
    chapter: 'Hajj',
    questionEn: 'Why is hajj obligatory once for those who are able?',
    answerEn:
      'Hajj is the collective manifestation of monotheism and the legacy of Ibrahim and the Prophet Muhammad. Ability includes physical and financial means without destroying one’s livelihood; the obligation is deferred until ability exists.',
  },
  {
    number: '9',
    chapter: 'Khums and finance',
    questionEn: 'How does khums relate to social justice in Islam?',
    answerEn:
      'Khums on certain gains supports religious knowledge, the needy, and public welfare. It prevents wealth from stagnating among the few and ties economic success to responsibility toward the community and the household of the Prophet.',
  },
  {
    number: '10',
    chapter: 'Transactions',
    questionEn: 'What ethical principle governs trade in Islam?',
    answerEn:
      'Trade must be honest, free of riba and deceit, and respectful of others’ property. Contracts are binding when valid conditions are met; Islam prohibits exploitation and enjoins fulfilling obligations and fair dealing.',
  },
  {
    number: '11',
    chapter: 'Marriage and family',
    questionEn: 'What is the Islamic view of marriage as an institution?',
    answerEn:
      'Marriage is a covenant of affection, mercy, and mutual rights. Laws of mahr, maintenance, and fairness protect both spouses and children. Family stability is treated as a pillar of a healthy society.',
  },
  {
    number: '12',
    chapter: 'Ethics',
    questionEn: 'How are ethics related to fiqh?',
    answerEn:
      'Fiqh specifies boundaries of lawful and unlawful acts; ethics (akhlaq) perfects intention and character inside those boundaries. A outwardly valid act without sincerity or justice fails the spirit of the shariʿah.',
  },
  {
    number: '13',
    chapter: 'Enjoining good',
    questionEn: 'When is commanding right and forbidding wrong obligatory?',
    answerEn:
      'It is required when one has knowledge, likely benefit, and no greater harm — using the gradation of hand, tongue, and heart. The duty is collective but must be exercised with wisdom and without arrogance.',
  },
  {
    number: '14',
    chapter: 'Politics and wilayah',
    questionEn: 'What is the relationship between religion and just governance?',
    answerEn:
      'Islam expects authority to uphold justice, prayer, and public good. Wilayah in its broad sense includes recognizing legitimate leadership that implements the shariʿah’s social aims while leaving detailed ijtihad to qualified jurists.',
  },
  {
    number: '15',
    chapter: 'Knowledge',
    questionEn: 'Why does Islam prioritize seeking knowledge?',
    answerEn:
      'Seeking beneficial knowledge — especially of religion — is a lifelong duty. Ignorance of necessary beliefs or practices is not excused when reasonable means exist to learn from qualified teachers and reliable books.',
  },
  {
    number: '16',
    chapter: 'Taqlid and Ijtihad',
    questionEn: 'Can every Muslim perform ijtihad independently?',
    answerEn:
      'Ijtihad requires mastery of Arabic, the Qur’an, hadith sciences, and usul al-fiqh. Most Muslims legitimately follow a mujtahid’s rulings in branches of law (furūʿ) while personally investigating core beliefs with sincere effort.',
  },
  {
    number: '17',
    chapter: 'Worship',
    questionEn: 'Does intention (niyyah) affect the value of worship?',
    answerEn:
      'Valid worship requires intention directed to Allah. Outward correctness without inward sincerity is spiritually deficient; fiqh and ethics together demand both proper form and sincere purpose.',
  },
  {
    number: '18',
    chapter: 'Medical ethics',
    questionEn: 'How should a Muslim approach necessary medical treatment?',
    answerEn:
      'Preserving life and health is valued; treatment that uses lawful means is encouraged. When the law permits an exception due to necessity (ḍarūrah), the exception is bounded and does not abolish the general rule.',
  },
  {
    number: '19',
    chapter: 'Social media and speech',
    questionEn: 'What limits does Islam place on speech?',
    answerEn:
      'Truthfulness, avoiding slander, and protecting others’ honor are binding ethical and legal concerns. Speech that spreads corruption, false accusation, or needless harm is condemned even when technology makes it easy.',
  },
  {
    number: '20',
    chapter: 'End times and responsibility',
    questionEn: 'How should Muslims relate to the Mahdi (aj)?',
    answerEn:
      'Awaiting the Mahdi includes preparing spiritually and socially for justice, not idle speculation. Practical laws remain those of the living marjaʿ; hope in the Imam’s return motivates reform of self and community.',
  },
];
