import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date(),
    tags: z.array(z.string()).optional(),
    draft: z.boolean().optional(),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
  }),
});

export const collections = { blog };
