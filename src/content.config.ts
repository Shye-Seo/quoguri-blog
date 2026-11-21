import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * 글은 src/content/blog/ 아래에 .md 또는 .mdx 파일로 추가하면 됩니다.
 * 파일 이름이 그대로 주소가 됩니다. 예) my-first-post.md → /posts/my-first-post/
 */
const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string().max(120),
    description: z.string().max(300),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z.enum(['tech', 'beauty', 'travel', 'life']),
    tags: z.array(z.string()).default([]),
    /**
     * 대표 사진은 선택입니다. 비워 두면 카테고리 색과 제목으로 만든
     * 타이포그래피 커버가 자동으로 그려집니다. (그림 파일 불필요)
     * public/images 아래 경로 또는 외부 URL. 예) /images/my-photo.jpg
     */
    cover: z.string().optional(),
    coverAlt: z.string().optional(),
    /** 홈 상단 대표 글로 노출 */
    featured: z.boolean().default(false),
    /** true면 빌드에서 제외 */
    draft: z.boolean().default(false),
    /** 같은 시리즈끼리 묶어 보여 줄 때 사용 (선택) */
    series: z.string().optional(),
    /** 검색 결과 제목을 따로 쓰고 싶을 때 (선택) */
    seoTitle: z.string().max(120).optional(),
    /**
     * 쿠팡 파트너스 제휴 고지 — true면 글 본문 맨 위에 공정위 공시 배너가 자동으로 붙습니다.
     * 본문에 CoupangCard나 link.coupang.com 링크가 있으면 이 값을 켜지 않아도 자동으로 붙습니다.
     */
    coupang: z.boolean().default(false),
  }),
});

export const collections = { blog };
