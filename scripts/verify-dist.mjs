#!/usr/bin/env node
/**
 * 빌드 결과 검증 — 배포 전에 자동으로 확인하는 항목
 *
 *   node scripts/verify-dist.mjs
 *
 * 1) 개인 계정·토큰 흔적이 HTML/JS/JSON에 없는지 (배포 도메인 제외)
 * 2) 페이지마다 h1 1개, canonical, description, OG, 파싱 가능한 JSON-LD
 * 3) robots.txt의 /admin/ 차단과 sitemap 안내
 * 4) sitemap에 /admin/·/search/가 없는지
 * 5) 관리자 페이지의 noindex, 남아 있는 삭제된 그림 참조
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';

const DIST = path.resolve(import.meta.dirname, '../dist');
const SOURCE = path.resolve(import.meta.dirname, '../src');

const problems = [];
const notes = [];

function walk(dir, filter = () => true) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...walk(full, filter));
    else if (filter(full)) out.push(full);
  }
  return out;
}

const rel = (file) => path.relative(DIST, file);

/* ── 1. 개인정보 흔적 ──────────────────────────────────── */
const PERSONAL = [
  [/Shye-Seo/i, 'GitHub 아이디(대소문자 무시)'],
  [/tjtmdgp95/i, '개인 메일 계정'],
  [/seounghye95/i, '네이버 메일 계정'],
  [/@gmail\.com/i, '지메일 주소'],
  [/github_pat_[A-Za-z0-9_]+/i, 'GitHub 토큰'],
  [/ghp_[A-Za-z0-9]{20,}/, 'GitHub 토큰'],
];

const textFiles = walk(DIST, (file) => /\.(html|js|json|xml|xsl|txt|css|svg)$/.test(file));
const sourceFiles = walk(SOURCE, (file) => /\.(ts|js|astro|css|json|md|mdx)$/.test(file));

const HOST_ONLY = /shye-seo\.github\.io/gi;

for (const file of [...textFiles, ...sourceFiles]) {
  const isDist = file.startsWith(DIST);
  let text = readFileSync(file, 'utf8');
  // 배포 도메인은 호스팅이 정한 주소라 지울 수 없습니다. 그 부분만 잠시 가립니다.
  if (isDist) text = text.replace(HOST_ONLY, '<hosт>');
  for (const [pattern, label] of PERSONAL) {
    const match = pattern.exec(text);
    if (match) {
      problems.push(`${isDist ? 'dist' : 'src'} · ${isDist ? rel(file) : path.relative(SOURCE, file)} — ${label} 노출: "${match[0]}"`);
    }
  }
}

/* ── 2. 페이지 구조 ────────────────────────────────────── */
const pages = walk(DIST, (file) => file.endsWith('.html'));
for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  const name = rel(file);
  const isAdmin = name.startsWith('admin');
  const is404 = name === '404.html';
  const isSearch = name.startsWith('search');

  const h1 = html.match(/<h1\b/g) || [];
  if (!isAdmin && h1.length !== 1) problems.push(`${name} — h1이 ${h1.length}개입니다`);
  if (!isAdmin && !/<meta name="description" content="[^"]+"/.test(html)) problems.push(`${name} — description 메타 없음`);
  if (!isAdmin && !/<link rel="canonical" href="https?:\/\/[^"]+"/.test(html)) problems.push(`${name} — canonical 없음`);
  if (!isAdmin && !/<meta property="og:image" content="https?:\/\/[^"]+"/.test(html)) problems.push(`${name} — og:image 없음`);
  if (!isAdmin && !/<meta name="twitter:card"/.test(html)) problems.push(`${name} — twitter 카드 없음`);

  if (isAdmin || isSearch || is404) {
    if (!/<meta name="robots" content="noindex/.test(html)) problems.push(`${name} — noindex 없음`);
  } else if (!/<meta name="robots" content="index/.test(html)) {
    problems.push(`${name} — index 로봇 메타 없음`);
  }

  // JSON-LD 파싱
  const blocks = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [];
  if (!isAdmin && !is404 && !isSearch && blocks.length === 0) problems.push(`${name} — JSON-LD 없음`);
  for (const block of blocks) {
    const json = block.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '');
    try {
      JSON.parse(json);
    } catch {
      problems.push(`${name} — JSON-LD 파싱 실패`);
    }
  }

  // 삭제한 그림 참조
  for (const image of ['cover-beauty', 'cover-camera', 'cover-life', 'cover-tech', 'hero-quokka', 'quokka-avatar']) {
    if (html.includes(image)) problems.push(`${name} — 삭제한 그림 참조: ${image}`);
  }

  // 관리자 페이지에 로그인 폼이 실제로 그려지는지(자바스크립트 문자열 기준)
  if (isAdmin && !/admin-root/.test(html)) problems.push(`${name} — admin-root 없음`);
}

