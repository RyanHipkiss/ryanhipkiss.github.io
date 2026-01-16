import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    keywords: z.string(),
    socialImage: z.string(),
    publishDate: z.string(),
  }),
});

export const collections = { blog };
