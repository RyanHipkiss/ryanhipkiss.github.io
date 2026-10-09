// Build-time PNGs in the site's charcoal and gold: post share cards and home screen icons
import satori from 'satori';
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const CHARCOAL = '#231F20';
const GOLD = '#FDB913';

let font: Promise<Buffer> | undefined;
const loadFont = () =>
	(font ??= readFile(join(process.cwd(), 'node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-700-normal.woff')));

// Satori takes React-style element objects; this keeps the layouts readable without JSX
const el = (type: string, style: Record<string, unknown>, children?: unknown) => ({ type, props: { style, children } });

async function toPng(node: unknown, width: number, height: number) {
	const svg = await satori(node as any, {
		width,
		height,
		fonts: [{ name: 'Barlow Condensed', data: await loadFont(), weight: 700, style: 'normal' }],
	});
	return sharp(Buffer.from(svg)).png().toBuffer();
}

/** 1200x630 share card: the post header's charcoal band and 120deg gold wedge */
export function renderShareImage(title: string) {
	const titleSize = title.length > 40 ? 72 : 88;
	return toPng(
		el('div', {
			// Explicit size: satori adds padding on top of percentage sizes
			width: 1200,
			height: 630,
			boxSizing: 'border-box',
			display: 'flex',
			flexDirection: 'column',
			justifyContent: 'space-between',
			padding: '72px 80px',
			fontFamily: 'Barlow Condensed',
			backgroundColor: CHARCOAL,
			backgroundImage: `linear-gradient(120deg, ${CHARCOAL} 72%, ${GOLD} 72%)`,
		}, [
			el('div', { fontSize: 36, color: GOLD }, 'Ryan Hipkiss'),
			el('div', { display: 'flex', flexDirection: 'column' }, [
				el('div', { maxWidth: 760, fontSize: titleSize, lineHeight: 1.05, color: 'white' }, title),
				el('div', { width: 80, height: 8, marginTop: 32, backgroundColor: GOLD }),
			]),
			el('div', { fontSize: 30, color: '#ddd' }, 'ryanhipkiss.co.uk'),
		]),
		1200,
		630,
	);
}

/** Square home screen icon: the favicon's gold R on charcoal */
export function renderIcon(size: number) {
	return toPng(
		el('div', {
			width: '100%',
			height: '100%',
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			fontFamily: 'Barlow Condensed',
			fontSize: size * 0.72,
			lineHeight: 1,
			color: GOLD,
			backgroundColor: CHARCOAL,
		}, 'R'),
		size,
		size,
	);
}
