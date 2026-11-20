/** 사이트 경로·URL·날짜·읽기 시간 도우미 */

/** '/quoguri-blog' 또는 '' (커스텀 도메인 연결 시) */
export const basePath: string = import.meta.env.BASE_URL.replace(/\/+$/, '');

/** 내부 링크에 base 경로를 붙입니다. withBase('/posts/a/') → '/quoguri-blog/posts/a/' */
export function withBase(path = '/'): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (!basePath) return normalized;
  return normalized === '/' ? `${basePath}/` : `${basePath}${normalized}`;
}

/** 절대 URL (canonical·OG·RSS용) */
export function absoluteUrl(path = '/'): string {
  const site = import.meta.env.SITE ?? 'http://localhost:4321';
  return new URL(withBase(path), site).href;
}

/** 정적 자산(public/) 경로 */
export function asset(path: string): string {
  return withBase(path.startsWith('/') ? path : `/${path}`);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Seoul',
  }).format(date);
}

export function formatDateShort(date: Date): string {
  const parts = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Seoul',
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}.${get('month')}.${get('day')}`;
}

export function isoDate(date: Date): string {
  return date.toISOString();
}

/** 한국어 기준 분당 약 500자로 계산한 읽기 시간 */
export function readingTime(body: string): number {
  const text = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_`~\-|]/g, ' ');
  const chars = text.replace(/\s+/g, '').length;
  return Math.max(1, Math.round(chars / 500));
}

export function plainText(body: string, limit = 160): string {
  const text = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > limit ? `${text.slice(0, limit).trim()}…` : text;
}
