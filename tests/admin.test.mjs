/**
 * 관리자 모듈 단위 테스트
 *
 *   node --test tests/
 *
 * 실제 글 파일을 그대로 읽어 프런트매터를 왕복시키고,
 * 마크다운 미리보기와 SEO 점검이 기대대로 동작하는지 확인합니다.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { parsePost, serializePost, slugify, toDateInput } from '../src/admin/frontmatter.js';
import { renderMarkdown, plainText, headingsOf, linksOf } from '../src/admin/markdown.js';
import { analyzeSeo } from '../src/admin/seo.js';

const BLOG_DIR = path.resolve(import.meta.dirname, '../src/content/blog');
const posts = readdirSync(BLOG_DIR).filter((file) => /\.(md|mdx)$/.test(file));

test('모든 글의 프런트매터를 읽는다', () => {
  assert.ok(posts.length > 0, '글 파일이 있어야 합니다');
  for (const file of posts) {
    const raw = readFileSync(path.join(BLOG_DIR, file), 'utf8');
    const { data, body, hasFrontmatter } = parsePost(raw);
    assert.equal(hasFrontmatter, true, file);
    assert.ok(data.title, `${file}: title`);
    assert.ok(data.description, `${file}: description`);
    assert.match(String(data.pubDate), /^\d{4}-\d{2}-\d{2}/, `${file}: pubDate`);
    assert.ok(['tech', 'beauty', 'travel', 'life'].includes(data.category), `${file}: category`);
    assert.ok(Array.isArray(data.tags), `${file}: tags`);
    assert.ok(body.length > 100, `${file}: body`);
  }
});

test('프런트매터를 쓰고 다시 읽으면 값이 유지된다', () => {
  const input = {
    title: '따옴표 "안에" 있는 제목: 콜론도 OK',
    description: '설명입니다. 80자에서 150자 사이를 권장해요.',
    pubDate: '2026-11-21',
    updatedDate: '',
    category: 'tech',
    tags: ['키보드', '데스크테리어', '리뷰'],
    cover: '',
    coverAlt: '',
    featured: true,
    draft: false,
    series: '',
    seoTitle: '',
  };
  const body = '## 소제목\n\n본문입니다.\n';
  const text = serializePost(input, body);
  const parsed = parsePost(text);

  assert.equal(parsed.data.title, input.title);
  assert.equal(parsed.data.description, input.description);
  assert.equal(parsed.data.pubDate, '2026-11-21');
  assert.deepEqual(parsed.data.tags, input.tags);
  assert.equal(parsed.data.featured, true);
  assert.equal(parsed.data.draft, false);
  assert.equal(parsed.body.trim(), body.trim());
  assert.ok(!text.includes('updatedDate:'), '빈 선택 필드는 쓰지 않는다');
});

test('기존 글을 왕복해도 본문이 그대로다', () => {
  for (const file of posts) {
    const raw = readFileSync(path.join(BLOG_DIR, file), 'utf8').replace(/\r\n/g, '\n');
    const first = parsePost(raw);
    const second = parsePost(serializePost(first.data, first.body));
    assert.equal(second.data.title, first.data.title, file);
    assert.deepEqual(second.data.tags, first.data.tags, file);
    assert.equal(second.body.trim(), first.body.trim(), `${file}: body`);
  }
});

test('슬러그는 한글을 살리고 기호를 정리한다', () => {
  assert.equal(slugify('당근에서 빈티지 디카 살 때, 이 5가지만!'), '당근에서-빈티지-디카-살-때-이-5가지만');
  assert.equal(slugify('  Hello, World / Test  '), 'hello-world-test');
  assert.equal(slugify('!!!'), '');
  assert.equal(toDateInput('2026-11-20T00:00:00.000Z'), '2026-11-20');
});

test('markdown 미리보기: 제목·목록·표·코드·링크', () => {
  const html = renderMarkdown(`## 소제목

첫 문단 **굵게** 그리고 [내부 링크](/about/).

- 하나
- 둘

| 항목 | 값 |
| --- | --- |
| 가격 | 89,000원 |

\`\`\`js
const a = 1;
\`\`\`

![사진 설명](/images/a.jpg)
`);

  assert.match(html, /<h2>소제목<\/h2>/);
  assert.match(html, /<strong>굵게<\/strong>/);
  assert.match(html, /<a href="\/about\/">내부 링크<\/a>/);
  assert.match(html, /<ul><li>하나<\/li><li>둘<\/li><\/ul>/);
  assert.match(html, /<table>/);
  assert.match(html, /<pre><code class="language-js">/);
  assert.match(html, /alt="사진 설명"/);
});

test('markdown 미리보기: MDX import와 컴포넌트를 안내로 바꾼다', () => {
  const html = renderMarkdown(`import CoupangCard from '../../components/CoupangCard.astro';

본문입니다.

<CoupangCard name="키보드" price={89000} />
`);
  assert.ok(!html.includes('import CoupangCard'));
  assert.match(html, /MDX 컴포넌트/);
  assert.match(html, /CoupangCard/);
});

test('markdown: 스크립트 삽입은 이스케이프된다', () => {
  const html = renderMarkdown('<script>alert(1)</script>');
  assert.ok(!html.includes('<script>'));
});

test('본문 통계·제목·링크 추출', () => {
  const body = readFileSync(path.join(BLOG_DIR, posts[0]), 'utf8');
  const { body: content } = parsePost(body);
  const headings = headingsOf(content);
  const { links, images } = linksOf(content);
  assert.ok(headings.length > 0);
  assert.ok(Array.isArray(links));
  assert.ok(Array.isArray(images));
  assert.ok(plainText(content).length > 100);
});

test('SEO 점검: 잘 쓴 글은 높은 점수', () => {
  const title = '빈티지 디카 중고로 살 때 확인할 5가지';
  const description =
    '2만 원짜리 빈티지 디카가 3일 만에 고장 난 이유. 중고 디지털카메라를 고를 때 제가 실제로 확인하는 다섯 가지 체크리스트를 정리했습니다.';
  const body = `## 왜 확인해야 하나

빈티지 디카는 10년이 넘은 물건이라 렌즈와 배터리에 문제가 많습니다. 첫 문단에서 결론부터 말하면, 손전등으로 렌즈를 비추고 배터리 모델명을 검색하면 절반은 걸러집니다.

## 렌즈를 손전등으로 비춰 보세요

곰팡이와 먼지는 실내 조명으로는 보이지 않습니다. 판매자에게 손전등 사진을 요청하세요.

### 곰팡이

하얀 실 같은 무늬가 보이면 거르는 게 좋습니다.

### 먼지

작은 검은 점은 조리개를 조이면 더 진해집니다.

## 배터리와 충전기

단종된 배터리가 많아 호환품이 있는지 먼저 확인합니다. 배터리 모델명을 검색하면 바로 알 수 있습니다.

## 저장 매체

xD픽처카드나 메모리스틱은 리더기가 따로 필요합니다.

- SD면 다행입니다
- xD는 비쌉니다
- 메모리스틱은 구하기 어렵습니다

## 마무리

이전 글에서 [카메라 고르는 기준](/posts/used-digicam-checklist/)을 정리했고, [소개 페이지](/about/)에도 원칙을 적어 두었습니다. 사진은 ![손전등으로 렌즈 확인](/images/lens.jpg)처럼 직접 찍은 것만 씁니다.

${'확인하는 습관을 들이면 중고 거래에서 실패할 확률이 크게 줄어듭니다. '.repeat(30)}`;

  const result = analyzeSeo({ title, description, body, keyword: '빈티지 디카' });
  assert.ok(result.score >= 85, `점수 ${result.score}`);
  assert.equal(result.stats.h2, 5);
  assert.ok(result.stats.internalLinks >= 2);
});

test('SEO 점검: 빈 글은 낮은 점수', () => {
  const result = analyzeSeo({ title: '글', description: '', body: '', keyword: '' });
  assert.ok(result.score < 40, `점수 ${result.score}`);
  assert.ok(result.checks.some((check) => check.status === 'fail'));
});
