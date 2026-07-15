import { type CollectionEntry, getCollection } from "astro:content";
import { siteConfig } from "@/site-config";

/** Fetch all posts. Drafts are excluded in production builds. */
export async function getAllPosts(): Promise<CollectionEntry<"post">[]> {
	return await getCollection("post", ({ data }) => {
		return import.meta.env.PROD ? !data.draft : true;
	});
}

/** Date used for sorting — `updatedDate` if `siteConfig.sortPostsByUpdatedDate`, else `publishDate`. */
export function getPostSortDate(post: CollectionEntry<"post">): Date {
	return siteConfig.sortPostsByUpdatedDate && post.data.updatedDate !== undefined
		? new Date(post.data.updatedDate)
		: new Date(post.data.publishDate);
}

function plainTextFromMarkdown(markdown: string): string {
	return markdown
		.replace(/^---[\s\S]*?---/, "")
		.replace(/```[\s\S]*?```/g, "")
		.replace(/:::[\s\S]*?:::/g, "")
		.replace(/!\[[^\]]*\]\([^)]+\)/g, "")
		.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
		.replace(/`([^`]+)`/g, "$1")
		.replace(/[*_~>#]/g, "")
		.replace(/\s+/g, " ")
		.trim();
}

function excerptFromMarkdown(markdown: string): string {
	const blocks = markdown.split(/\n{2,}/);
	const firstTextBlock =
		blocks.find((block) => {
			const trimmed = block.trim();
			return (
				trimmed.length > 0 &&
				!trimmed.startsWith("#") &&
				!trimmed.startsWith("```") &&
				!trimmed.startsWith(":::") &&
				!trimmed.startsWith("![")
			);
		}) ?? "";
	const plain = plainTextFromMarkdown(firstTextBlock);
	if (plain.length <= 160) return plain;
	return `${plain.slice(0, 157).replace(/\s+\S*$/, "")}...`;
}

/** Explicit post description, or a generated excerpt from the beginning of the body. */
export function getPostDescription(post: CollectionEntry<"post">): string {
	return post.data.description ?? excerptFromMarkdown(post.body ?? "");
}

/** Root-relative public URL path for a post. */
export function getPostPath(post: CollectionEntry<"post">): string {
	const rawPath = post.data.url?.trim() || `/posts/${post.id}/`;
	if (/^(?:[a-z][a-z\d+.-]*:)?\/\//i.test(rawPath)) {
		throw new Error(`Post URL must be root-relative: ${post.id}`);
	}

	const path = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
	if (path === "/") {
		throw new Error(`Post URL cannot be the site root: ${post.id}`);
	}

	return path.endsWith("/") ? path : `${path}/`;
}

/** Route param for Astro catch-all pages, without leading/trailing slashes. */
export function getPostRouteSlug(post: CollectionEntry<"post">): string {
	return getPostPath(post).replace(/^\/+|\/+$/g, "");
}

/** Sort by `getPostSortDate`, newest first. Mutates input. */
export function sortMDByDate(posts: CollectionEntry<"post">[]): CollectionEntry<"post">[] {
	return posts.sort((a, b) => {
		const aDate = getPostSortDate(a).valueOf();
		const bDate = getPostSortDate(b).valueOf();
		return bDate - aDate;
	});
}

/** Every tag across the given posts, including duplicates. */
export function getAllTags(posts: CollectionEntry<"post">[]): string[] {
	return posts.flatMap((post) => post.data.tags);
}

/** Every category across the given posts, including duplicates. */
export function getAllCategories(posts: CollectionEntry<"post">[]): string[] {
	return posts.flatMap((post) => post.data.categories);
}

/** Unique tags across the given posts, sorted alphabetically. */
export function getUniqueTags(posts: CollectionEntry<"post">[]): string[] {
	return [...new Set(getAllTags(posts))].sort((a, b) => a.localeCompare(b));
}

export function getCategorySlug(category: string): string {
	return category
		.trim()
		.toLowerCase()
		.replace(/&/g, "and")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

/** Unique categories across the given posts, sorted alphabetically by display name. */
export function getUniqueCategories(posts: CollectionEntry<"post">[]): string[] {
	const categoriesBySlug = new Map<string, string>();
	for (const category of getAllCategories(posts)) {
		const slug = getCategorySlug(category);
		if (slug && !categoriesBySlug.has(slug)) categoriesBySlug.set(slug, category);
	}
	return [...categoriesBySlug.values()].sort((a, b) => a.localeCompare(b));
}

/** Unique tags with their post counts, sorted by count (desc) then tag (asc). */
export function getUniqueTagsWithCount(posts: CollectionEntry<"post">[]): [string, number][] {
	const counts = getAllTags(posts).reduce((map, tag) => {
		map.set(tag, (map.get(tag) ?? 0) + 1);
		return map;
	}, new Map<string, number>());
	return [...counts.entries()].sort(([aTag, aCount], [bTag, bCount]) =>
		bCount === aCount ? aTag.localeCompare(bTag) : bCount - aCount,
	);
}

/** Unique categories with their post counts, sorted by count (desc) then category (asc). */
export function getUniqueCategoriesWithCount(posts: CollectionEntry<"post">[]): [string, number][] {
	const counts = getAllCategories(posts).reduce((map, category) => {
		const slug = getCategorySlug(category);
		const current = map.get(slug) ?? { category, count: 0 };
		current.count += 1;
		map.set(slug, current);
		return map;
	}, new Map<string, { category: string; count: number }>());
	return [...counts.values()]
		.map(({ category, count }) => [category, count] as [string, number])
		.sort(([aCategory, aCount], [bCategory, bCount]) =>
			bCount === aCount ? aCategory.localeCompare(bCategory) : bCount - aCount,
		);
}

/** Posts that carry the given tag (order preserved from the input). */
export function getPostsByTag(
	posts: CollectionEntry<"post">[],
	tag: string,
): CollectionEntry<"post">[] {
	return posts.filter((post) => post.data.tags.includes(tag));
}

/** Posts that carry the given category (order preserved from the input). */
export function getPostsByCategory(
	posts: CollectionEntry<"post">[],
	category: string,
): CollectionEntry<"post">[] {
	const slug = getCategorySlug(category);
	return posts.filter((post) =>
		post.data.categories.some((postCategory) => getCategorySlug(postCategory) === slug),
	);
}
