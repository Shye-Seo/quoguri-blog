import type { APIRoute } from 'astro';
import { absoluteUrl, withBase } from '../lib/site';

/**
 * robots.txt
 * - /admin/ 은 어떤 검색 로봇도 수집하지 않게 막습니다.
 * - /search/ 는 쿼리 결과 페이지라 색인 대상이 아닙니다(개별 글은 모두 sitemap에 있습니다).
 */
export const GET: APIRoute = () => {
  const disallow = [withBase('/admin/'), withBase('/search/')];

  const body = [
    'User-agent: *',
    'Allow: /',
    ...disallow.map((path) => `Disallow: ${path}`),
    '',
    '# 네이버 검색 로봇',
    'User-agent: Yeti',
    'Allow: /',
    ...disallow.map((path) => `Disallow: ${path}`),
    '',
    '# 다음 검색 로봇',
    'User-agent: Daumoa',
    'Allow: /',
    ...disallow.map((path) => `Disallow: ${path}`),
    '',
    '# AI 크롤러 — 필요하면 아래 주석을 풀어 차단하세요',
    '# User-agent: GPTBot',
    '# Disallow: /',
    '',
    `Sitemap: ${absoluteUrl('/sitemap-index.xml')}`,
    `# RSS: ${absoluteUrl('/rss.xml')}`,
    '',
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
