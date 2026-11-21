/**
 * 쿼구리 블로그 — 한 곳에서 관리하는 설정
 * ---------------------------------------------
 * 브랜드 문구, 카테고리, 수익화 ID(애드센스·쿠팡 파트너스), 검색엔진 소유확인 값을 여기서 고칩니다.
 *
 * 소유확인 코드·문의 메일·GA4·수익화 ID는 /admin/ → '사이트 설정' 탭에서
 * 저장하는 src/content/pages/site.json 이 기준입니다. (커밋하면 자동 배포)
 *   verification.google / verification.naver   서치콘솔·서치어드바이저 소유확인 코드
 *   contactEmail                               소개·개인정보처리방침·푸터에 표시
 *   analytics.ga4                              예: G-XXXXXXXXXX
 *   adsense.client / adsense.slotArticle / adsense.slotHome
 *   coupang.partnerId                          예: AF1234567
 *   socials.instagram / youtube / naverBlog / github
 *
 * GitHub Actions 저장소 변수(Variables)가 있으면 그 값이 우선합니다.
 *   PUBLIC_ADSENSE_CLIENT / PUBLIC_ADSENSE_SLOT_ARTICLE / PUBLIC_ADSENSE_SLOT_HOME
 *   PUBLIC_COUPANG_PARTNER_ID / PUBLIC_GA4_ID / PUBLIC_CONTACT_EMAIL
 *   PUBLIC_GOOGLE_SITE_VERIFICATION / PUBLIC_NAVER_SITE_VERIFICATION
 *
 * 워크플로(deploy.yml)는 이 저장소에서 수정하지 않습니다. 저장소 변수를
 * 워크플로가 넘겨주지 않는 항목은 위 site.json 값이 그대로 쓰입니다.
 */
import siteFile from './content/pages/site.json';
import { COUPANG_DISCLOSURE } from './lib/disclosure.js';

const env = import.meta.env;

const read = (key: string, fallback = '') => {
  const value = (env as Record<string, string | undefined>)[key];
  return (value ?? fallback).trim();
};

/** site.json 값 (없으면 '') */
const saved = (value?: string) => (typeof value === 'string' ? value.trim() : '');

/** 저장소 변수가 있으면 그 값, 없으면 site.json 값 */
const pick = (envKey: string, fileValue?: string) => read(envKey) || saved(fileValue);

/* ── 브랜드 ─────────────────────────────────────────────── */
export const site = {
  name: '쿼구리',
  nameEn: 'quoguri',
  tagline: '직접 써보고, 직접 검증한 것만',
  description:
    '테크·데스크테리어, 뷰티, 여행·디카, 일상 꿀팁까지 — 직접 써보고 검증한 것만 귀엽고 솔직하게 기록하는 쿼구리(quoguri)의 블로그예요.',
  /** 홈 메타 키워드 (네이버는 참고, 구글은 사실상 무시) */
  keywords: ['쿼구리', 'quoguri', '리뷰 블로그', '데스크테리어', '빈티지 디카', '화장품 후기', '일상 꿀팁'],
  lang: 'ko',
  locale: 'ko_KR',
  author: {
    /** 운영자 실명·계정은 어디에도 적지 않습니다. 브랜드명만 사용합니다. */
    name: '쿼구리',
    role: '기록하는 쿼카',
  },
  /** /admin/ → 사이트 설정에서 넣습니다. 비어 있으면 mailto 링크를 아예 그리지 않습니다. */
  contactEmail: pick('PUBLIC_CONTACT_EMAIL', siteFile.contactEmail),
  /** 비워 두면 화면에 나오지 않습니다. (운영자 개인 계정 주소는 넣지 마세요) */
  socials: {
    instagram: saved(siteFile.socials?.instagram),
    youtube: saved(siteFile.socials?.youtube),
    naverBlog: saved(siteFile.socials?.naverBlog),
    /** 운영자 GitHub 계정 대신 브랜드 저장소 이름만 쓰고, 비워 두면 표시하지 않습니다. */
    github: saved(siteFile.socials?.github),
  },
  /** 사이트 대표 이미지(OG) — 그림이 아닌 타이포그래피 카드입니다. */
  ogImage: '/images/og-default.jpg',
} as const;

