import type { BlogCategory, BlogPost, BlogPostMeta } from "./types";
import { restaurantPosts } from "./posts-restaurants";
import { coffeePosts } from "./posts-coffee";
import { yogaPosts } from "./posts-yoga";
import { salonPosts } from "./posts-salons";
import { retailPosts } from "./posts-retail";
import { generalPosts } from "./posts-general";
import { tacticsPosts } from "./posts-tactics";

export type { BlogCategory, BlogPost, BlogPostMeta };

/**
 * All blog posts. Newest first by `publishedAt`.
 */
export const allPosts: BlogPost[] = [
  ...restaurantPosts,
  ...coffeePosts,
  ...yogaPosts,
  ...salonPosts,
  ...retailPosts,
  ...generalPosts,
  ...tacticsPosts,
].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));

export const allCategories: BlogCategory[] = [
  "Restaurants",
  "Coffee Shops",
  "Yoga & Fitness",
  "Salons & Beauty",
  "Retail & Boutique",
  "Small Business",
  "Tactics & Strategy",
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return allPosts.find(p => p.slug === slug);
}

export function getPostsByCategory(category: BlogCategory): BlogPost[] {
  return allPosts.filter(p => p.category === category);
}

export function getRelatedPosts(post: BlogPost, limit = 3): BlogPost[] {
  return allPosts
    .filter(p => p.slug !== post.slug && p.category === post.category)
    .slice(0, limit);
}

export function getAllPostMetas(): BlogPostMeta[] {
  return allPosts.map(p => ({
    slug: p.slug,
    title: p.title,
    description: p.description,
    category: p.category,
    keyword: p.keyword,
    author: p.author,
    publishedAt: p.publishedAt,
    readingTimeMinutes: p.readingTimeMinutes,
  }));
}

export function searchPosts(query: string): BlogPost[] {
  const q = query.trim().toLowerCase();
  if (!q) return allPosts;
  return allPosts.filter(p => {
    const haystack = `${p.title} ${p.description} ${p.category} ${p.keyword}`.toLowerCase();
    return haystack.includes(q);
  });
}
