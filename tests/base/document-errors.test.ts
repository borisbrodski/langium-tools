import { EmptyFileSystem, Grammar } from "langium";
import { createLangiumGrammarServices } from "langium/grammar";
import { describe, expect, test } from "vitest";
import { parseHelper } from "langium/test";
import { getDocumentIssues } from "../../src/base/document-errors.ts"

describe('Document Errors', () => {
  test('No errors', async () => {
    const services = createLangiumGrammarServices(EmptyFileSystem)
    const parse = parseHelper<Grammar>(services.grammar);
    const document = await parse(`
      grammar LangiumGrammar

      entry Grammar: id=ID;

      terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
    `)
    const summary = getDocumentIssues(document);
    expect(summary.countTotal).toBe(0);
    expect(summary.countErrors).toBe(0);
    expect(summary.countNonErrors).toBe(0);
    expect(summary.summary).toEqual('No errors');
    expect(summary.message).toEqual('');
  });

  test('Lexer error', async () => {
    const services = createLangiumGrammarServices(EmptyFileSystem)
    const parse = parseHelper<Grammar>(services.grammar);
    const document = await parse(`
      grammar LangiumGrammar

      entry Grammar: id=ID;

      terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      terminal Error: 'err
    `)
    const summary = getDocumentIssues(document);
    expect(summary.countTotal).toBe(2);
    expect(summary.countErrors).toBe(2);
    expect(summary.countNonErrors).toBe(0);
    expect(summary.summary).toEqual('1 lexer error(s), 1 parser error(s)');
    expect(summary.message).toContain('Lexer Errors:');
    expect(summary.message).toContain("unexpected character: ->'<- at offset:");
    expect(summary.message).toContain(summary.summary);
    expect(summary.message).not.toContain('NaN:NaN');
  });

  test('Parser error', async () => {
    const services = createLangiumGrammarServices(EmptyFileSystem)
    const parse = parseHelper<Grammar>(services.grammar);
    const document = await parse(`
      grammar LangiumGrammar

      entry Grammar: id=ID;

      terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      terminal ID2: ;
    `)
    const summary = getDocumentIssues(document);
    expect(summary.countTotal).toBe(1);
    expect(summary.countErrors).toBe(1);
    expect(summary.countNonErrors).toBe(0);
    expect(summary.summary).toEqual('1 parser error(s)');
    expect(summary.message).toContain('Parser Errors:');
    expect(summary.message).toContain("Expecting: one of these possible Token sequences");
    expect(summary.message).toContain(summary.summary);
  });

  test('Diagnosic errors', async () => {
    const services = createLangiumGrammarServices(EmptyFileSystem)
    const parse = parseHelper<Grammar>(services.grammar);
    const document = await parse(`
      grammar LangiumGrammar

      entry Grammar: ID;

      Unused: name=ID;

      terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
    `, { validation: true })
    const summary = getDocumentIssues(document, false);
    expect(summary.countTotal).toBe(3);
    expect(summary.countErrors).toBe(3);
    expect(summary.countNonErrors).toBe(0);
    expect(summary.summary).toEqual('3 error diagnostic(s)');
    expect(summary.message).toContain('Diagnostics:');
    expect(summary.message).toContain("The entry rule cannot be a data type rule.");
    expect(summary.message).toContain(summary.summary);
  });

  test('Diagnosic non-errors', async () => {
    const services = createLangiumGrammarServices(EmptyFileSystem)
    const parse = parseHelper<Grammar>(services.grammar);
    const document = await parse(`
      grammar LangiumGrammar

      entry Grammar: id=ID;

      A: a=ID;

      terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
    `, { validation: true })
    const summary = getDocumentIssues(document);
    expect(summary.countTotal).toBe(1);
    expect(summary.countErrors).toBe(0);
    expect(summary.countNonErrors).toBe(1);
    expect(summary.summary).toEqual('1 non-error diagnostic(s)');
    expect(summary.message).toContain('Diagnostics:');
    expect(summary.message).toContain("This rule is declared but never referenced.\n");
    expect(summary.message).toContain(summary.summary);
  });

  test('Diagnosic non-errors ignored', async () => {
    const services = createLangiumGrammarServices(EmptyFileSystem)
    const parse = parseHelper<Grammar>(services.grammar);
    const document = await parse(`
      grammar LangiumGrammar

      entry Grammar: id=ID;

      A: a=ID;

      terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
    `, { validation: true })
    const summary = getDocumentIssues(document, false);
    expect(summary.countTotal).toBe(0);
    expect(summary.countErrors).toBe(0);
    expect(summary.countNonErrors).toBe(0);
    expect(summary.summary).toEqual('No errors');
    expect(summary.message).toEqual('');
  });

});
