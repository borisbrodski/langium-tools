import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://langium-tools.openbrod.org',
  compressHTML: false,
  markdown: { shikiConfig: { theme: 'one-dark-pro' } },
});
