/**
 * 게임 전시관 단위 테스트
 *
 *   node --test tests/
 *
 *  · src/data/games.ts 하나로 전시 카드·홈 미리보기가 만들어진다
 *  · 게임마다 실제 페이지·스크립트가 있고, 저장 키가 게임별로 분리된다
 *  · 개인 계정 정보가 게임 코드에 섞이지 않는다
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { games, gameList, gameBySlug } from '../src/data/games.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (...parts) => readFileSync(path.join(ROOT, ...parts), 'utf8');

test('게임 데이터는 필수 정보를 모두 갖추고 순서가 겹치지 않는다', () => {
  assert.ok(gameList.length >= 2, '게임이 두 개 이상 있어야 합니다');
  const slugs = new Set();
  const orders = new Set();

  for (const game of gameList) {
    assert.match(game.slug, /^[a-z0-9-]+$/, `${game.slug}: 주소 조각은 영문 소문자·숫자·하이픈만 씁니다`);
    assert.ok(!slugs.has(game.slug), `${game.slug}: 주소가 겹칩니다`);
    slugs.add(game.slug);
    assert.ok(!orders.has(game.order), `${game.slug}: order 값이 겹칩니다`);
    orders.add(game.order);

    assert.ok(game.title.length > 1, `${game.slug}: 이름`);
    assert.ok(game.summary.length > 10, `${game.slug}: 한 줄 소개`);
    assert.ok(game.features.length >= 2, `${game.slug}: 특징 목록은 2개 이상`);
    assert.ok(game.controls.length >= 1, `${game.slug}: 조작 방법`);
    assert.ok(game.tags.length >= 1, `${game.slug}: 태그`);
    assert.ok(['pet', 'tangerine'].includes(game.preview), `${game.slug}: 미리보기 종류`);
    assert.match(game.accent, /^#[0-9A-Fa-f]{6}$/, `${game.slug}: 포인트 색`);
  }
});

test('모든 게임에 실제 플레이 페이지와 스크립트가 있다', () => {
  for (const game of games) {
    const page = path.join(ROOT, 'src/pages/game', `${game.slug}.astro`);
    assert.ok(existsSync(page), `${game.slug}: ${page} 가 없습니다`);
    const source = readFileSync(page, 'utf8');
    assert.match(source, /game\.css/, `${game.slug}: 게임 스타일을 불러오지 않습니다`);
    assert.match(source, /scripts\/[a-z-]+-game\.js/, `${game.slug}: 게임 스크립트를 불러오지 않습니다`);
    assert.match(source, /type="application\/ld\+json"|jsonLd/, `${game.slug}: 구조화 데이터 없음`);
  }
});

test('전시 페이지는 데이터 파일을 그대로 순회한다', () => {
  const showcase = read('src/pages/game/index.astro');
  assert.match(showcase, /from '\.\.\/\.\.\/data\/games'/, 'games 데이터를 가져와야 합니다');
  assert.match(showcase, /gameList\.map/, '게임 카드는 데이터를 순회해 그려야 합니다');

  const home = read('src/pages/index.astro');
  assert.match(home, /from '\.\.\/data\/games'/, '홈 미리보기도 같은 데이터를 씁니다');
  assert.match(home, /gameList\.map/, '홈 게임 미리보기는 데이터를 순회해 그려야 합니다');

  // 새 게임을 추가할 때 페이지 파일만 만들면 카드가 자동으로 늘어나야 합니다.
  for (const game of games) {
    assert.ok(!showcase.includes(game.title), `전시 페이지에 "${game.title}"이(가) 직접 적혀 있습니다`);
  }
});

test('쿼구리 키우기: 네 가지 돌보기와 저장 키가 있다', () => {
  const page = read('src/pages/game/quoguri-pet.astro');
  const script = read('src/scripts/pet-game.js');

  for (const act of ['feed', 'play', 'sleep', 'pet']) {
    assert.ok(page.includes(`data-act="${act}"`), `돌보기 버튼 ${act} 없음`);
    assert.match(script, new RegExp(`${act}\\(\\)`), `동작 ${act} 구현 없음`);
  }
  for (const gauge of ['fullness', 'mood', 'energy']) {
    assert.ok(page.includes(`data-gauge="${gauge}"`), `게이지 ${gauge} 없음`);
    assert.match(script, new RegExp(gauge), `게이지 ${gauge} 갱신 없음`);
  }
  assert.match(script, /localStorage/, '상태를 브라우저에 저장해야 합니다');
  assert.match(script, /'quoguri-pet-v1'/, '저장 키가 바뀌면 기존 기록을 읽지 못합니다');
  assert.match(script, /aria-valuenow|setAttribute\('aria-valuenow'/, '게이지 접근성 값 갱신 없음');
});

test('쿼구리 귤 받기: 60초·점수·콤보·최고 기록·재시작이 있다', () => {
  const page = read('src/pages/game/tangerine-rush.astro');
  const script = read('src/scripts/tangerine-game.js');

  assert.ok(page.includes('data-arcade-canvas'), '캔버스 없음');
  assert.ok(page.includes('data-arcade-start'), '시작 버튼 없음');
  assert.ok(page.includes('data-arcade-dir="left"') && page.includes('data-arcade-dir="right"'), '좌우 버튼 없음');
  assert.match(script, /const DURATION = 60/, '60초 제한');
  assert.match(script, /'quoguri-tangerine-best-v1'/, '최고 기록 저장 키');
  assert.match(script, /combo/, '콤보 계산');
  assert.match(script, /startGame\(\)/, '재시작 처리');
  assert.match(script, /pointerdown|pointermove/, '터치·드래그 조작');
  assert.match(script, /ArrowLeft|ArrowRight/, '키보드 조작');
});

test('게임 코드에 개인 계정 정보가 남아 있지 않다', () => {
  const files = [
    'src/data/games.ts',
    'src/pages/game/index.astro',
    'src/scripts/pet-game.js',
    'src/scripts/tangerine-game.js',
  ];
  for (const file of files) {
    const text = read(file);
    for (const pattern of [/Shye-Seo/i, /tjtmdgp95/i, /seounghye95/i, /@gmail\.com/i]) {
      assert.ok(!pattern.test(text), `${file}: 개인 정보 패턴 ${pattern} 발견`);
    }
  }
  assert.equal(gameBySlug('quoguri-pet')?.title, '쿼구리 키우기');
  assert.equal(gameBySlug('tangerine-rush')?.title, '쿼구리 귤 받기');
  assert.equal(gameBySlug('없는-게임'), undefined);
});
