// schema.org structured data, so search engines know who Ryan is and what each post is
const SITE = 'https://ryanhipkiss.co.uk';

export const person = {
	'@type': 'Person',
	'@id': `${SITE}/#person`,
	name: 'Ryan Hipkiss',
	url: `${SITE}/`,
	jobTitle: 'Senior Software Engineer',
	knowsAbout: ['Salesforce', 'Software engineering', 'Python', 'Data analysis'],
	sameAs: ['https://www.linkedin.com/in/ryan-hipkiss-374a8378/', 'https://github.com/RyanHipkiss'],
};

export function homeJsonLd(image: string) {
	return {
		'@context': 'https://schema.org',
		'@graph': [
			{ ...person, image },
			{ '@type': 'WebSite', '@id': `${SITE}/#website`, url: `${SITE}/`, name: 'Ryan Hipkiss', author: { '@id': person['@id'] } },
		],
	};
}

interface PostDetails {
	title: string;
	description: string;
	publishDate: Date;
	url: string;
	image: string;
}

export function postJsonLd({ title, description, publishDate, url, image }: PostDetails) {
	return {
		'@context': 'https://schema.org',
		'@type': 'BlogPosting',
		headline: title,
		description,
		datePublished: publishDate.toISOString(),
		url,
		mainEntityOfPage: url,
		image,
		author: person,
	};
}
