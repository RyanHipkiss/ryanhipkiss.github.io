import type { APIRoute } from 'astro';
import { renderShareImage } from '../../utils/renderImage';

// The homepage's share card, matching the per-post cards
export const GET: APIRoute = async () =>
	new Response(
		await renderShareImage('Ryan Hipkiss', {
			eyebrow: '',
			subtitle: 'Senior Software Engineer specialising in Salesforce',
		}),
		{ headers: { 'Content-Type': 'image/png' } },
	);
