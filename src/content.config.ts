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
    /** public/images 아래 이미지 경로 또는 외부 URL */
    cover: z.string().default('/images/cover-life.jpg'),
    coverAlt: z.string().optional(),
    /** 홈 상단 대표 글로 노출 */
    featured: z.boolean().default(false),
    /** true면 빌드에서 제외 */
    draft: z.boolean().default(false),
    /** 같은 시리즈끼리 묶어 보여 줄 때 사용 (선택) */
    series: z.string().optional(),
  }),
});

export const collections = { blog };
