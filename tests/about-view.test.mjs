/**
 * 소개 페이지 편집 화면 마크업 테스트
 *
 *   node --test tests/
 *
 * 실제 관리자 코드가 만드는 HTML을 그대로 받아,
 * 입력값이 빠지지 않고 태그가 어긋나지 않는지 확인합니다.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { aboutPageHtml } from '../src/admin/main.js';
import { ABOUT_PATH, aboutDefaults, parseAbout } from '../src/admin/about.js';

// aboutPageHtml은 base 경로를 읽을 때만 DOM을 봅니다. 테스트에서는 base '/'로 둡니다.
globalThis.document = { getElementById: () => null };

const ROOT = path.resolve(import.meta.dirname, '..');
const about = parseAbout(readFileSync(path.join(ROOT, ABOUT_PATH), 'utf8'));

test('편집 폼에 모든 항목이 data-about 경로로 들어간다', () => {
  const html = aboutPageHtml(about);
  const paths = [...html.matchAll(/data-about="([^"]+)"/g)].map((match) => match[1]);

  for (const expected of [
    'meta.eyebrow',
    'meta.title',
    'meta.description',
    'hero.title',
    'hero.lede',
    'plate.name',
    'plate.nameEn',
    'plate.tagline',
    'intro.heading',
    'topics.heading',
    'rules.heading',
    'monetization.heading',
    'monetization.paragraph',
    'faq.heading',
    'contact.heading',
    'contact.paragraph',
    'updated',
  ]) {
    assert.ok(paths.includes(expected), `${expected} 필드가 없어요`);
  }
});

test('현재 값이 입력란에 그대로 들어간다', () => {
  const html = aboutPageHtml(about);
  assert.ok(html.includes(`value="${about.meta.title}"`));
  assert.ok(html.includes(`value="${about.plate.nameEn}"`));
  assert.ok(html.includes(about.intro.paragraphs[0]));
  assert.equal((html.match(/data-about-list-value/g) || []).length, about.intro.paragraphs.length + about.rules.items.length);
});

test('FAQ는 질문·답 한 쌍씩 그려진다', () => {
  const html = aboutPageHtml(about);
  assert.equal((html.match(/data-about-list="faq.items"/g) || []).length, 1);
  assert.equal((html.match(/repeat__row--faq/g) || []).length, about.faq.items.length);
  for (const item of about.faq.items) {
    assert.ok(html.includes(item.q));
    assert.ok(html.includes(item.a));
  }
});

test('저장 버튼과 배포 안내 자리가 있다', () => {
  const html = aboutPageHtml(about);
  assert.equal((html.match(/id="about-save"/g) || []).length, 1);
  assert.equal((html.match(/id="about-save-2"/g) || []).length, 1);
  assert.ok(html.includes('id="about-deploy"'));
});

test('태그가 어긋나지 않는다', () => {
  const html = aboutPageHtml(about);
  assert.equal((html.match(/<section/g) || []).length, (html.match(/<\/section>/g) || []).length);
  assert.equal((html.match(/<div/g) || []).length, (html.match(/<\/div>/g) || []).length);
  assert.equal((html.match(/<label/g) || []).length, (html.match(/<\/label>/g) || []).length);
  assert.equal((html.match(/<textarea/g) || []).length, (html.match(/<\/textarea>/g) || []).length);
});

test('입력값의 특수문자는 이스케이프된다', () => {
  const html = aboutPageHtml({
    ...aboutDefaults(),
    hero: { title: '"><script>alert(1)</script>', lede: '' },
  });
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});
