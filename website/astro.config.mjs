import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';

const rootPackage = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

export default defineConfig({
  site: 'https://langium-tools.openbrod.org',
  compressHTML: false,
  markdown: { shikiConfig: { theme: 'one-dark-pro' } },
  vite: {
    define: {
      __LANGIUM_TOOLS_VERSION__: JSON.stringify(rootPackage.version),
    },
  },
});
