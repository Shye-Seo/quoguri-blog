import rss from '@astrojs/rss';
import { site } from '../config';
import { absoluteUrl, withBase } from '../lib/site';
import { categoryOf, getPublishedPosts } from '../lib/posts';

export async function GET() {
  const posts = await getPublishedPosts();

  return rss({
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    site: absoluteUrl('/'),
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: withBase(`/posts/${post.id}/`),
      categories: [categoryOf(post).label, ...post.data.tags],
      author: site.author.name,
    })),
    customData: `<language>ko-KR</language><copyright>© ${new Date().getFullYear()} ${site.name}</copyright>`,
  });
}
