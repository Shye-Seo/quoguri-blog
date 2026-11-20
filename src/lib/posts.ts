import { getCollection, type CollectionEntry } from 'astro:content';
import { categoryBySlug, type CategorySlug } from '../config';

export type Post = CollectionEntry<'blog'>;

const byNewest = (a: Post, b: Post) => b.data.pubDate.getTime() - a.data.pubDate.getTime();

/** 발행된 글만 (draft 제외, 예약 발행일은 그 날짜가 지나야 노출) */
export async function getPublishedPosts(): Promise<Post[]> {
  const now = new Date();
  const posts = await getCollection('blog', ({ data }) => !data.draft && data.pubDate.getTime() <= now.getTime());
  return posts.sort(byNewest);
}

export async function getFeaturedPost(): Promise<Post | undefined> {
  const posts = await getPublishedPosts();
  return posts.find((post) => post.data.featured) ?? posts[0];
}

export function categoryOf(post: Post) {
  return categoryBySlug(post.data.category) ?? categoryBySlug('life')!;
}

export async function countByCategory(): Promise<Record<CategorySlug, number>> {
  const posts = await getPublishedPosts();
  const counts = { tech: 0, beauty: 0, travel: 0, life: 0 } as Record<CategorySlug, number>;
  for (const post of posts) counts[post.data.category] += 1;
  return counts;
}

/** 같은 카테고리 → 같은 태그 순으로 관련 글 고르기 */
export async function getRelatedPosts(post: Post, limit = 3): Promise<Post[]> {
  const posts = (await getPublishedPosts()).filter((item) => item.id !== post.id);
  const score = (item: Post) => {
    const sharedTags = item.data.tags.filter((tag) => post.data.tags.includes(tag)).length;
    return (item.data.category === post.data.category ? 10 : 0) + sharedTags;
  };
  return posts
    .map((item) => ({ item, score: score(item) }))
    .sort((a, b) => b.score - a.score || b.item.data.pubDate.getTime() - a.item.data.pubDate.getTime())
    .slice(0, limit)
    .map(({ item }) => item);
}

export async function getAdjacentPosts(post: Post) {
  const posts = await getPublishedPosts();
  const index = posts.findIndex((item) => item.id === post.id);
  return {
    newer: index > 0 ? posts[index - 1] : undefined,
    older: index >= 0 && index < posts.length - 1 ? posts[index + 1] : undefined,
  };
}
