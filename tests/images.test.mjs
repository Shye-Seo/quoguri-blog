/**
 * 대표 사진 업로드 도우미 단위 테스트
 *
 *   node --test tests/
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  MAX_INPUT_BYTES,
  asciiSlug,
  buildUploadPath,
  extensionForMime,
  formatBytes,
  publicPathFor,
  validateImageFile,
} from '../src/admin/images.js';

test('파일 이름은 영문·숫자만 남긴다', () => {
  assert.equal(asciiSlug('My Photo 01'), 'my-photo-01');
  assert.equal(asciiSlug('  Hello, World / Test  '), 'hello-world-test');
  assert.equal(asciiSlug('당근에서 빈티지 디카'), 'cover');
  assert.equal(asciiSlug(''), 'cover');
  assert.equal(asciiSlug('---'), 'cover');
});

test('저장 경로는 public/images/uploads/연/월/이름-날짜-난수.확장자', () => {
  const path = buildUploadPath({
    title: 'Desk Setup 2026',
    ext: 'jpg',
    date: new Date(2026, 10, 21),
    random: 'a1b2c3',
  });
  assert.equal(path, 'public/images/uploads/2026/11/desk-setup-2026-20261121-a1b2c3.jpg');
});

test('확장자는 파일 형식에서 정하고, 모르는 형식은 jpg로 둔다', () => {
  assert.equal(extensionForMime('image/png'), 'png');
  assert.equal(extensionForMime('image/webp'), 'webp');
  assert.equal(extensionForMime('application/pdf'), '');
  assert.match(buildUploadPath({ title: 'x', ext: '', random: 'zzzzzz' }), /\.jpg$/);
});

test('저장소 경로를 사이트 경로로 바꾼다', () => {
  assert.equal(
    publicPathFor('public/images/uploads/2026/11/cover-20261121-a1b2c3.jpg'),
    '/images/uploads/2026/11/cover-20261121-a1b2c3.jpg',
  );
  assert.equal(publicPathFor('images/uploads/a.png'), '/images/uploads/a.png');
});

test('사진이 아닌 파일·너무 큰 파일을 먼저 걸러 낸다', () => {
  assert.match(validateImageFile({ type: 'application/pdf', size: 1024 }), /JPG/);
  assert.match(validateImageFile({ type: 'image/jpeg', size: 0 }), /빈 파일/);
  assert.match(validateImageFile({ type: 'image/png', size: MAX_INPUT_BYTES + 1 }), /너무 커요/);
  assert.equal(validateImageFile({ type: 'image/jpeg', size: 1024 }), '');
});

test('용량 표시', () => {
  assert.equal(formatBytes(900), '900B');
  assert.equal(formatBytes(2048), '2KB');
  assert.equal(formatBytes(3 * 1024 * 1024), '3.0MB');
});
