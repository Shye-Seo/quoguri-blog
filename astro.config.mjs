import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import { remarkReviewBlocks } from './src/lib/remark-review-blocks.js';
import { rehypeTableWrap } from './src/lib/rehype-table-wrap.js';

/**
 * 배포 위치에 따라 아래 두 값을 바꾸면 됩니다. (README '도메인 연결' 참고)
 *
 *  1) GitHub Pages 프로젝트 페이지 (기본값)
 *     SITE_URL=https://shye-seo.github.io   BASE_PATH=/quoguri-blog
 *
 *  2) quoguri.com 커스텀 도메인 연결 후
 *     SITE_URL=https://quoguri.com          BASE_PATH=/
 */
const SITE_URL = (process.env.SITE_URL ?? 'https://shye-seo.github.io').replace(/\/+$/, '');
const BASE_PATH = process.env.BASE_PATH ?? '/quoguri-blog';
const base = !BASE_PATH || BASE_PATH === '/' ? undefined : BASE_PATH.replace(/\/+$/, '');

/**
 * 글 본문의 '/images/a.jpg', '/about/' 같은 루트 경로에 base를 붙여 줍니다.
 * (GitHub Pages 프로젝트 페이지처럼 하위 경로에 배포할 때 필요)
 */
function rehypeBasePaths(basePath) {
  if (!basePath) return () => {};
  const rewrite = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'element' && node.properties) {
      for (const key of ['href', 'src']) {
        const value = node.properties[key];
        if (typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')) {
          node.properties[key] = `${basePath}${value}`;
        }
      }
    }
    if (Array.isArray(node.children)) node.children.forEach(rewrite);
  };
  // unified 플러그인(attacher) 형태: 옵션을 받아 변환기를 돌려줍니다.
  return () => (tree) => rewrite(tree);
}

export default defineConfig({
  site: SITE_URL,
  base,
  trailingSlash: 'ignore',
  integrations: [
    // ```verdict / ```proscons / ```price 펜스를 리뷰 블록으로 바꾸는 플러그인은
    // 아래 markdown.processor 에 등록하면 MDX도 그대로 물려받습니다.
    mdx(),
    sitemap({
      // 관리자·검색결과·404는 사이트맵에서 제외합니다.
      filter: (page) =>
        !/\.(json|xml|txt)$/.test(page) &&
        !page.includes('/404') &&
        !page.includes('/admin') &&
        !page.includes('/search/'),
      serialize: (item) => {
        const homePath = base ? `${base.replace(/\/$/, '')}/` : '/';
        const home = new URL(item.url).pathname === homePath;
        const isPost = item.url.includes('/posts/');
        return {
          ...item,
          changefreq: isPost ? 'monthly' : 'weekly',
          priority: home ? 1 : isPost ? 0.8 : 0.6,
        };
      },
    }),
  ],
  markdown: {
    // 글 본문의 루트 경로(/about/, /images/…)에 배포 base를 붙여 주는 파이프라인
    processor: unified({
      gfm: true,
      smartypants: true,
      remarkPlugins: [[remarkReviewBlocks, { base }]],
      // 표를 가로 스크롤 래퍼로 감싸 본문 폭에서 표가 잘리지 않게 합니다.
      rehypePlugins: [rehypeTableWrap, rehypeBasePaths(base)],
    }),
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark-dimmed' },
      wrap: true,
    },
  },
});
