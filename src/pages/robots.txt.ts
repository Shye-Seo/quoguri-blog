import type { APIRoute } from 'astro';
import { absoluteUrl } from '../lib/site';

export const GET: APIRoute = () => {
  const body = [
    'User-agent: *',
    'Allow: /',
    '',
    '# 네이버·다음 검색 로봇',
    'User-agent: Yeti',
    'Allow: /',
    '',
    'User-agent: Daumoa',
    'Allow: /',
    '',
    `Sitemap: ${absoluteUrl('/sitemap-index.xml')}`,
    '',
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
