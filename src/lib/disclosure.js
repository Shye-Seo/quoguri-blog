/**
 * 쿠팡 파트너스 공시 문구 — 한 곳에서만 관리합니다.
 * ==========================================================
 * 쓰이는 곳
 *   1) 사이트 글 상단 배너 (src/pages/posts/[...slug].astro)
 *   2) CoupangCard 하단 문구 (src/components/CoupangCard.astro → config)
 *   3) 푸터·소개·개인정보처리방침 (config.coupang.disclosure)
 *   4) /admin/ 편집기 미리보기 (src/admin/markdown.js)
 *
 * 공정거래위원회 '추천·보증 심사지침'에 맞춘 기본 문구입니다.
 */

export const COUPANG_DISCLOSURE =
  '이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.';

/**
 * 이 글에 쿠팡 고지가 필요한지 판단합니다.
 * · 프런트매터 `coupang: true`
 * · 본문에 CoupangCard 컴포넌트나 link.coupang.com 제휴 링크가 있는 경우
 *
 * @param {{ coupang?: boolean, body?: string }} post
 */
export function needsCoupangDisclosure(post = {}) {
  if (post.coupang === true) return true;
  const body = String(post.body ?? '');
  return /<CoupangCard\b/i.test(body) || /link\.coupang\.com/i.test(body) || /coupang\.com\/a\//i.test(body);
}

/** 글 본문 맨 위에 넣는 공시 배너 (관리자 미리보기와 같은 마크업) */
export function coupangNoticeHtml(text = COUPANG_DISCLOSURE) {
  const safe = String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return [
    '<aside class="coupang-notice" role="note" aria-label="쿠팡 파트너스 고지">',
    '<span class="coupang-notice__badge">제휴 고지</span>',
    `<p>${safe}</p>`,
    '</aside>',
  ].join('');
}
