import type { FastifyRequest } from 'fastify';
import type { Cinema, Movie } from '../domain/types.ts';

// Listings support Arabic and English (BRD 7.1). Cinemas will eventually send both languages;
// until then the Arabic copy of the sample listings lives here. Titles and cinema brand names
// stay as the cinemas publish them.

export type Lang = 'en' | 'ar';

/** Arabic when the request's Accept-Language starts with "ar", otherwise English. */
export const langOf = (req: FastifyRequest): Lang =>
  String(req.headers['accept-language'] ?? '').trim().toLowerCase().startsWith('ar') ? 'ar' : 'en';

type MovieCopy = Pick<Movie, 'genre' | 'tagline' | 'synopsis' | 'credits' | 'language' | 'ageRating'>;
type CinemaCopy = Pick<Cinema, 'detail' | 'cancellationPolicy'>;

const movieAr: Record<string, MovieCopy> = {
  'the-last-light': {
    genre: 'دراما', ageRating: '+16', tagline: 'رحلة مش هتتنسي',
    synopsis: 'لما بلدة ساحلية هادية بتخسر الفنار بتاعها، بترجع مُرمِّمة شابة لبيتها عشان تكشف الحكاية اللي عيلتها سابتها وراها. قصة مؤثرة وغنية بصريًا عن إزاي تلاقي طريقك تاني.',
    credits: 'إخراج لينا منصور · بطولة سلمى حسن وكريم نبيل', language: 'إنجليزي · ترجمة عربي',
  },
  redline: {
    genre: 'أكشن', ageRating: '+16', tagline: 'مفيش رجوع',
    synopsis: 'سواق هروب بياخد آخر مهمة، وقدامه ليلة واحدة يخلّصها.', credits: 'عرض تجريبي', language: 'إنجليزي · ترجمة عربي',
  },
  'a-little-chaos': {
    genre: 'كوميدي', ageRating: '+12', tagline: 'الحياة بتحصل',
    synopsis: 'منظمة أفراح بيخرج لمّ شمل عيلتها هي نفسها عن السيطرة بشكل مش متوقع.', credits: 'عرض تجريبي', language: 'عربي · ترجمة إنجليزي',
  },
  'the-deep-blue': {
    genre: 'مغامرة', ageRating: '+12', tagline: 'نحو المجهول',
    synopsis: 'فريق أبحاث بيتبع إشارة لحد قاع البحر الأحمر.', credits: 'عرض تجريبي', language: 'إنجليزي · ترجمة عربي',
  },
  'little-giants': {
    genre: 'عائلي', ageRating: 'لكل الأعمار', tagline: 'الأحلام الكبيرة بتبدأ صغيرة',
    synopsis: 'فريق كورة مدرسي من غير ملعب بيقرر يكسب كأس المدينة.', credits: 'عرض تجريبي', language: 'عربي',
  },
};

const cinemaAr: Record<string, CinemaCopy> = {
  'vox-moe': {
    detail: 'مول مصر · عادي · Dolby Atmos',
    cancellationPolicy: 'ممكن تلغي التذاكر لحد ٣ ساعات قبل العرض وتسترد سعر التذكرة. رسوم المنصة مش بتترد.',
  },
  'reel-cfc': {
    detail: 'كايرو فستيفال سيتي · بريميم · IMAX',
    cancellationPolicy: 'التذاكر مش قابلة للاسترداد إلا لو السينما لغت العرض أو غيّرته.',
  },
  'galaxy-maadi': {
    detail: 'المعادي · عادي · صوت Dolby',
    cancellationPolicy: 'ممكن تلغي التذاكر لحد ٢٤ ساعة قبل العرض وتسترد سعر التذكرة. رسوم المنصة مش بتترد.',
  },
};

const formatAr: Record<string, string> = { Standard: 'عادي', Premium: 'بريميم' };

export const localizeMovie = <T extends Movie>(m: T, lang: Lang): T => (lang === 'ar' ? { ...m, ...movieAr[m.id] } : m);
export const localizeCinema = <T extends Cinema>(c: T, lang: Lang): T => (lang === 'ar' ? { ...c, ...cinemaAr[c.id] } : c);
export const localizeFormat = (f: string, lang: Lang) => (lang === 'ar' ? formatAr[f] ?? f : f);
