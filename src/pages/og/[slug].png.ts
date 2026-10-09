import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { renderShareImage } from '../../utils/renderImage';

// One share card per post, built at /og/<slug>.png
export async function getStaticPaths() {
	return (await getCollection('blog')).map((post) => ({
		params: { slug: post.slug },
		props: { title: post.data.title },
	}));
}

export const GET: APIRoute = async ({ props }) =>
	new Response(await renderShareImage(props.title), { headers: { 'Content-Type': 'image/png' } });
