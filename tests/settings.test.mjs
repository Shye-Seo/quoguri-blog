/**
 * 사이트 설정(src/content/pages/site.json) 단위 테스트
 *
 *   node --test tests/
 *
 * /admin/ '사이트 설정' 탭이 읽고 쓰는 값이 어떤 입력에도 깨지지 않는지,
 * 검색엔진 소유확인 태그를 통째로 붙여 넣어도 content 값만 남는지 확인합니다.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  SETTINGS_PATH,
  cleanSettings,
  extractMetaToken,
  normalizeAdsenseClient,
  normalizeGa4Id,
  normalizeSettings,
  parseSettings,
  serializeSettings,
  settingsDefaults,
  settingsSummary,
  validateSettings,
} from '../src/admin/settings.js';
import { settingsPageHtml } from '../src/admin/main.js';

// settingsPageHtml은 base 경로를 읽을 때만 DOM을 봅니다. 테스트에서는 base '/'로 둡니다.
globalThis.document = { getElementById: () => null };

const ROOT = path.resolve(import.meta.dirname, '..');

test('저장소의 실제 사이트 설정을 읽는다', () => {
  const raw = readFileSync(path.join(ROOT, SETTINGS_PATH), 'utf8');
  const settings = parseSettings(raw);
  assert.deepEqual(validateSettings(settings), []);
  for (const key of ['contactEmail', 'verification', 'analytics', 'adsense', 'coupang', 'socials']) {
    assert.ok(key in settings, key);
  }
});

test('빈 JSON은 기본값으로 채운다', () => {
  const settings = parseSettings('{}');
  const defaults = settingsDefaults();
  assert.equal(settings.contactEmail, defaults.contactEmail);
  assert.equal(settings.verification.google, '');
  assert.equal(settings.analytics.ga4, '');
  assert.match(settings.updated, /^\d{4}-\d{2}-\d{2}$/);
});

test('서치콘솔 meta 태그를 통째로 붙여 넣어도 content만 남는다', () => {
  assert.equal(
    extractMetaToken('<meta name="google-site-verification" content="AbC-123_xyz" />'),
    'AbC-123_xyz',
  );
  assert.equal(extractMetaToken(`<meta name='naver-site-verification' content='naver123'>`), 'naver123');
  assert.equal(extractMetaToken('google-site-verification: token-value'), 'token-value');
  assert.equal(extractMetaToken('  "plain-token"  '), 'plain-token');
  assert.equal(extractMetaToken(''), '');
});

test('GA4·애드센스는 스니펫을 붙여 넣어도 ID만 남는다', () => {
  assert.equal(normalizeGa4Id('G-ABC1234'), 'G-ABC1234');
  assert.equal(
    normalizeGa4Id(`<script async src="https://www.googletagmanager.com/gtag/js?id=G-XYZ98765"></script>`),
    'G-XYZ98765',
  );
  assert.equal(normalizeAdsenseClient('ca-pub-1234567890123456'), 'ca-pub-1234567890123456');
  assert.equal(normalizeAdsenseClient('pub-1234567890123456'), 'ca-pub-1234567890123456');
  assert.equal(
    normalizeAdsenseClient('<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9999888877776666"></script>'),
    'ca-pub-9999888877776666',
  );
});

test('어떤 모양의 JSON이 와도 화면이 깨지지 않는다', () => {
  const settings = normalizeSettings({ verification: 'nope', analytics: null, socials: [], contactEmail: 42 });
  assert.equal(settings.contactEmail, '');
  assert.deepEqual(settings.verification, { google: '', naver: '' });
  assert.equal(settings.analytics.ga4, '');
  assert.equal(settings.socials.instagram, '');
});

test('점검: 메일·GA4·애드센스·소셜 주소 형식을 잡고, 슬롯은 숫자만 남긴다', () => {
  const input = {
    ...settingsDefaults(),
    contactEmail: 'not-an-email',
    analytics: { ga4: 'UA-1234' },
    adsense: { client: 'pub-abc', slotArticle: '12a', slotHome: '' },
    socials: { instagram: 'instagram.com/quoguri', youtube: '', naverBlog: '', github: '' },
  };
  const errors = validateSettings(input);
  assert.ok(errors.some((error) => error.includes('문의 메일')));
  assert.ok(errors.some((error) => error.includes('GA4')));
  assert.ok(errors.some((error) => error.includes('애드센스')));
  assert.ok(errors.some((error) => error.includes('인스타그램')));

  // 슬롯 ID는 저장 전에 숫자만 남기므로 '12a' 같은 입력도 오류 없이 정리됩니다.
  assert.equal(normalizeSettings(input).adsense.slotArticle, '12');
  assert.ok(!errors.some((error) => error.includes('본문 광고 슬롯')));
});

test('저장 → 다시 읽기에서 값이 유지되고 날짜가 갱신된다', () => {
  const input = {
    contactEmail: 'hello@quoguri.com',
    verification: {
      google: '<meta name="google-site-verification" content="g-token" />',
      naver: 'naver-token',
    },
    analytics: { ga4: 'g-abc123' },
    adsense: { client: 'ca-pub-1234567890123456', slotArticle: '123 456', slotHome: '789' },
    coupang: { partnerId: 'AF1234567' },
    socials: { instagram: 'https://instagram.com/shye__s', youtube: '', naverBlog: '', github: '' },
    updated: '2020-01-01',
  };

  const text = serializeSettings(input);
  const parsed = parseSettings(text);
  assert.equal(parsed.contactEmail, 'hello@quoguri.com');
  assert.equal(parsed.verification.google, 'g-token');
  assert.equal(parsed.analytics.ga4, 'G-ABC123');
  assert.equal(parsed.adsense.slotArticle, '123456');
  assert.equal(parsed.coupang.partnerId, 'AF1234567');
  assert.equal(parsed.socials.instagram, 'https://instagram.com/shye__s');
  assert.match(parsed.updated, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(text.endsWith('\n'), '파일 끝에 줄바꿈을 남깁니다');
  assert.deepEqual(JSON.parse(text), cleanSettings(input));
});

test('요약은 사이트에 실제로 들어가는 다섯 값을 보여 준다', () => {
  const summary = settingsSummary({
    contactEmail: 'hello@quoguri.com',
    verification: { google: 'g', naver: 'n' },
    analytics: { ga4: 'G-ABC123' },
    adsense: { client: 'ca-pub-1234567890123456' },
  });
  assert.deepEqual(summary.map((item) => item.key), ['google', 'naver', 'ga4', 'adsense', 'contact']);
  assert.equal(summary.find((item) => item.key === 'contact').value, 'hello@quoguri.com');
});

test('깨진 JSON은 이해할 수 있는 오류로 바꾼다', () => {
  assert.throws(() => parseSettings('{ nope'), /JSON/);
});

test('설정 화면에 모든 입력란이 data-settings 경로로 들어간다', () => {
  const raw = readFileSync(path.join(ROOT, SETTINGS_PATH), 'utf8');
  const html = settingsPageHtml(parseSettings(raw));
  const paths = [...html.matchAll(/data-settings="([^"]+)"/g)].map((match) => match[1]);

  for (const expected of [
    'verification.google',
    'verification.naver',
    'contactEmail',
    'analytics.ga4',
    'adsense.client',
    'adsense.slotArticle',
    'adsense.slotHome',
    'coupang.partnerId',
    'socials.instagram',
    'socials.youtube',
    'socials.naverBlog',
    'socials.github',
    'updated',
  ]) {
    assert.ok(paths.includes(expected), `${expected} 필드가 없어요`);
  }
});

test('설정 화면: 저장 버튼·배포 안내·요약 자리가 있다', () => {
  const html = settingsPageHtml(settingsDefaults());
  assert.equal((html.match(/id="settings-save"/g) || []).length, 1);
  assert.equal((html.match(/id="settings-save-2"/g) || []).length, 1);
  assert.ok(html.includes('id="settings-deploy"'));
  assert.ok(html.includes('id="settings-summary"'));
  assert.ok(html.includes('비어 있음'), '빈 값은 비어 있음으로 보여 줍니다');
});

test('설정 화면: 태그가 어긋나지 않고 값은 이스케이프된다', () => {
  const html = settingsPageHtml({
    ...settingsDefaults(),
    contactEmail: '"><script>alert(1)</script>',
  });
  assert.equal((html.match(/<section/g) || []).length, (html.match(/<\/section>/g) || []).length);
  assert.equal((html.match(/<div/g) || []).length, (html.match(/<\/div>/g) || []).length);
  assert.equal((html.match(/<label/g) || []).length, (html.match(/<\/label>/g) || []).length);
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});
