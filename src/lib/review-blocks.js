/**
 * 리뷰 블록 — 한 줄 결론 · 장단점 · 가격 기준일 배지
 * ==========================================================
 * 같은 코드를 세 곳에서 함께 씁니다.
 *   1) 글 렌더링 (md·mdx 공통 remark 플러그인 `remark-review-blocks.js`)
 *   2) /admin/ 실시간 미리보기 (`src/admin/markdown.js`)
 *   3) 에디터 툴바가 넣는 기본 문구 (`reviewSnippet`)
 *
 * 글에는 ```verdict / ```proscons / ```price 코드 펜스로 씁니다.
 *
 *   ```verdict
 *   매일 8시간 타이핑하는 사람에게는 추천, 가끔 쓰는 사람에게는 과한 선택
 *   ```
 *
 *   ```proscons
 *   + 소리가 조용해서 밤에 작업해도 괜찮아요
 *   + 키캡이 낮아 손목 받침 없이도 편해요
 *   - 백라이트가 없어 어두운 방에서는 키가 안 보여요
 *   ```
 *
 *   ```price
 *   price: 89,000원
 *   store: 쿠팡
 *   date: 2026-11-21
 *   note: 가격은 판매처 사정에 따라 달라질 수 있어요
 *   ```
 */

/** 코드 펜스 언어 이름 (소문자로 비교) */
export const REVIEW_BLOCKS = ['verdict', 'proscons', 'price'];

