declare const __LANGIUM_TOOLS_VERSION__: string;

export const SITE = {
  name: 'langium-tools',
  domain: 'https://langium-tools.openbrod.org',
  github: 'https://github.com/borisbrodski/langium-tools',
  npm: 'https://www.npmjs.com/package/langium-tools',
  typedoc: '/api',
  version: __LANGIUM_TOOLS_VERSION__,
  langium: '4.4',
  showcases: 'https://github.com/borisbrodski/langium-tools-showcases',
};

/** On-site index. Another language is another entry, plus a section on the page. */
export const SHOWCASES_PAGE = '/showcases/';

export const GUIDES = [
  {
    href: '/issues/',
    title: 'Document issues',
    blurb: 'Lexer, parser, and validation diagnostics as one list you can print or assert.',
  },
  {
    href: '/generator/',
    title: 'Code generation',
    blurb: 'Collect files in memory, then write them without touching unchanged timestamps.',
  },
  {
    href: '/testing/',
    title: 'Generator tests',
    blurb: 'Commit generated output. CI checks it. Regenerate when the change is intentional.',
  },
  {
    href: '/matchers/',
    title: 'Vitest matchers',
    blurb: 'Assert issues at markers you drop into the DSL text.',
  },
  {
    href: '/java/',
    title: 'Java',
    blurb: 'Package declarations and imports, including classes that share a simple name.',
  },
  {
    href: '/helpers/',
    title: 'Text helpers',
    blurb: 'Indentation-aware templates, case helpers, sorting, and the marker parser.',
  },
] as const;

export const SHOWCASES = [
  {
    slug: 'statemachine',
    title: 'State machine',
    href: `${SITE.showcases}/tree/main/statemachine`,
    blurb:
      'The official Langium state-machine example. Same grammar, same C++ program, plus issues, an in-memory generator, a Java event file, and snapshot tests.',
  },
] as const;
