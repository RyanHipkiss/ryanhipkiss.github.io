// Formats a date the way posts have always displayed it, e.g. "16th January, 2026"
export function formatDate(date: Date): string {
	const day = date.getUTCDate();
	const suffix = day % 10 === 1 && day !== 11 ? 'st'
		: day % 10 === 2 && day !== 12 ? 'nd'
		: day % 10 === 3 && day !== 13 ? 'rd'
		: 'th';
	const month = date.toLocaleString('en-GB', { month: 'long', timeZone: 'UTC' });
	return `${day}${suffix} ${month}, ${date.getUTCFullYear()}`;
}
