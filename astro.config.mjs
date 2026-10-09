// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import { readdirSync, readFileSync } from 'node:fs';

const SITE = 'https://ryanhipkiss.co.uk';

// Each post's publishDate, so the sitemap tells search engines when pages changed
const postDates = new Map(
	readdirSync('./src/content/blog')
		.filter((file) => /\.mdx?$/.test(file))
		.map((file) => {
			const date = readFileSync(`./src/content/blog/${file}`, 'utf-8').match(/^publishDate:\s*["']?([\d-]+)/m)?.[1];
			return [`${SITE}/blog/${file.replace(/\.mdx?$/, '')}/`, date];
		})
		.filter(([, date]) => date),
);
const newestPost = [...postDates.values()].sort().at(-1);

// https://astro.build/config
export default defineConfig({
	site: SITE,
	integrations: [
		mdx(),
		sitemap({
			serialize(item) {
				const date = item.url === `${SITE}/` ? newestPost : postDates.get(item.url);
				if (date) item.lastmod = new Date(date).toISOString();
				return item;
			},
		}),
	],
});
