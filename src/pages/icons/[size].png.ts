import type { APIRoute } from 'astro';
import { renderIcon } from '../../utils/renderImage';

// Home screen icons: 180 for iOS, 192 and 512 for the web manifest
export function getStaticPaths() {
	return [180, 192, 512].map((size) => ({ params: { size: String(size) } }));
}

export const GET: APIRoute = async ({ params }) =>
	new Response(await renderIcon(Number(params.size)), { headers: { 'Content-Type': 'image/png' } });
