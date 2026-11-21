/**
 * 소개 페이지 데이터 단위 테스트
 *
 *   node --test tests/
 *
 * /admin/ 의 '소개 페이지' 탭이 읽고 쓰는 JSON이
 * 어떤 입력에도 깨지지 않는지 확인합니다.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  ABOUT_PATH,
  aboutDefaults,
  cleanAbout,
  parseAbout,
  serializeAbout,
  todayInput,
  validateAbout,
} from '../src/admin/about.js';

const ROOT = path.resolve(import.meta.dirname, '..');

test('저장소의 실제 소개 데이터를 읽는다', () => {
  const raw = readFileSync(path.join(ROOT, ABOUT_PATH), 'utf8');
  const about = parseAbout(raw);
  assert.equal(about.meta.title, '쿼구리 소개');
  assert.ok(about.hero.title.length > 0);
  assert.ok(about.intro.paragraphs.length >= 2);
  assert.equal(about.faq.items.length, 3);
  assert.equal(validateAbout(about).length, 0);
});

test('빈 객체는 기본값으로 채운다', () => {
  const about = parseAbout('{}');
  const defaults = aboutDefaults();
  assert.equal(about.meta.title, defaults.meta.title);
  assert.equal(about.hero.title, defaults.hero.title);
  assert.deepEqual(about.faq.items, []);
  assert.match(about.updated, /^\d{4}-\d{2}-\d{2}$/);
});

test('저장 → 다시 읽기에서 값이 유지된다', () => {
  const input = {
    meta: { eyebrow: 'about', title: '소개', description: '가'.repeat(60) },
    hero: { title: '안녕하세요', lede: '한 줄 소개' },
    plate: { name: '쿼구리', nameEn: 'quoguri', tagline: '태그' },
    intro: { heading: '소개', paragraphs: ['첫 문단', '둘째 문단'] },
    topics: { heading: '이런 걸 써요' },
    rules: { heading: '기준', items: ['하나', '둘'] },
    monetization: { heading: '고지', paragraph: '본문' },
    faq: { heading: 'FAQ', items: [{ q: '질문', a: '답' }] },
    contact: { heading: '인사', paragraph: '반가워요' },
    updated: '2026-11-21',
  };

  const parsed = parseAbout(serializeAbout(input));
  assert.equal(parsed.meta.title, '소개');
  assert.deepEqual(parsed.intro.paragraphs, ['첫 문단', '둘째 문단']);
  assert.deepEqual(parsed.rules.items, ['하나', '둘']);
  assert.deepEqual(parsed.faq.items, [{ q: '질문', a: '답' }]);
  assert.equal(parsed.updated, '2026-11-21');
});

test('빈 줄은 저장할 때 덜어 낸다', () => {
  const cleaned = cleanAbout({
    ...aboutDefaults(),
    intro: { heading: '소개', paragraphs: ['남길 문단', '', '   '] },
    rules: { heading: '기준', items: ['남길 기준', ''] },
    faq: { heading: 'FAQ', items: [{ q: '질문', a: '답' }, { q: '', a: '' }] },
  });
  assert.deepEqual(cleaned.intro.paragraphs, ['남길 문단']);
  assert.deepEqual(cleaned.rules.items, ['남길 기준']);
  assert.equal(cleaned.faq.items.length, 1);
});

test('점검: 제목·설명·반쪽 질문을 잡아낸다', () => {
  const errors = validateAbout({
    ...aboutDefaults(),
    meta: { eyebrow: 'about', title: '', description: '짧음' },
    hero: { title: '', lede: '' },
    faq: { heading: 'FAQ', items: [{ q: '질문만 있음', a: '' }] },
  });
  assert.ok(errors.some((error) => error.includes('페이지 제목')));
  assert.ok(errors.some((error) => error.includes('히어로 제목')));
  assert.ok(errors.some((error) => error.includes('메타 설명')));
  assert.ok(errors.some((error) => error.includes('질문과 답')));
});

test('점검: 메타 설명 300자 초과를 막는다', () => {
  const errors = validateAbout({
    ...aboutDefaults(),
    meta: { eyebrow: 'about', title: '소개', description: '가'.repeat(301) },
  });
  assert.ok(errors.some((error) => error.includes('300자')));
});

test('점검: 정상 데이터는 통과한다', () => {
  assert.deepEqual(validateAbout(aboutDefaults()), []);
});

test('todayInput은 YYYY-MM-DD 형식이다', () => {
  assert.match(todayInput(), /^\d{4}-\d{2}-\d{2}$/);
});

test('깨진 JSON은 이해할 수 있는 오류로 바꾼다', () => {
  assert.throws(() => parseAbout('{ nope'), /JSON/);
});
