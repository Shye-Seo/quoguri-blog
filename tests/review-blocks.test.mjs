/**
 * 리뷰 블록(한 줄 결론 · 장단점 · 가격)·쿠팡 공시 단위 테스트
 *
 *   node --test tests/
 *
 * 사이트 본문(remark)과 /admin/ 미리보기가 같은 코드를 쓰는지,
 * 공시 배너가 제휴 글에서만 붙는지 확인합니다.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  isReviewBlock,
  parsePrice,
  parseProsCons,
  renderReviewBlock,
  reviewSnippet,
} from '../src/lib/review-blocks.js';
import { renderMarkdown } from '../src/admin/markdown.js';
import {
  COUPANG_DISCLOSURE,
  coupangNoticeHtml,
  needsCoupangDisclosure,
} from '../src/lib/disclosure.js';
import { parsePost, serializePost } from '../src/admin/frontmatter.js';

test('세 가지 펜스만 리뷰 블록으로 본다', () => {
  for (const lang of ['verdict', 'proscons', 'price', ' Price ']) {
    assert.equal(isReviewBlock(lang), true, lang);
  }
  for (const lang of ['js', 'mdx', '', 'Verdicts']) {
    assert.equal(isReviewBlock(lang), false, lang);
  }
});

test('한 줄 결론: 여러 줄은 한 문장으로 합친다', () => {
  const html = renderReviewBlock('verdict', '매일 8시간 타이핑하는 사람에게 추천\n가끔 쓰는 사람에게는 과한 선택');
  assert.match(html, /review-verdict/);
  assert.match(html, /한 줄 결론/);
  assert.match(html, /추천 가끔 쓰는 사람에게는/);
  assert.ok(!html.includes('\n'), '한 줄로 합쳐져야 합니다');
});

test('장단점: +는 장점, -는 단점으로 나눈다', () => {
  const parsed = parseProsCons('+ 조용해요\n- 백라이트가 없어요\n• 키캡이 낮아요');
  assert.deepEqual(parsed.pros, ['조용해요', '키캡이 낮아요']);
  assert.deepEqual(parsed.cons, ['백라이트가 없어요']);

  const html = renderReviewBlock('proscons', '+ 조용해요\n- 백라이트 없음');
  assert.match(html, /review-compare__list--pro/);
  assert.match(html, /review-compare__list--con/);
  assert.match(html, /좋았던 점/);
  assert.match(html, /아쉬운 점/);
});

test('장단점: 아무것도 적지 않으면 안내 문구를 보여 준다', () => {
  const html = renderReviewBlock('proscons', '');
  assert.match(html, /아직 적지 않았어요/);
});

test('가격: 한글 필드명·금액만 적은 경우도 받는다', () => {
  const parsed = parsePrice('가격: 89,000원\n구매처: 쿠팡\n기준일: 2026-11-21\n메모: 배송비 별도');
  assert.deepEqual(parsed, {
    price: '89,000원',
    store: '쿠팡',
    date: '2026-11-21',
    note: '배송비 별도',
  });

  const onlyPrice = parsePrice('29,900원');
  assert.equal(onlyPrice.price, '29,900원');

  const html = renderReviewBlock('price', 'price: 89,000원\nstore: 쿠팡\ndate: 2026-11-21');
  assert.match(html, /review-price__value/);
  assert.match(html, /89,000원/);
  assert.match(html, /쿠팡/);
  assert.match(html, /2026-11-21 기준/);
  assert.match(html, /판매처 사정에 따라/);
});

test('리뷰 블록 안의 링크는 base를 붙이고 외부 링크는 새 창', () => {
  const internal = renderReviewBlock('verdict', '[소개](/about/)를 먼저 보세요', { base: '/quoguri-blog' });
  assert.match(internal, /href="\/quoguri-blog\/about\/"/);

  const external = renderReviewBlock('verdict', '[쿠팡](https://link.coupang.com/a/abc)에서 사요');
  assert.match(external, /target="_blank" rel="nofollow noopener noreferrer"/);
});

test('블록 안의 HTML은 이스케이프된다', () => {
  const html = renderReviewBlock('verdict', '<script>alert(1)</script>');
  assert.ok(!html.includes('<script>'));
  assert.match(html, /&lt;script&gt;/);
});

test('툴바 문구는 그대로 다시 블록이 된다', () => {
  for (const kind of ['verdict', 'proscons', 'price']) {
    const snippet = reviewSnippet(kind);
    assert.ok(snippet.startsWith(`\`\`\`${kind}`), kind);
    assert.ok(snippet.trimEnd().endsWith('```'), kind);
  }
  assert.match(reviewSnippet('price', { date: '2026-11-21' }), /date: 2026-11-21/);
  assert.equal(reviewSnippet('nope'), '');
});

test('관리자 미리보기도 리뷰 블록을 그린다 (코드 블록 아님)', () => {
  const html = renderMarkdown('```verdict\n매일 쓰는 사람에게 추천\n```\n\n```price\nprice: 89,000원\nstore: 쿠팡\n```');
  assert.match(html, /review-verdict/);
  assert.match(html, /review-price/);
  assert.ok(!html.includes('<pre><code class="language-verdict"'), '리뷰 블록은 코드로 보이면 안 됩니다');
});

test('일반 코드 블록은 그대로 코드로 보인다', () => {
  const html = renderMarkdown('```js\nconst a = 1;\n```');
  assert.match(html, /<pre><code class="language-js">/);
  assert.ok(!html.includes('review-'));
});

test('쿠팡 공시: 플래그·카드·제휴 링크를 모두 잡는다', () => {
  assert.equal(needsCoupangDisclosure({ coupang: true }), true);
  assert.equal(needsCoupangDisclosure({ body: '<CoupangCard name="키보드" />' }), true);
  assert.equal(needsCoupangDisclosure({ body: '링크: https://link.coupang.com/a/xyz' }), true);
  assert.equal(needsCoupangDisclosure({ body: 'https://www.coupang.com/vp/products/1' }), false);
  assert.equal(needsCoupangDisclosure({}), false);
});

test('쿠팡 공시 배너 문구·이스케이프', () => {
  const html = coupangNoticeHtml();
  assert.match(html, /coupang-notice/);
  assert.ok(html.includes(COUPANG_DISCLOSURE.replace('&', '&amp;')));
  assert.match(coupangNoticeHtml('<b>강조</b>'), /&lt;b&gt;/);
});

test('프런트매터 coupang: true가 저장·재읽기에서 유지된다', () => {
  const text = serializePost({ title: '쿠팡 글', description: '설명', pubDate: '2026-11-21', category: 'tech', tags: [], coupang: true }, '본문');
  assert.match(text, /coupang: true/);
  assert.equal(parsePost(text).data.coupang, true);

  const off = serializePost({ title: '일반 글', description: '설명', pubDate: '2026-11-21', category: 'tech', tags: [], coupang: false }, '본문');
  assert.match(off, /coupang: false/);
  assert.equal(parsePost(off).data.coupang, false);
});
