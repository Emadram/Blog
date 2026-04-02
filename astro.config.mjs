// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
	site: 'https://emadram.github.io/Blog',
	base: '/Blog',
	output: 'static',
	trailingSlash: 'always',
	integrations: [tailwind()],
});
