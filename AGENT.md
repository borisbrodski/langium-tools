# langium-tools

Library of helpers for Langium DSL projects. It does not define a language. Consumers import subpath exports, not a single barrel, in application code.

Current Langium line: **4.4.2** (`langium` `^4.4.2`). Langium 4.4 requires Node `^22.22.2 || ^24.15.0 || >=26` and npm `>=10.2.3`, and TypeScript `>=5.8`. This repo pins TypeScript `~5.8.3` because `typedoc` 0.27 only accepts TypeScript 5.0 through 5.8.

## Commands

Run these from the repo root.

- `npm test` runs the full Vitest suite once (`vitest run`). Tests import `src/` directly. A build is not required.
- `npm run test:watch` starts Vitest in watch mode.
- `npm run build` compiles `src/` to `dist/` with `tsc` (declarations included). `tsconfig.json` does not compile `tests/`.
- `npm run lint` runs ESLint on `src/**/*.{ts,tsx}` only. `npm run lint:fix` applies fixes.
- `npm run docs` regenerates the Typedoc site in `typedoc/` (`typedoc.json`, favicon `icons/32px.png`).
- `npm run release` runs tests, builds, then `release-it`. Do not run it unless a release was requested.

There is no Vitest config file. Vitest uses defaults and the `"type": "module"` package.

## Layout

```
src/                  published library (compiled to dist/)
  base/               strings, arrays, marker parser, document issues
  generator/          in-memory generation and disk writer
  lang/java/          Java import manager and file generator
  testing/            Vitest matchers and generator snapshot runner
  index.ts            namespace re-exports (base, generator, testing, lang)
tests/                Vitest, imports src/ (often with a .ts suffix)
typedoc/              Typedoc output (`npm run docs`). Do not edit by hand.
docs/                 built website, served by GitHub Pages. Do not edit by hand.
website/              Astro source for the website.
dist/                 tsc output. Gitignored. Do not edit by hand.
```

`package.json` `"exports"` (what consumers import):

| Subpath | Source |
| --- | --- |
| `langium-tools/base` | `src/base/index.ts` |
| `langium-tools/generator` | `src/generator/index.ts` |
| `langium-tools/testing` | `src/testing/index.ts` |
| `langium-tools/lang` | `src/lang/index.ts` (`export * as java`) |
| `langium-tools/lang/java` | `src/lang/java/index.ts` |

`"main"` / `"types"` point at `dist/index.js`, which re-exports the four namespaces. The `exports` map has no `"."` entry, so Node subpath imports are the supported surface.

`"files"` publishes `dist/**/*` and `src/**/*`. Tests, docs, and configs are excluded.

## Modules

### `base`

- `toFirstUpper` / `toFirstLower` and `adjusted` / `adjustedUnix`. Importing `string.ts` patches `String.prototype` with the same two methods.
- `adjusted` is `toString(expandToNode(...))` from `langium/generate` (platform newlines). `adjustedUnix` strips `\r`.
- `arraySortBy` and `Array.prototype.sortBy`. Importing `arrays.ts` installs the prototype method. Null and undefined sort last.
- `parseMarkedText` strips paired markers (default `<<{|` … `|}>>`) and returns 0-based positions. End offset/column point at the character after the marker. A zero-length marker has `startOffset === endOffset`.
- `getDocumentIssues` / `getDocumentIssueSummary` unify lexer, parser, and validation diagnostics into `DocumentIssue`. Display strings from `documentIssueToString` are 1-based (`at 4:13-20`). Stored positions stay 0-based. Lexer and parser issues are always errors. Validation severity comes from `vscode-languageserver` `DiagnosticSeverity`.

### `generator`

`GeneratedContentManager` collects files in memory per target, then writes them.

- Default target name is `DEFAULT`, overwrite `true` (`DEFAULT_TARGET`).
- `createFile` on `GeneratorManager` records content. Same path with different content or a different `overwrite` flag throws.
- `writeToDisk` skips the write when `overwrite` is false, and also when the file already has the same bytes (keeps mtime). `cleanAndWriteToDisk` deletes files in the output directory that were not generated.
- `getWorkspaceForDocument` picks the workspace URI that is a string prefix of the document URI.
- `getDocumentLocalPath` is the POSIX-relative path inside that workspace, or the document basename.

