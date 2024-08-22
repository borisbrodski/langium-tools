import { EmptyFileSystem, Grammar, LangiumDocument } from "langium";
import { createLangiumGrammarServices } from "langium/grammar";
import { parseHelper } from "langium/test";
import { beforeAll, describe, expect, test } from "vitest";
import { getDocumentIssueSummary } from "../../src/base/document-errors.ts";

describe('Document Errors', () => {
  let services: ReturnType<typeof createLangiumGrammarServices>;
  let parse: ReturnType<typeof parseHelper<Grammar>>;
  let document: LangiumDocument<Grammar> | undefined;

  beforeAll(() => {
    services = createLangiumGrammarServices(EmptyFileSystem)
    parse = parseHelper<Grammar>(services.grammar);
  })

  test('No errors', async () => {
    document = await parse(`
      grammar LangiumGrammar

      entry Grammar: id=ID;

      terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
    `)
    const summary = getDocumentIssueSummary(document);
    expect(summary.countTotal).toBe(0);
    expect(summary.countErrors).toBe(0);
    expect(summary.countNonErrors).toBe(0);
    expect(summary.summary).toEqual('No errors');
    expect(summary.message).toEqual('');
  });

  test('Lexer error', async () => {
    document = await parse(`
      grammar LangiumGrammar

      entry Grammar: id=ID;

      terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      terminal Error: 'err
    `)
    const summary = getDocumentIssueSummary(document);
    expect(summary.countTotal).toBe(2);
    expect(summary.countErrors).toBe(2);
    expect(summary.countNonErrors).toBe(0);
    expect(summary.summary).toEqual('1 lexer error(s), 1 parser error(s)');
    expect(summary.message).toContain('Lexer errors:');
    expect(summary.message).toContain("unexpected character: ->'<- at offset:");
    expect(summary.message).toContain(summary.summary);
    expect(summary.message).not.toContain('NaN:NaN');
  });

  test('Lexer error skipped', async () => {
    document = await parse(`
      grammar LangiumGrammar

      entry Grammar: id=ID;

      terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      terminal Error: 'err
    `)
    const summary = getDocumentIssueSummary(document, { skipLexerErrors: true });
    expect(summary.countTotal).toBe(1);
    expect(summary.countErrors).toBe(1);
    expect(summary.countNonErrors).toBe(0);
    expect(summary.summary).toEqual('1 parser error(s)');
  });

  test('Parser error', async () => {
    document = await parse(`
      grammar LangiumGrammar

      entry Grammar: id=ID;

      terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      terminal ID2: ;
    `)
    const summary = getDocumentIssueSummary(document);
    expect(summary.countTotal).toBe(1);
    expect(summary.countErrors).toBe(1);
    expect(summary.countNonErrors).toBe(0);
    expect(summary.summary).toEqual('1 parser error(s)');
    expect(summary.message).toContain('Parser errors:');
    expect(summary.message).toContain("Expecting: one of these possible Token sequences");
    expect(summary.message).toContain(summary.summary);
  });

  test('Parser error skipped', async () => {
    document = await parse(`
      grammar LangiumGrammar

      entry Grammar: id=ID;

      terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      terminal ID2: ;
    `)
    const summary = getDocumentIssueSummary(document, { skipParserErrors: true });
    expect(summary.countTotal).toBe(0);
    expect(summary.countErrors).toBe(0);
    expect(summary.countNonErrors).toBe(0);
    expect(summary.summary).toEqual('No errors');
    expect(summary.message).toEqual('');
  });

  test('Diagnosic errors', async () => {
    document = await parse(`
      grammar LangiumGrammar

      entry Grammar: ID;

      Unused: name=ID;

      terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
    `, { validation: true })
    const summary = getDocumentIssueSummary(document, { skipNonErrorDiagnostics: true });
    expect(summary.countTotal).toBe(3);
    expect(summary.countErrors).toBe(3);
    expect(summary.countNonErrors).toBe(0);
    expect(summary.summary).toEqual('3 error diagnostic(s)');
    expect(summary.message).toContain('Diagnostics:');
    expect(summary.message).toContain("The entry rule cannot be a data type rule.");
    expect(summary.message).toContain(summary.summary);
  });

  test('Diagnosic errors skipped', async () => {
    document = await parse(`
      grammar LangiumGrammar

      entry Grammar: ID;

      Unused: name=ID;

      terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
    `, { validation: true })
    const summary = getDocumentIssueSummary(document, { skipValidation: true });
    expect(summary.countTotal).toBe(0);
    expect(summary.countErrors).toBe(0);
    expect(summary.countNonErrors).toBe(0);
    expect(summary.summary).toEqual('No errors');
    expect(summary.message).toEqual('');
  });

  test('Diagnosic non-errors', async () => {
    document = await parse(`
      grammar LangiumGrammar

      entry Grammar: id=ID;

      A: a=ID;

      terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
    `, { validation: true })
    const summary = getDocumentIssueSummary(document);
    expect(summary.countTotal).toBe(1);
    expect(summary.countErrors).toBe(0);
    expect(summary.countNonErrors).toBe(1);
    expect(summary.summary).toEqual('1 non-error diagnostic(s)');
    expect(summary.message).toContain('Diagnostics:');
    expect(summary.message).toContain("This rule is declared but never referenced.\n");
    expect(summary.message).toContain(summary.summary);
  });

  test('Diagnosic non-errors ignored', async () => {
    document = await parse(`
      grammar LangiumGrammar

      entry Grammar: id=ID;

      A: a=ID;

      terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
    `, { validation: true })
    const summary = getDocumentIssueSummary(document, { skipNonErrorDiagnostics: true });
    expect(summary.countTotal).toBe(0);
    expect(summary.countErrors).toBe(0);
    expect(summary.countNonErrors).toBe(0);
    expect(summary.summary).toEqual('No errors');
    expect(summary.message).toEqual('');
  });

});
