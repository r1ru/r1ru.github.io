import { getAllPosts, getPostDescription, getPostPath } from "@/data/post";
import { siteConfig } from "@/site-config";
import { absoluteUrl } from "@/utils/path";
import rss from "@astrojs/rss";

export const GET = async () => {
	const posts = await getAllPosts();

	return rss({
		title: siteConfig.title,
		description: siteConfig.description,
		site: absoluteUrl("/", import.meta.env.SITE),
		items: posts.map((post) => ({
			title: post.data.title,
			description: getPostDescription(post),
			pubDate: post.data.publishDate,
			link: getPostPath(post),
		})),
	});
};
