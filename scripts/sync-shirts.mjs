// Pulls the shirt collection spreadsheet into src/data/shirts.json.
// Run with `npm run shirts:sync` after updating the sheet, then commit the JSON.
import { writeFile } from 'node:fs/promises';

const SHEET_CSV = 'https://docs.google.com/spreadsheets/d/142NC0FzPno3VC-pSS0wETsRvUbj1u_ab3E8axZC_Jrw/export?format=csv&gid=0';
const OUT = new URL('../src/data/shirts.json', import.meta.url);

// Corrections applied on top of the sheet, keyed by team. Harmless once the sheet itself is fixed.
const CORRECTIONS = {
	'Costa Rica': { continent: 'North America' },
	'West Papua': { country: 'West Papua', continent: 'Oceania' },
	'FC Dordrecht': { continent: 'Europe' },
};

function parseCsv(text) {
	const rows = [];
	let row = [], field = '', quoted = false;
	for (let i = 0; i < text.length; i++) {
		const c = text[i];
		if (quoted) {
			if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
			else if (c === '"') quoted = false;
			else field += c;
		} else if (c === '"') quoted = true;
		else if (c === ',') { row.push(field); field = ''; }
		else if (c === '\n' || c === '\r') {
			if (c === '\r' && text[i + 1] === '\n') i++;
			row.push(field); rows.push(row); row = []; field = '';
		} else field += c;
	}
	if (field || row.length) { row.push(field); rows.push(row); }
	return rows;
}

// "-" and blanks in the sheet mean "not applicable"
const clean = (value) => {
	const v = (value ?? '').trim();
	return v === '-' ? '' : v;
};

const response = await fetch(SHEET_CSV);
if (!response.ok) throw new Error(`Could not download the sheet: HTTP ${response.status}`);
const [header, ...rows] = parseCsv(await response.text());
const col = (name) => header.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase());
const idx = { team: col('Team'), type: col('Home/Away'), season: col('Season'), league: col('League'), country: col('Country'), continent: col('Continent') };

const shirts = rows
	.filter((r) => clean(r[idx.team]))
	.map((r) => {
		const shirt = Object.fromEntries(Object.entries(idx).map(([key, i]) => [key, clean(r[i])]));
		return { ...shirt, ...CORRECTIONS[shirt.team] };
	});

await writeFile(OUT, JSON.stringify(shirts, null, '\t') + '\n');
console.log(`Saved ${shirts.length} shirts to src/data/shirts.json`);
console.log('New shirts show a "?" until their colours are added to src/data/kits.ts');
