/*
 * Betel Manchester app — church settings.
 * Edit this file to change meetings, contacts, giving and links.
 * Days: 0 = Sunday, 1 = Monday ... 6 = Saturday. Times are UK time (24h).
 */
window.BETEL = {
  name: 'Betel Manchester',
  fullName: 'Biserica Creștină după Evanghelie Betel Manchester',
  charityNumber: '1217648',

  address: 'Seymour Road, Manchester M11 4PG',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Seymour+Road+Manchester+M11+4PG',

  // WhatsApp number in international format, no + or spaces (07407 247656 -> 447407247656)
  whatsapp: '447407247656',
  email: 'biserica.betel.man@gmail.com',

  youtube: {
    channelUrl: 'https://www.youtube.com/@BisericaBetel-ManchesterBBM',
    channelId: 'UCCCzTneGFC7dKoo5OC9B04g'
  },
  facebook: 'https://www.facebook.com/BisericaBetelManchester/',

  // Weekly meetings. durationMins is used for "Add to calendar" — adjust if needed.
  meetings: [
    {
      id: 'sun', day: 0, time: '17:00', durationMins: 120, cat: 'church', atChurch: true,
      title: { en: 'Worship & Lord’s Table', ro: 'Închinare și Cina Domnului' }
    },
    {
      id: 'mon', day: 1, time: '19:00', durationMins: 90, cat: 'men', atChurch: false,
      title: { en: 'Men’s Bible Study', ro: 'Studiu biblic pentru bărbați' }
    },
    {
      id: 'thu', day: 4, time: '19:00', durationMins: 90, cat: 'church', atChurch: true,
      title: { en: 'Prayer meeting', ro: 'Întâlnire de rugăciune' }
    },
    {
      id: 'fri', day: 5, time: '19:00', durationMins: 90, cat: 'sisters', atChurch: false,
      title: { en: 'Sisters’ prayer & fellowship', ro: 'Rugăciune și părtășie pentru surori' }
    }
  ],

  // One-off events. Example:
  // { id: 'weekend-away', date: '2027-05-14', endDate: '2027-05-16', time: '18:00',
  //   title: { en: 'Church weekend away', ro: 'Weekend cu biserica' },
  //   place: 'Capernwray Hall, Carnforth' }
  specialEvents: [],

  giving: {
    // Paste your Stripe Payment Link here (it supports card, Apple Pay and Google Pay).
    // Leave empty to hide the online giving button.
    stripePaymentLink: '',
    bank: {
      accountName: 'Biserica Betel Manchester',
      bankName: 'Lloyds Bank',
      sortCode: '30-99-50',
      accountNumber: '53735562',
      iban: 'GB84 LOYD 3099 5053 7355 62',
      bic: 'LOYDGB21287'
    }
  },

  // Prayer wall (optional). Fill both values from your Supabase project to switch it on.
  prayerWall: {
    supabaseUrl: '',
    supabaseAnonKey: ''
  },

  // Where the app reads the latest YouTube videos (set up in netlify.toml)
  latestVideosEndpoint: '/yt-feed',

  verses: [
    { ref: 'Psalm 133:1', refRo: 'Psalmul 133:1',
      en: 'Behold, how good and how pleasant it is for brethren to dwell together in unity!',
      ro: 'Iată, ce plăcut și ce dulce este să locuiască frații împreună!' },
    { ref: 'John 3:16', refRo: 'Ioan 3:16',
      en: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.',
      ro: 'Fiindcă atât de mult a iubit Dumnezeu lumea, că a dat pe singurul Lui Fiu, pentru ca oricine crede în El să nu piară, ci să aibă viața veșnică.' },
    { ref: 'Psalm 23:1', refRo: 'Psalmul 23:1',
      en: 'The LORD is my shepherd; I shall not want.',
      ro: 'Domnul este Păstorul meu: nu voi duce lipsă de nimic.' },
    { ref: 'Matthew 11:28', refRo: 'Matei 11:28',
      en: 'Come unto me, all ye that labour and are heavy laden, and I will give you rest.',
      ro: 'Veniți la Mine, toți cei trudiți și împovărați, și Eu vă voi da odihnă.' },
    { ref: 'Philippians 4:13', refRo: 'Filipeni 4:13',
      en: 'I can do all things through Christ which strengtheneth me.',
      ro: 'Pot totul în Hristos care mă întărește.' },
    { ref: 'Proverbs 3:5', refRo: 'Proverbe 3:5',
      en: 'Trust in the LORD with all thine heart; and lean not unto thine own understanding.',
      ro: 'Încrede-te în Domnul din toată inima ta și nu te bizui pe înțelepciunea ta!' },
    { ref: 'Psalm 46:1', refRo: 'Psalmul 46:1',
      en: 'God is our refuge and strength, a very present help in trouble.',
      ro: 'Dumnezeu este adăpostul și sprijinul nostru, un ajutor care nu lipsește niciodată în nevoi.' }
  ]
};
