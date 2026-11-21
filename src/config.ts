/**
 * 쿼구리 블로그 — 한 곳에서 관리하는 설정
 * ---------------------------------------------
 * 브랜드 문구, 카테고리, 수익화 ID(애드센스·쿠팡 파트너스), 검색엔진 소유확인 값을 여기서 고칩니다.
 *
 * 수익화 ID는 코드를 고치지 않고 GitHub 저장소 변수(Variables)로도 넣을 수 있어요.
 *   PUBLIC_ADSENSE_CLIENT        예: ca-pub-1234567890123456
 *   PUBLIC_ADSENSE_SLOT_ARTICLE  본문 중간 광고 슬롯 ID (숫자 10자리)
 *   PUBLIC_ADSENSE_SLOT_HOME     홈 하단 광고 슬롯 ID
 *   PUBLIC_COUPANG_PARTNER_ID    예: AF1234567
 *   PUBLIC_GA4_ID                예: G-XXXXXXXXXX
 *   PUBLIC_GOOGLE_SITE_VERIFICATION  서치콘솔 소유확인 코드
 *   PUBLIC_NAVER_SITE_VERIFICATION   네이버 서치어드바이저 소유확인 코드
 * 환경변수가 비어 있으면 아래 기본값이 쓰입니다.
 */

const env = import.meta.env;

const read = (key: string, fallback = '') => {
  const value = (env as Record<string, string | undefined>)[key];
  return (value ?? fallback).trim();
};

/* ── 브랜드 ─────────────────────────────────────────────── */
export const site = {
  name: '쿼구리',
  nameEn: 'quoguri',
  tagline: '직접 써보고, 직접 찍은 것만',
  description:
    '테크·데스크테리어, 뷰티, 여행·디카, 일상 꿀팁까지 — 직접 써보고 직접 찍은 것만 귀엽고 솔직하게 기록하는 쿼구리(quoguri)의 블로그예요.',
  /** 홈 메타 키워드 (네이버는 참고, 구글은 사실상 무시) */
  keywords: ['쿼구리', 'quoguri', '리뷰 블로그', '데스크테리어', '빈티지 디카', '화장품 후기', '일상 꿀팁'],
  lang: 'ko',
  locale: 'ko_KR',
  author: {
    /** 운영자 실명·계정은 어디에도 적지 않습니다. 브랜드명만 사용합니다. */
    name: '쿼구리',
    role: '기록하는 쿼카',
  },
  /** 채워 넣으면 소개·개인정보처리방침·푸터에 표시됩니다. */
  contactEmail: '',
  /** 비워 두면 화면에 나오지 않습니다. (운영자 개인 계정 주소는 넣지 마세요) */
  socials: {
    instagram: '',
    youtube: '',
    naverBlog: '',
    /** 운영자 GitHub 계정 대신 브랜드 저장소 이름만 쓰고, 비워 두면 표시하지 않습니다. */
    github: '',
  },
  /** 사이트 대표 이미지(OG) — 그림이 아닌 타이포그래피 카드입니다. */
  ogImage: '/images/og-default.jpg',
} as const;

/* ── 검색엔진 소유확인 ────────────────────────────────────
 * GitHub Actions의 저장소 변수로 넣어도 되고,
 * 아래 따옴표 안에 코드만 붙여 넣어도 됩니다.
 *   구글 서치콘솔 → 소유권 확인 → 'HTML 태그' 방식의 content 값
 *   네이버 서치어드바이저 → 사이트 등록 → 'HTML 태그' 방식의 content 값
 */
export const verification = {
  google: read('PUBLIC_GOOGLE_SITE_VERIFICATION'),
  naver: read('PUBLIC_NAVER_SITE_VERIFICATION'),
};

/* ── 카테고리 ───────────────────────────────────────────── */
export const categories = [
  {
    slug: 'tech',
    label: '테크·데스크테리어',
    short: '테크',
    emoji: '🖥️',
    accent: '#3F6B5A',
    blurb: '맥북·태블릿·키보드, 책상 위의 물건들',
  },
  {
    slug: 'beauty',
    label: '뷰티·리뷰',
    short: '뷰티',
    emoji: '🧴',
    accent: '#D2603A',
    blurb: '써보고 남는 것만 남기는 솔직 후기',
  },
  {
    slug: 'travel',
    label: '여행·디카',
    short: '여행',
    emoji: '📷',
    accent: '#4B6E8C',
    blurb: '빈티지 디카와 함께한 동네 여행',
  },
  {
    slug: 'life',
    label: '일상·꿀팁',
    short: '일상',
    emoji: '🌿',
    accent: '#8A6A3B',
    blurb: '살림·기록·생활 속 작은 발견',
  },
] as const;

export type CategorySlug = (typeof categories)[number]['slug'];

export const categoryBySlug = (slug: string) =>
  categories.find((category) => category.slug === slug);

/* ── 수익화: Google AdSense ─────────────────────────────── */
const adsenseClient = read('PUBLIC_ADSENSE_CLIENT');

export const adsense = {
  /** 예: ca-pub-1234567890123456 — 형식이 맞아야 스크립트가 삽입됩니다. */
  client: adsenseClient,
  enabled: /^ca-pub-\d{16}$/.test(adsenseClient),
  slots: {
    article: read('PUBLIC_ADSENSE_SLOT_ARTICLE'),
    home: read('PUBLIC_ADSENSE_SLOT_HOME'),
  },
  /** 개발 중에는 광고 자리를 점선 박스로 보여 줍니다(운영 빌드에서는 숨김). */
  showPlaceholders: Boolean(env.DEV),
};

/* ── 수익화: 쿠팡 파트너스 ──────────────────────────────── */
export const coupang = {
  partnerId: read('PUBLIC_COUPANG_PARTNER_ID'),
  /** 공정위 추천·보증 심사지침에 맞춘 기본 고지 문구 */
  disclosure:
    '이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.',
};

/* ── 분석: GA4 (선택) ───────────────────────────────────── */
export const analytics = {
  ga4: read('PUBLIC_GA4_ID'),
};

/* ── 기타 ───────────────────────────────────────────────── */
export const features = {
  /** 홈에 보여 줄 최근 글 개수 */
  recentCount: 9,
  /** 관련 글 개수 */
  relatedCount: 3,
  /** 글 상단 읽기 진행 막대 */
  readingProgress: true,
};

export const nav = [
  { href: '/', label: '홈' },
  { href: '/categories/', label: '카테고리' },
  { href: '/about/', label: '쿼구리 소개' },
] as const;