export function isReviewBlock(lang) {
  return REVIEW_BLOCKS.includes(String(lang ?? '').trim().toLowerCase());
}

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** '/about/' 같은 내부 링크에 배포 base를 붙입니다. */
function withBase(href, base) {
  const path = String(href ?? '').trim();
  if (!path.startsWith('/') || path.startsWith('//') || !base) return path;
  const root = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${root}${path}`;
}

/** 굵게·기울임·코드·링크 정도만 처리하는 최소 인라인 마크다운 */
function inline(text, base) {
  let html = escapeHtml(text);

  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  html = html.replace(
    /\[([^\]]+)\]\(([^)\s]+?)(?:\s+&quot;[^&]*&quot;)?\)/g,
    (_, label, href) => {
      const url = withBase(href, base);
      const external = /^https?:/i.test(url);
      return `<a href="${url}"${external ? ' target="_blank" rel="nofollow noopener noreferrer"' : ''}>${label}</a>`;
    },
  );

  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');

  return html;
}

const lines = (source) =>
  String(source ?? '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

/* ── 블록별 해석 ────────────────────────────────────────── */

export function parseVerdict(source) {
  return { text: lines(source).join(' ') };
}

export function parseProsCons(source) {
  const pros = [];
  const cons = [];
  for (const line of lines(source)) {
    if (/^[-–—]\s*/.test(line)) cons.push(line.replace(/^[-–—]\s*/, ''));
    else pros.push(line.replace(/^[+•*]\s*/, ''));
  }
  return { pros, cons };
}

const FIELD_ALIASES = {
  price: ['price', '가격', '판매가', '금액'],
  store: ['store', '구매처', '판매처', '쇼핑몰'],
  date: ['date', '기준일', '날짜', '확인일'],
  note: ['note', '메모', '안내', '비고'],
};

export function parsePrice(source) {
  const fields = { price: '', store: '', date: '', note: '' };
  const stray = [];

  for (const line of lines(source)) {
    const match = /^([A-Za-z가-힣]+)\s*[:：]\s*(.+)$/.exec(line);
    const key = match
      ? Object.keys(FIELD_ALIASES).find((name) => FIELD_ALIASES[name].includes(match[1].trim().toLowerCase()))
      : null;
    if (match && key) fields[key] = match[2].trim();
    else stray.push(line);
  }

  // 'price:' 없이 금액만 적은 경우도 받아 줍니다.
  if (!fields.price && stray.length) fields.price = stray.shift();
  if (stray.length) fields.note = [fields.note, stray.join(' ')].filter(Boolean).join(' ');

  return fields;
}

/* ── HTML 렌더링 (사이트 본문·관리자 미리보기 공통) ───────── */

function renderVerdict(source, base) {
  const { text } = parseVerdict(source);
  const body = text ? inline(text, base) : '한 문장 결론을 적어 주세요.';
  return `<aside class="review-box review-verdict" aria-label="한 줄 결론"><p class="review-box__label"><span class="review-box__icon" aria-hidden="true">✓</span>한 줄 결론</p><p class="review-verdict__text">${body}</p></aside>`;
}

function renderProsCons(source, base) {
  const { pros, cons } = parseProsCons(source);
  const list = (items, type) =>
    items.length
      ? `<ul class="review-compare__list review-compare__list--${type}">${items
          .map((item) => `<li>${inline(item, base)}</li>`)
          .join('')}</ul>`
      : `<p class="review-compare__empty">아직 적지 않았어요</p>`;

  return [
    '<aside class="review-box review-compare" aria-label="장점과 단점">',
    '<p class="review-box__label">장점 · 단점</p>',
    '<p class="review-compare__head review-compare__head--pro"><span aria-hidden="true">👍</span> 좋았던 점</p>',
    list(pros, 'pro'),
    '<p class="review-compare__head review-compare__head--con"><span aria-hidden="true">👎</span> 아쉬운 점</p>',
    list(cons, 'con'),
    '</aside>',
  ].join('');
}

function renderPrice(source, base) {
  const { price, store, date, note } = parsePrice(source);
  const meta = [
    store ? `<span class="review-price__chip">${escapeHtml(store)}</span>` : '',
    date ? `<span>${escapeHtml(date)} 기준</span>` : '',
  ]
    .filter(Boolean)
    .join('');
  const noteText = note || '가격은 판매처 사정에 따라 달라질 수 있어요.';

  return [
    '<aside class="review-box review-price" aria-label="가격 정보">',
    '<p class="review-box__label">가격 기준</p>',
    `<p class="review-price__value">${price ? inline(price, base) : '가격을 적어 주세요'}</p>`,
    meta ? `<p class="review-price__meta">${meta}</p>` : '',
    `<p class="review-price__note">${inline(noteText, base)}</p>`,
    '</aside>',
  ].join('');
}

/**
 * @param {'verdict'|'proscons'|'price'} kind
 * @param {string} source 블록 안쪽 글
 * @param {{base?: string}} [options] 배포 base 경로 (내부 링크 보정)
 */
export function renderReviewBlock(kind, source, options = {}) {
  const base = options.base || '';
  switch (String(kind ?? '').trim().toLowerCase()) {
    case 'verdict':
      return renderVerdict(source, base);
    case 'proscons':
      return renderProsCons(source, base);
    case 'price':
      return renderPrice(source, base);
    default:
      return '';
  }
}

/* ── 툴바가 넣는 기본 문구 ──────────────────────────────── */

export function reviewSnippet(kind, options = {}) {
  const date = options.date || new Date().toISOString().slice(0, 10);
  switch (String(kind ?? '').trim().toLowerCase()) {
    case 'verdict':
      return ['```verdict', options.text || '누구에게 추천, 누구에게는 비추천인지 한 문장으로', '```'].join('\n');
    case 'proscons':
      return [
        '```proscons',
        '+ 좋았던 점을 한 줄로',
        '+ 두 번째 좋았던 점',
        '- 아쉬웠던 점을 한 줄로',
        '- 두 번째 아쉬웠던 점',
        '```',
      ].join('\n');
    case 'price':
      return [
        '```price',
        'price: 89,000원',
        'store: 쿠팡',
        `date: ${date}`,
        'note: 가격은 판매처 사정에 따라 달라질 수 있어요.',
        '```',
      ].join('\n');
    default:
      return '';
  }
}
