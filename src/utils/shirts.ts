import rows from '../data/shirts.json';
import { kitFor, type Kit } from '../data/kits';

export interface Shirt {
	team: string;
	type: string;
	season: string;
	league: string;
	country: string;
	continent: string;
	kit?: Kit;
	/** Stable per-shirt id, used for SVG clip paths */
	id: string;
}

/** First year of a season: "92/93" -> 1992, "2014" -> 2014, "21" -> 2021 */
export function seasonStart(season: string): number | undefined {
	const twoDigit = season.match(/^(\d{2})(\/\d{2})?$/);
	if (twoDigit) {
		const year = Number(twoDigit[1]);
		return year >= 50 ? 1900 + year : 2000 + year;
	}
	const fourDigit = season.match(/^(\d{4})/);
	return fourDigit ? Number(fourDigit[1]) : undefined;
}

export const shirts: Shirt[] = rows
	.map((row, i) => ({ ...row, kit: kitFor(row, rows.slice(0, i)), id: String(i) }))
	.sort((a, b) => a.team.localeCompare(b.team) || (seasonStart(a.season) ?? 0) - (seasonStart(b.season) ?? 0));

const count = (values: string[]) => new Set(values.filter(Boolean)).size;
const oldest = shirts
	.filter((s) => seasonStart(s.season))
	.reduce((a, b) => ((seasonStart(a.season) ?? 0) <= (seasonStart(b.season) ?? 0) ? a : b));

export const shirtStats = {
	shirts: shirts.length,
	teams: count(shirts.map((s) => s.team)),
	countries: count(shirts.map((s) => s.country)),
	continents: count(shirts.map((s) => s.continent)),
	oldest,
};

/** Filter options in a sensible order, keeping only values that appear in the collection */
const TYPE_ORDER = ['Home', 'Away', 'Third', 'Fourth', 'Goalkeeper', 'Special', 'Training'];
export const shirtTypes = [...new Set(shirts.map((s) => s.type))].sort(
	(a, b) => (TYPE_ORDER.indexOf(a) + 1 || 99) - (TYPE_ORDER.indexOf(b) + 1 || 99),
);
export const shirtContinents = [...new Set(shirts.map((s) => s.continent).filter(Boolean))].sort();
