// import aws from 'astro-sst/lambda';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
import { defineConfig } from 'astro/config';

import { SITE_METADATA } from './src/consts.ts';
import { remarkReadingTime } from './src/plugins/reading-time.mjs';

// https://astro.build/config
export default defineConfig({
  site: SITE_METADATA.siteUrl,
  markdown: { remarkPlugins: [remarkReadingTime] },
  integrations: [mdx(), sitemap(), tailwind()],
});
