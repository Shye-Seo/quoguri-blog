import type { APIRoute } from 'astro';
import { formatDateShort, plainText } from '../lib/site';
import { categoryOf, getPublishedPosts } from '../lib/posts';

/** 검색 페이지(/search/)가 읽는 정적 인덱스 */
export const GET: APIRoute = async () => {
  const posts = await getPublishedPosts();
  const items = posts.map((post) => {
    const category = categoryOf(post);
    return {
      title: post.data.title,
      description: post.data.description,
      path: `/posts/${post.id}/`,
      category: category.label,
      emoji: category.emoji,
      tags: post.data.tags,
      date: formatDateShort(post.data.pubDate),
      text: plainText(post.body ?? '', 600),
    };
  });

  return new Response(JSON.stringify(items), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