### `testing`

Importing `langium-tools/testing` (or `src/testing/matchers.ts`) calls `expect.extend` and registers:

- `toHaveNoErrors` (non-error diagnostics ignored by default)
- `toHaveNoIssues`
- `toHaveDocumentIssues`
- `toContainIssue`

`parseWithMarks(parseHelper(...), text, begin, end)` strips markers, parses with `{ validation: true }`, and returns `{ markedText, document, markerData }`.

`langiumGeneratorSuite(dir, options, targets?)` adds one Vitest `test` per immediate subdirectory. `langiumGeneratorTest` runs a single workspace. Mode comes from `options.generateMode`, otherwise from `GENERATOR_TEST=generate` (anything else, including unset, is verify).

Default pipeline, all overridable on `GeneratorTestOptions`:

1. `createServices(NodeFileSystem)` from `langium/node`. Must return exactly one non-shared service when `generateForModel` is used. The grammar language does this as `{ grammar, shared }`.
2. `defaultInitWorkspace` calls `shared.workspace.WorkspaceManager.initializeWorkspace`.
3. `defaultBuildDocuments` takes `LangiumDocuments.all` and `DocumentBuilder.build(documents, { validation: true })`.
4. `defaultValidateDocuments` fails the test when lexer or parser issues exist. Validation diagnostics are skipped here (`skipValidation: true`).
5. Generate, then either write `generated/` plus `generated-metadata.json` (or `<target>-metadata.json`) or compare in-memory content and overwrite flags to those files.

Generate mode deletes `generated/` only when a sibling directory named `dsls` exists.

Peer dependency: `vitest` `~2.0.5`. Matchers are written against that Vitest assertion types.

### `lang/java`

`JavaImportManager` maps a simple class name to one FQN. A second FQN with the same simple name is left fully qualified. Classes in `currentPackage` are not imported. `generateJavaFile` writes `package`, imports, and a `langium/generate` `CompositeGeneratorNode` body through `GeneratorManager.createFile`. `packageToPath` turns dots into slashes.

## Langium APIs this repo depends on

These are the seams that break across Langium majors. Check them first after a bump.

| Import | Symbols |
| --- | --- |
| `langium` | `URI`, `AstNode`, `LangiumDocument`, `EmptyFileSystem`, `Grammar` (type only) |
| `langium/generate` | `expandToNode`, `toString`, `CompositeGeneratorNode` |
| `langium/test` | `parseHelper` |
| `langium/grammar` | `createLangiumGrammarServices`, `LangiumGrammarServices` |
| `langium/lsp` | `LangiumSharedServices`, `DefaultSharedModuleContext` |
| `langium/node` | `NodeFileSystem` |
| `vscode-languageserver` | `DiagnosticSeverity` (transitive dependency of `langium`) |
| `chevrotain` | `IToken` (transitive). Parser issues are `IRecognitionException`; position falls back to `previousToken` via a cast |

Issue collection reads:

- `document.parseResult.lexerErrors` (`offset`, `line`, `column`, `message`). Lexer line/column are 1-based and converted to 0-based.
- `document.parseResult.parserErrors` (`message`, `token.startOffset` / `startLine` / `startColumn`, else `previousToken`). Negative positions are ignored. Chevrotain 13 sets them to `-1` on an inserted EOF. End positions are intentionally not recorded. Chevrotain's end position was unreliable.
- `document.diagnostics[].message` may be `string | MarkupContent` since LSP 3.18. `getDocumentIssues` stores `MarkupContent.value` so `DocumentIssue.message` stays a string.
- `document.diagnostics` for validation (`range` is already 0-based LSP).

`model.$document` supplies the document URI for `GeneratorManager`.

Workspace services used by name: `shared.workspace.WorkspaceManager`, `LangiumDocuments`, `DocumentBuilder`.

Langium 4 notes that already apply here:

