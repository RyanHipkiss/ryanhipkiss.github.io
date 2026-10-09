import type { APIRoute } from 'astro';
import { renderShareImage } from '../../utils/renderImage';
import { shirtStats } from '../../utils/shirts';

// Share card for the shirt collection page
export const GET: APIRoute = async () =>
	new Response(
		await renderShareImage('Shirt collection', {
			subtitle: `${shirtStats.shirts} shirts from ${shirtStats.teams} teams in ${shirtStats.countries} countries`,
		}),
		{ headers: { 'Content-Type': 'image/png' } },
	);