/* ── 검색엔진 소유확인 ────────────────────────────────────
 * /admin/ → 사이트 설정에서 <meta> 태그를 통째로 붙여 넣어도 되고,
 * 저장소 변수(PUBLIC_GOOGLE_SITE_VERIFICATION 등)로 넣어도 됩니다.
 *   구글 서치콘솔 → 소유권 확인 → 'HTML 태그' 방식의 content 값
 *   네이버 서치어드바이저 → 사이트 등록 → 'HTML 태그' 방식의 content 값
 * 값이 비어 있으면 메타 태그 자체가 출력되지 않습니다.
 */
export const verification = {
  google: pick('PUBLIC_GOOGLE_SITE_VERIFICATION', siteFile.verification?.google),
  naver: pick('PUBLIC_NAVER_SITE_VERIFICATION', siteFile.verification?.naver),
};

/* ── 카테고리 ───────────────────────────────────────────── */
export const categories = [
  {
    slug: 'tech',
    label: '테크·데스크테리어',
    short: '테크',
    emoji: '🖥️',
    accent: '#0E9F79',
    blurb: '맥북·태블릿·키보드, 책상 위의 물건들',
  },
  {
    slug: 'beauty',
    label: '뷰티·리뷰',
    short: '뷰티',
    emoji: '🧴',
    accent: '#FF4D67',
    blurb: '써보고 남는 것만 남기는 솔직 후기',
  },
  {
    slug: 'travel',
    label: '여행·디카',
    short: '여행',
    emoji: '📷',
    accent: '#2F7DF6',
    blurb: '빈티지 디카와 함께한 동네 여행',
  },
  {
    slug: 'life',
    label: '일상·꿀팁',
    short: '일상',
    emoji: '🌿',
    accent: '#F2A007',
    blurb: '살림·기록·생활 속 작은 발견',
  },
] as const;

export type CategorySlug = (typeof categories)[number]['slug'];

export const categoryBySlug = (slug: string) =>
  categories.find((category) => category.slug === slug);

/* ── 수익화: Google AdSense ─────────────────────────────── */
const adsenseClient = pick('PUBLIC_ADSENSE_CLIENT', siteFile.adsense?.client);

export const adsense = {
  /** 예: ca-pub-1234567890123456 — 형식이 맞아야 스크립트가 삽입됩니다. */
  client: adsenseClient,
  enabled: /^ca-pub-\d{16}$/.test(adsenseClient),
  slots: {
    article: pick('PUBLIC_ADSENSE_SLOT_ARTICLE', siteFile.adsense?.slotArticle),
    home: pick('PUBLIC_ADSENSE_SLOT_HOME', siteFile.adsense?.slotHome),
  },
  /** 개발 중에는 광고 자리를 점선 박스로 보여 줍니다(운영 빌드에서는 숨김). */
  showPlaceholders: Boolean(env.DEV),
};

/* ── 수익화: 쿠팡 파트너스 ──────────────────────────────── */
export const coupang = {
  partnerId: pick('PUBLIC_COUPANG_PARTNER_ID', siteFile.coupang?.partnerId),
  /** 공정위 추천·보증 심사지침에 맞춘 기본 고지 문구 (src/lib/disclosure.js) */
  disclosure: COUPANG_DISCLOSURE,
};

/* ── 분석: GA4 (선택) ───────────────────────────────────── */
export const analytics = {
  ga4: pick('PUBLIC_GA4_ID', siteFile.analytics?.ga4),
  /** GA4가 켜져 있으면 개인정보처리방침에서도 해당 절을 강조합니다. */
  enabled: Boolean(pick('PUBLIC_GA4_ID', siteFile.analytics?.ga4)),
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