/* ── 3~4. robots.txt · sitemap ─────────────────────────── */
const robotsPath = path.join(DIST, 'robots.txt');
if (!existsSync(robotsPath)) problems.push('robots.txt 없음');
else {
  const robots = readFileSync(robotsPath, 'utf8');
  if (!/Disallow: \/quoguri-blog\/admin\//.test(robots) && !/Disallow: \/admin\//.test(robots)) {
    problems.push('robots.txt — /admin/ 차단 없음');
  }
  if (!/Sitemap: https?:\/\/\S+/.test(robots)) problems.push('robots.txt — Sitemap 줄 없음');
}

const sitemapDir = path.join(DIST);
const sitemapFiles = readdirSync(sitemapDir).filter((file) => /^sitemap.*\.xml$/.test(file));
if (sitemapFiles.length === 0) problems.push('sitemap 없음');
for (const file of sitemapFiles) {
  const xml = readFileSync(path.join(sitemapDir, file), 'utf8');
  if (/\/admin\//.test(xml)) problems.push(`${file} — 관리자 페이지가 포함됨`);
  if (/\/search\//.test(xml)) problems.push(`${file} — 검색 페이지가 포함됨`);
}

/* ── 5. 필수 산출물 ────────────────────────────────────── */
for (const required of ['index.html', 'rss.xml', 'rss.xsl', 'search-index.json', 'admin/index.html', 'apple-touch-icon.png', 'images/og-default.jpg']) {
  if (!existsSync(path.join(DIST, required))) problems.push(`필수 파일 없음: ${required}`);
}

/* ── 5-1. RSS 스타일시트 연결 ─────────────────────────── */
const rssPath = path.join(DIST, 'rss.xml');
if (existsSync(rssPath)) {
  const rss = readFileSync(rssPath, 'utf8');
  if (!/<\?xml-stylesheet[^>]*href="[^"]*rss\.xsl"/.test(rss)) {
    problems.push('rss.xml — rss.xsl 스타일시트 연결 없음');
  }
  if (!/<link>https?:\/\/\S+<\/link>/.test(rss)) problems.push('rss.xml — 글이나 채널 링크가 절대 URL이 아님');
}
const xslPath = path.join(DIST, 'rss.xsl');
if (existsSync(xslPath)) {
  const xsl = readFileSync(xslPath, 'utf8');
  if (!/<xsl:stylesheet[^>]*version="1\.0"/.test(xsl)) problems.push('rss.xsl — XSLT 1.0 선언 없음');
  if (!/<xsl:template match="\/rss">/.test(xsl)) problems.push('rss.xsl — /rss 템플릿 없음');
}

/* ── 5-2. 폰트·검색바 ─────────────────────────────────── */
const homeHtml = existsSync(path.join(DIST, 'index.html'))
  ? readFileSync(path.join(DIST, 'index.html'), 'utf8')
  : '';
if (homeHtml && /Gowun\s*Batang/i.test(homeHtml)) problems.push('index.html — 명조체(Gowun Batang) 참조가 남아 있음');
const cssFiles = walk(DIST, (file) => file.endsWith('.css'));
const allCss = cssFiles.map((file) => readFileSync(file, 'utf8')).join('\n');
if (cssFiles.length && !/Paperlogy/.test(allCss)) problems.push('CSS — Paperlogy 폰트 정의 없음');
if (homeHtml && !/id="header-search"/.test(homeHtml)) problems.push('index.html — 헤더 검색창 없음');
if (homeHtml && !/action="[^"]*search\/"/.test(homeHtml)) problems.push('index.html — 헤더 검색 실행 주소 없음');

/* ── 5-3. 소개 페이지가 데이터 파일을 읽는지 ────────────── */
const aboutJsonPath = path.join(SOURCE, 'content/pages/about.json');
const aboutPage = path.join(DIST, 'about/index.html');
if (!existsSync(aboutJsonPath)) problems.push('src/content/pages/about.json 없음');
else if (existsSync(aboutPage)) {
  const about = JSON.parse(readFileSync(aboutJsonPath, 'utf8'));
  const html = readFileSync(aboutPage, 'utf8');
  const first = about.faq?.items?.[0]?.q;
  if (first && !html.includes(first)) problems.push('about/index.html — about.json의 FAQ가 반영되지 않음');
  if (about.hero?.title && !html.includes(about.hero.title)) problems.push('about/index.html — about.json의 히어로 제목이 반영되지 않음');
}

/* ── 6. 공개 페이지에 관리자 링크가 없는지 ─────────────── */
for (const file of pages) {
  const name = rel(file);
  if (name.startsWith('admin')) continue;
  const html = readFileSync(file, 'utf8');
  if (/href="[^"]*\/admin\//.test(html)) problems.push(`${name} — 공개 페이지에서 관리자 링크 발견`);
}

/* ── 결과 ─────────────────────────────────────────────── */
notes.push(`페이지 ${pages.length}개, dist 파일 ${textFiles.length}개 검사`);
notes.push(`개인정보 패턴 ${PERSONAL.length}종 검사 (배포 도메인 shye-seo.github.io는 호스팅 주소라 예외)`);

console.log(notes.map((note) => `· ${note}`).join('\n'));
if (problems.length) {
  console.error(`\n✗ ${problems.length}건 문제가 있어요:`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log('\n✓ 모든 검증을 통과했어요.');
