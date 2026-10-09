// Colours for each shirt's illustration, keyed by "Team|Type|Season" as they appear in the sheet.
// Shirts with no entry are drawn as a "?" placeholder. A key listing several kits is for
// identical rows in the sheet (e.g. three Wolves training tops); they're used in order.

export type Pattern = 'plain' | 'stripes' | 'hoops' | 'halves' | 'sash' | 'cross' | 'pair' | 'pinstripes' | 'graphic';

export interface Kit {
	body: string;
	sleeves?: string;
	/** Collar and cuffs */
	trim: string;
	/** Cuffs, when they differ from the collar */
	cuffs?: string;
	pattern?: Pattern;
	/** Colour of the stripes, sash or graphic */
	accent?: string;
}

const WOLVES_GOLD = '#FDB913';
const wolvesHome: Kit = { body: WOLVES_GOLD, trim: '#231F20' };

const KITS: Record<string, Kit | Kit[]> = {
	'Santos Laguna|Third|21/22': { body: '#FFFFFF', trim: '#231F20', pattern: 'graphic', accent: '#8FD19E' },
	'Sassuolo|Away|18/19': { body: '#FFFFFF', trim: '#00A651' },
	'Juventus|Third|18/19': { body: '#4A4D50', trim: '#F4E01B', pattern: 'graphic', accent: '#6B6F73' },
	'Costa Rica|Home|2014': { body: '#D52B1E', trim: '#00247D' },
	'FC Juarez|Home|22/23': { body: '#00843D', trim: '#FFFFFF', pattern: 'cross', accent: '#C8102E' },
	'Valencia|Home|21/22': { body: '#FFFFFF', trim: '#231F20' },
	'Wolves|Home|18/19': wolvesHome,
	'Wolves|Home|19/20': wolvesHome,
	'Wolves|Home|20/21': wolvesHome,
	'Wolves|Home|21/22': wolvesHome,
	'Wolves|Home|22/23': wolvesHome,
	'Wolves|Away|23/24': { body: '#C8102E', trim: WOLVES_GOLD, pattern: 'graphic', accent: '#9AA79A' },
	'Wolves|Training|24/25': [
		{ body: '#231F20', trim: '#C9BFAE', pattern: 'graphic', accent: '#C9BFAE' },
		{ body: '#C9BFAE', trim: '#231F20', pattern: 'graphic', accent: '#231F20' },
		{ body: '#8A8D8F', trim: '#D4FF3A' },
	],
	'Wolves|Home|24/25': wolvesHome,
	'Wolves|Away|24/25': { body: '#231F20', trim: WOLVES_GOLD },
	'Wolves|Third|24/25': { body: '#6B3FA0', trim: '#FF7A1A' },
	'Wolves|Goalkeeper|24/25': { body: '#9FE2BF', trim: '#231F20', pattern: 'graphic', accent: '#3E8E68' },
	'Viborg FF|Away|23/24': { body: '#FFFFFF', trim: '#00843D' },
	'Club Alianza Lima|Home|00/01': { body: '#FFFFFF', trim: '#1B2A5C', pattern: 'stripes', accent: '#1B2A5C' },
	'Red Star Paris|Away|24/25': { body: '#00804A', trim: '#FFFFFF', pattern: 'graphic', accent: '#3FA66B' },
	'Atlas|Special|23/24': { body: '#2B2B2B', trim: '#FFFFFF', pattern: 'graphic', accent: '#555555' },
	'Porto|Away|23/24': { body: '#E3C79A', trim: '#0B1F3F', pattern: 'graphic', accent: '#D1B27F' },
	'Willem II|Away|24/25': { body: '#14213D', trim: '#C9A227', pattern: 'sash', accent: '#F47920' },
	'Defensores de Cambaceres|Home|13/14': { body: '#E30613', trim: '#5C3A21' },
	'Kristiansund|Third|21': { body: '#2E8B57', trim: '#FFFFFF' },
	'Athletic Bilbao|Fourth|24/25': { body: '#231F20', trim: '#D52B1E', cuffs: '#009B48' },
	'Al Nassr|Home|24/25': { body: '#FFD100', trim: '#0033A0' },
	'FC Chitwan|Away|23': { body: '#1F305E', trim: '#FFFFFF' },
	'Tenerife|Home|25/26': { body: '#FFFFFF', trim: '#0055A4' },
	'Barcelona|Home|92/93': { body: '#A50044', trim: '#004D98', pattern: 'stripes', accent: '#004D98' },
	'Valencia|Away|15/16': { body: '#FFD200', trim: '#0047AB', pattern: 'pair', accent: '#DA121A' },
	'West Papua|Home|25/26': { body: '#FFFFFF', trim: '#D21034', pattern: 'stripes', accent: '#1A3E9B' },
	'Glacis United|Home|25/26': { body: '#800030', sleeves: '#99CCEE', trim: '#99CCEE' },
	'Poland|Home|2020': { body: '#FFFFFF', trim: '#DC143C' },
	'FC Dordrecht|Away|25/26': { body: '#231F20', trim: '#069261' },
	'Al Hilal|Away|24/25': { body: '#F2F2F2', trim: '#0055A5', pattern: 'pinstripes', accent: '#D5DAE1' },
};

export interface ShirtRow {
	team: string;
	type: string;
	season: string;
}

const keyOf = (s: ShirtRow) => `${s.team}|${s.type}|${s.season}`;

/** The kit for a shirt; `earlier` is every row before it, so repeated rows get successive kits */
export function kitFor(shirt: ShirtRow, earlier: ShirtRow[]): Kit | undefined {
	const kit = KITS[keyOf(shirt)];
	if (!Array.isArray(kit)) return kit;
	const occurrence = earlier.filter((s) => keyOf(s) === keyOf(shirt)).length;
	return kit[occurrence];
}