- TypeScript must be `>=5.8`. `Grammar` is still a type export from `langium`. Runtime grammar AST helpers live under `GrammarAST`.
- `NodeFileSystem` is `{ fileSystemProvider: () => NodeFileSystemProvider }`, matching `DefaultSharedModuleContext`.
- `createLangiumGrammarServices` still returns `{ shared, grammar }`.
- References may be `Reference | MultiReference`. This library does not walk references.
- CST: `CstNode.root` is derived, `CompositeCstNode.content` is readonly. This library does not touch the CST.
- Chevrotain is 13.x. Lexer and parser message text and token offsets in `tests/base/document-issues.test.ts` and `tests/testing/matchers.test.ts` are pinned to that output. Update the assertions when a Langium or Chevrotain bump changes the text. Keep the assertions specific.

## Tests

`npm test` is the check that matters. Ten files, grouped as:

- `tests/base/` — pure helpers and issue extraction against the Langium grammar (`createLangiumGrammarServices(EmptyFileSystem)`).
- `tests/generator/` — `GeneratedContentManager` disk behavior, including mtime preservation. Temp dirs only allow `.dsl` and `.js` (`tests/common.ts` `removeTmpDirectory`).
- `tests/lang/java/` — import manager and `generateJavaFile`.
- `tests/testing/matchers.test.ts` — matcher messages and marker positions.
- `tests/testing/generator-testing.test.ts` — snapshot runner. `beforeEach` deletes `tests/testing/generator-testing/<kebab-case test name>/` and rebuilds it. `safeDelete` allows only `.json`, `.txt`, `.langium`, and directories. The committed trees under that folder are leftovers of the last run, not hand-written fixtures. A test title rename orphans or collides with a directory.

Issue tests assert exact offsets and message fragments (`unexpected character`, `Expecting: one of these possible Token sequences`, grammar validation wording). A Langium upgrade that only changes message text should update those expectations, not weaken them to `toBeTruthy`. Summary text follows Langium's diagnostic order.

`tests/testing/matchers.test.ts` prints `Root node must be an AstNode` to stderr from `LangiumGrammarValidator.checkAssignmentToFragmentRule` on a deliberately invalid grammar. The test still passes. That log comes from Langium, not from this library.

## Conventions

- ESM. Inside `src/`, relative imports use the `.js` suffix so `Node16` resolution matches the emitted files.
- ESLint requires semicolons in `src/`. The `test/**` override does not match `tests/`, so tests are not linted. Quotes and semicolons in tests are mixed. Match the file you edit.
- Tests may import `src` with a `.ts` suffix or with no suffix. Both work under Vitest. Do not add those imports to code that `tsc` compiles.
- Do not reformat unrelated files.
- `typedoc/`, `docs/`, and `dist/` are generated. Commit `typedoc/` only when docs were explicitly regenerated. `docs/` is the built website.
- Global prototype patches are part of the public `base` API. Keep them side effects of importing those modules.

## Website

`website/` is the product site (Astro). Typedoc stays in `typedoc/`. GitHub Pages for this repo serves the `docs/` folder on `main` at https://langium-tools.openbrod.org.

- From `website/`: `npm run dev`, `npm run build`, `npm run preview`. The build copies `typedoc/` to `website/dist/api`, so the API reference is served at `/api`. `website/public/.nojekyll` is required so Pages does not hide the `_astro` assets.
- `.github/workflows/website.yml` builds on every push and every pull request. On a push to `main` it copies `website/dist` over `docs/` and commits that folder when it changed. Pull requests only build.
- `website/public/CNAME` is `langium-tools.openbrod.org`. Astro `site` is `https://langium-tools.openbrod.org` and `base` stays `/`, because the custom domain is the site root.
- Commit `website/package-lock.json`. Do not edit `website/dist/` or `docs/` by hand. `node_modules` and `website/dist` are gitignored.

## CI

`.github/workflows/build-and-test.yml` runs on push and pull request to `main`: `npm install`, `npm run build`, `npm test`. Node is 22, which must stay inside Langium's engines range (`^22.22.2` or newer 22, or 24.15+, or 26+). Do not pin npm 6. Langium 4 declares `npm >= 10.2.3`, and the lockfile is npm 7+.

## Out of scope for casual edits

- `writeToDisk` skip rules (overwrite flag and identical content).
- Marker offset rules in `parseMarkedText`.
- The `previousToken` fallback for parser errors.
- The requirement that `generateForModel` sees exactly one non-shared service.
- The `dsls` sibling check before `cleanDir`.
