/**
 * 관리자 — 사이트 설정(src/content/pages/site.json)
 *
 * 검색엔진 소유확인 코드, 문의 메일, GA4·애드센스·쿠팡 파트너스 ID처럼
 * "배포 워크플로를 고치지 않고도 바꿔야 하는 값"을 한 파일에 모읍니다.
 *
 * · 이 파일은 빌드할 때 src/config.ts 가 읽어서 <head>와 본문에 넣습니다.
 * · GitHub Actions 저장소 변수(예: PUBLIC_GA4_ID)가 있으면 그 값이 우선입니다.
 * · /admin/ 의 '사이트 설정' 탭이 이 파일을 읽고 커밋합니다.
 */

export const SETTINGS_PATH = 'src/content/pages/site.json';

const text = (value) => (typeof value === 'string' ? value.trim() : '');
const obj = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});

export function todayInput() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function settingsDefaults() {
  return {
    contactEmail: '',
    verification: { google: '', naver: '' },
    analytics: { ga4: '' },
    adsense: { client: '', slotArticle: '', slotHome: '' },
    coupang: { partnerId: '' },
    socials: { instagram: '', youtube: '', naverBlog: '', github: '' },
    updated: todayInput(),
  };
}

/**
 * 서치콘솔·서치어드바이저 화면에서 <meta … content="…"> 태그를 통째로
 * 복사해 붙여 넣는 경우가 많아서, content 값만 뽑아 냅니다.
 */
export function extractMetaToken(value) {
  const raw = text(value);
  if (!raw) return '';
  const content = /content\s*=\s*("([^"]*)"|'([^']*)')/i.exec(raw);
  if (content) return (content[2] ?? content[3] ?? '').trim();
  const afterColon = /^[\w-]*site-verification\s*:\s*(.+)$/i.exec(raw);
  if (afterColon) return afterColon[1].trim();
  return raw.replace(/^["']|["']$/g, '').trim();
}

/** GA4 측정 ID — gtag 스니펫을 통째로 붙여 넣어도 G-… 만 남깁니다. */
export function normalizeGa4Id(value) {
  const raw = text(value);
  if (!raw) return '';
  const match = /G-[A-Z0-9]{4,}/i.exec(raw);
  return (match ? match[0] : raw).toUpperCase();
}

/** 애드센스 게시자 ID — 스크립트를 붙여 넣어도 ca-pub-… 만 남깁니다. */
export function normalizeAdsenseClient(value) {
  const raw = text(value);
  if (!raw) return '';
  const match = /ca-pub-\d{8,20}/i.exec(raw);
  if (match) return match[0].toLowerCase();
  const digits = /^pub-(\d{8,20})$/i.exec(raw);
  return digits ? `ca-pub-${digits[1]}` : raw;
}

const digitsOnly = (value) => text(value).replace(/[^\d]/g, '');

/** 어떤 모양의 JSON이 와도 화면이 깨지지 않도록 모양을 맞춥니다. */
export function normalizeSettings(raw) {
  const data = obj(raw);
  const verification = obj(data.verification);
  const analytics = obj(data.analytics);
  const adsense = obj(data.adsense);
  const coupang = obj(data.coupang);
  const socials = obj(data.socials);

  return {
    contactEmail: text(data.contactEmail),
    verification: {
      google: extractMetaToken(verification.google),
      naver: extractMetaToken(verification.naver),
    },
    analytics: { ga4: normalizeGa4Id(analytics.ga4) },
    adsense: {
      client: normalizeAdsenseClient(adsense.client),
      slotArticle: digitsOnly(adsense.slotArticle),
      slotHome: digitsOnly(adsense.slotHome),
    },
    coupang: { partnerId: text(coupang.partnerId) },
    socials: {
      instagram: text(socials.instagram),
      youtube: text(socials.youtube),
      naverBlog: text(socials.naverBlog),
      github: text(socials.github),
    },
    updated: text(data.updated) || todayInput(),
  };
}

/** 저장 전에 확인할 것들. 빈 배열이면 통과입니다. */
export function validateSettings(input) {
  const data = normalizeSettings(input);
  const errors = [];

  if (data.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contactEmail)) {
    errors.push('문의 메일 주소 형식을 확인해 주세요. (예: hello@quoguri.com)');
  }

  if (data.analytics.ga4 && !/^G-[A-Z0-9]{4,}$/.test(data.analytics.ga4)) {
    errors.push('GA4 측정 ID는 G-로 시작해요. (예: G-ABCDE12345)');
  }

  if (data.adsense.client && !/^ca-pub-\d{8,20}$/.test(data.adsense.client)) {
    errors.push('애드센스 게시자 ID는 ca-pub-와 숫자로 이뤄져요. (예: ca-pub-1234567890123456)');
  }

  for (const [label, value] of [
    ['본문 광고 슬롯', data.adsense.slotArticle],
    ['홈 광고 슬롯', data.adsense.slotHome],
  ]) {
    if (value && !/^\d+$/.test(value)) errors.push(`${label} ID는 숫자만 넣어 주세요.`);
  }

  for (const [label, value] of [
    ['인스타그램', data.socials.instagram],
    ['유튜브', data.socials.youtube],
    ['네이버 블로그', data.socials.naverBlog],
    ['깃허브', data.socials.github],
  ]) {
    if (value && !/^https?:\/\//i.test(value)) {
      errors.push(`${label} 주소는 https:// 로 시작해야 사이트에 링크로 걸려요.`);
    }
  }

  return errors;
}

export function cleanSettings(input) {
  const data = normalizeSettings(input);
  return { ...data, updated: data.updated || todayInput() };
}

export function serializeSettings(input) {
  return `${JSON.stringify(cleanSettings(input), null, 2)}\n`;
}

export function parseSettings(raw) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('사이트 설정(JSON)을 읽지 못했어요. 파일 형식을 확인해 주세요.');
  }
  return normalizeSettings(data);
}

/** 사이트에 실제로 들어가는 값을 한눈에 보여 줄 때 씁니다. */
export function settingsSummary(input) {
  const data = normalizeSettings(input);
  return [
    { key: 'google', label: '구글 서치콘솔 소유확인', value: data.verification.google },
    { key: 'naver', label: '네이버 서치어드바이저 소유확인', value: data.verification.naver },
    { key: 'ga4', label: 'GA4 측정 ID', value: data.analytics.ga4 },
    { key: 'adsense', label: '애드센스 게시자 ID', value: data.adsense.client },
    { key: 'contact', label: '문의 메일', value: data.contactEmail },
  ];
}
