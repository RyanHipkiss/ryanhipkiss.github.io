import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    socialImage: z.string().optional(),
    publishDate: z.coerce.date(),
  }),
});

export const collections = { blog };
