/**
 * 글 상세 표·표기 단위 테스트
 *
 *   node --test tests/
 *
 *  · 본문 표가 스크롤 래퍼(.table-scroll)로 감싸지는지
 *  · 표 CSS 가 display:block 으로 레이아웃을 깨뜨리지 않는지
 *  · 글 화면에 'N분 읽기' 같은 소요시간 표기가 남아 있지 않은지
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import { rehypeTableWrap, TABLE_WRAPPER_CLASS } from '../src/lib/rehype-table-wrap.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const element = (tagName, children = [], properties = {}) => ({ type: 'element', tagName, properties, children });
const text = (value) => ({ type: 'text', value });

test('본문 표를 스크롤 래퍼로 감싼다', () => {
  const table = element('table', [element('tbody', [element('tr', [element('td', [text('값')])])])]);
  const tree = element('root', [element('p', [text('앞')]), table, element('p', [text('뒤')])]);

  rehypeTableWrap()(tree);

  const wrapper = tree.children[1];
  assert.equal(wrapper.tagName, 'div');
  assert.deepEqual(wrapper.properties.className, [TABLE_WRAPPER_CLASS]);
  assert.equal(wrapper.children.length, 1);
  assert.equal(wrapper.children[0], table);
  // 표 바깥 내용은 건드리지 않는다.
  assert.equal(tree.children[0].tagName, 'p');
  assert.equal(tree.children[2].tagName, 'p');
});

test('이미 감싼 표는 두 번 감싸지 않는다', () => {
  const table = element('table', [element('tbody', [])]);
  const wrapper = element('div', [table], { className: [TABLE_WRAPPER_CLASS] });
  const tree = element('root', [wrapper]);

  rehypeTableWrap()(tree);

  assert.equal(tree.children.length, 1);
  assert.equal(tree.children[0], wrapper);
  assert.equal(wrapper.children[0], table);
});

test('표가 없으면 트리를 그대로 둔다', () => {
  const tree = element('root', [element('p', [text('표 없음')])]);
  const before = JSON.stringify(tree);
  rehypeTableWrap()(tree);
  assert.equal(JSON.stringify(tree), before);
});

test('표 CSS: 래퍼가 가로 스크롤을 맡고 표는 table 레이아웃을 유지한다', () => {
  const css = readFileSync(path.join(ROOT, 'src/styles/global.css'), 'utf8');

  const scrollRule = css.match(/\.prose \.table-scroll \{[\s\S]*?\n\}/);
  assert.ok(scrollRule, '.table-scroll 규칙이 있어야 합니다');
  assert.match(scrollRule[0], /overflow-x: auto/);
  assert.match(scrollRule[0], /border-radius/);

  const tableRule = css.match(/\n\.prose table \{[\s\S]*?\n\}/);
  assert.ok(tableRule, '.prose table 규칙이 있어야 합니다');
  assert.match(tableRule[0], /display: table/);
  assert.ok(!/display: block/.test(tableRule[0]), 'display:block 은 표 칸 너비를 무너뜨립니다');
  assert.match(tableRule[0], /width: 100%/);

  const cellRule = css.match(/\.prose th,\n\.prose td \{[\s\S]*?\n\}/);
  assert.ok(cellRule, '.prose th/td 규칙이 있어야 합니다');
  assert.match(cellRule[0], /white-space: normal/);
  assert.match(cellRule[0], /word-break: keep-all/);
  assert.ok(!/white-space: nowrap/.test(cellRule[0]), 'nowrap 은 좁은 화면에서 표를 잘라 냅니다');
});

/** src 아래에서 문구를 찾아 파일 경로를 돌려줍니다. */
function filesContaining(dir, needle) {
  const hits = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) hits.push(...filesContaining(full, needle));
    else if (/\.(astro|ts|js|mjs)$/.test(entry) && readFileSync(full, 'utf8').includes(needle)) hits.push(full);
  }
  return hits;
}

test('글 화면 어디에도 읽기 시간(분 읽기)을 표시하지 않는다', () => {
  const hits = filesContaining(path.join(ROOT, 'src'), '분 읽기');
  assert.deepEqual(hits, [], `읽기 시간 표기가 남아 있습니다: ${hits.join(', ')}`);
  assert.deepEqual(filesContaining(path.join(ROOT, 'src'), 'readingTime('), []);
});
