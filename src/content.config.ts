import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

function removeDupsAndLowerCase(array: string[]) {
	if (!array.length) return array;
	const lowercaseItems = array.map((str) => str.toLowerCase());
	const distinctItems = new Set(lowercaseItems);
	return Array.from(distinctItems);
}

const post = defineCollection({
	loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/post" }),
	schema: ({ image }) =>
		z.object({
			categories: z.array(z.string()).default([]),
			coverImage: z
				.object({
					alt: z.string(),
					src: image(),
				})
				.optional(),
			description: z.string().min(10).max(160).optional(),
			draft: z.boolean().default(false),
			featured: z.boolean().default(false),
			ogImage: z.string().optional(),
			publishDate: z
				.string()
				.or(z.date())
				.transform((val) => new Date(val)),
			tags: z.array(z.string()).default([]).transform(removeDupsAndLowerCase),
			title: z.string().max(120),
			updatedDate: z
				.string()
				.optional()
				.transform((str) => (str ? new Date(str) : undefined)),
			url: z.string().optional(),
		}),
});

const page = defineCollection({
	loader: glob({ pattern: "**/*.md", base: "./src/content/page" }),
	schema: z.object({
		title: z.string().max(120),
		description: z.string().max(160).optional(),
	}),
});

export const collections = { post, page };
