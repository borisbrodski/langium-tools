import { EmptyFileSystem, Grammar, LangiumDocument } from "langium";
import { createLangiumGrammarServices } from "langium/grammar";
import { parseHelper } from "langium/test";
import { beforeAll, describe, expect, test } from "vitest";
import { DocumentIssue, DocumentIssueSeverity, DocumentIssueSource, getDocumentIssues, getDocumentIssueSummary, getDocumentIssueSummaryFromIssues } from "../../src/base/document-issues.ts";
import { t, using } from "../common";

describe('Document issues', () => {
  describe('getDocumentIssues', () => {
    let services: ReturnType<typeof createLangiumGrammarServices>;
    let parse: ReturnType<typeof parseHelper<Grammar>>;
    let document: LangiumDocument<Grammar> | undefined;

    beforeAll(() => {
      services = createLangiumGrammarServices(EmptyFileSystem)
      parse = parseHelper<Grammar>(services.grammar);
    })

    test('No errors', async () => {
      document = await parse(t`
      grammar LangiumGrammar

      entry Grammar: id=ID;

      terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
    `)
      const issues = getDocumentIssues(document);
      expect(issues).toHaveLength(0);
    });

    test('Lexer error', async () => {
      document = await parse(t`
      grammar LangiumGrammar

      entry Grammar: id=ID;

      terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      terminal Error: 'err
    `)
      const issues = getDocumentIssues(document);
      expect(issues).toHaveLength(2);
      using(issues[0], issue => {
        expect(issue.source).toEqual(DocumentIssueSource.LEXER);
        expect(issue.severity).toEqual(DocumentIssueSeverity.ERROR);
        expect(issue.message).toContain("unexpected character: ->'<- at offset:");
        expect(issue.startOffset).toEqual(98);
        expect(issue.startLine).toEqual(6);
        expect(issue.startColumn).toEqual(17);
      })
      using(issues[1], issue => {
        expect(issue.source).toEqual(DocumentIssueSource.PARSER);
        expect(issue.severity).toEqual(DocumentIssueSeverity.ERROR);
        expect(issue.message).toContain("Expecting token of type");
        expect(issue.startOffset).toEqual(99);
        expect(issue.endOffset).toEqual(101);
        expect(issue.startLine).toEqual(6);
        expect(issue.endLine).toEqual(6);
        expect(issue.startColumn).toEqual(18);
        expect(issue.endColumn).toEqual(20);
      })
    });

    test('Lexer error skipped', async () => {
      document = await parse(t`
      grammar LangiumGrammar

      entry Grammar: id=ID;

      terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      terminal Error: 'err
    `)
      const issues = getDocumentIssues(document, { skipLexerErrors: true });
      expect(issues).toHaveLength(1);
      using(issues[0], issue => {
        expect(issue.source).toEqual(DocumentIssueSource.PARSER);
        expect(issue.severity).toEqual(DocumentIssueSeverity.ERROR);
        expect(issue.message).toContain("Expecting token of type");
      })
    });

    test('Parser error', async () => {
      document = await parse(`
      grammar LangiumGrammar

      entry Grammar: id=ID;

      terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      terminal ID2: ;
    `)
      const issues = getDocumentIssues(document);
      expect(issues).toHaveLength(1);
      using(issues[0], issue => {
        expect(issue.source).toEqual(DocumentIssueSource.PARSER);
        expect(issue.severity).toEqual(DocumentIssueSeverity.ERROR);
        expect(issue.message).toContain("Expecting: one of these possible Token sequences");
        expect(issue.startOffset).toEqual(121);
        expect(issue.endOffset).toEqual(121);
        expect(issue.startLine).toEqual(7);
        expect(issue.endLine).toEqual(7);
        expect(issue.startColumn).toEqual(21);
        expect(issue.endColumn).toEqual(21);
      })
    });

    test('Parser error skipped', async () => {
      document = await parse(t`
      grammar LangiumGrammar

      entry Grammar: id=ID;

      terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      terminal ID2: ;
    `)
      const issues = getDocumentIssues(document, { skipParserErrors: true });
      expect(issues).toHaveLength(0);
    });

    test('Diagnosic errors', async () => {
      document = await parse(t`
      grammar LangiumGrammar

      entry Grammar: ID;

      Unused: name=ID;

      terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
    `, { validation: true })
      const issues = getDocumentIssues(document, { skipNonErrorDiagnostics: true });
      expect(issues).toHaveLength(3);
      using(issues[0], issue => {
        expect(issue.source).toEqual(DocumentIssueSource.VALIDATION);
        expect(issue.severity).toEqual(DocumentIssueSeverity.ERROR);
        expect(issue.message).toContain("The entry rule cannot be a data type rule.");
      })
    });

    test('Diagnosic errors skipped', async () => {
      document = await parse(`
      grammar LangiumGrammar

      entry Grammar: ID;

      Unused: name=ID;

      terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
    `, { validation: true })
      const issues = getDocumentIssues(document, { skipValidation: true });
      expect(issues).toHaveLength(0);
    });

    test('Diagnosic non-errors', async () => {
      document = await parse(`
      grammar LangiumGrammar

      entry Grammar: id=ID;

      A: a=ID;

      terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
    `, { validation: true })
      const issues = getDocumentIssues(document);
      expect(issues).toHaveLength(1);
      using(issues[0], issue => {
        expect(issue.source).toEqual(DocumentIssueSource.VALIDATION);
        expect(issue.severity).toEqual(DocumentIssueSeverity.HINT);
        expect(issue.message).toContain("This rule is declared but never referenced.");
      })
    });

    test('Diagnosic non-errors ignored', async () => {
      document = await parse(`
      grammar LangiumGrammar

      entry Grammar: id=ID;

      A: a=ID;

      terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
    `, { validation: true })
      const issues = getDocumentIssues(document, { skipNonErrorDiagnostics: true });
      expect(issues).toHaveLength(0);
    });
  });
  describe('getDocumentIssueSummaryFromIssues', () => {
    test('No issues', () => {
      const summary = getDocumentIssueSummaryFromIssues([]);
      expect(summary.countTotal).toBe(0);
      expect(summary.countErrors).toBe(0);
      expect(summary.countNonErrors).toBe(0);
      expect(summary.summary).toEqual('No errors');
      expect(summary.message).toEqual('');
    });

    test('Single lexer error', () => {
      const issues: DocumentIssue[] = [
        {
          source: DocumentIssueSource.LEXER,
          severity: DocumentIssueSeverity.ERROR,
          message: "unexpected character: ->'<- at offset: 123, skipped 1 characters.",
          startOffset: 123,
          startLine: 8,
          startColumn: 24,
        },
      ];
      const summary = getDocumentIssueSummaryFromIssues(issues);
      expect(summary.countTotal).toBe(1);
      expect(summary.countErrors).toBe(1);
      expect(summary.countNonErrors).toBe(0);
      expect(summary.summary).toEqual('1 lexer error(s)');
      expect(summary.message).toEqual(
        'Lexer errors:\n' +
        "Error at 8:24 - unexpected character: ->'<- at offset: 123, skipped 1 characters.\n\n" +
        '1 lexer error(s)'
      );
    });

    test('Single parser error', () => {
      const issues: DocumentIssue[] = [
        {
          source: DocumentIssueSource.PARSER,
          severity: DocumentIssueSeverity.ERROR,
          message: "Expecting token of type ';' but found ``.",
        },
      ];
      const summary = getDocumentIssueSummaryFromIssues(issues);
      expect(summary.countTotal).toBe(1);
      expect(summary.countErrors).toBe(1);
      expect(summary.countNonErrors).toBe(0);
      expect(summary.summary).toEqual('1 parser error(s)');
      expect(summary.message).toEqual(
        'Parser errors:\n' + "Error - Expecting token of type ';' but found ``.\n\n" + '1 parser error(s)'
      );
    });

    test('Single validation error', () => {
      const issues: DocumentIssue[] = [
        {
          source: DocumentIssueSource.VALIDATION,
          severity: DocumentIssueSeverity.ERROR,
          message: 'The entry rule cannot be a data type rule.',
          startLine: 4,
          startColumn: 13,
          endLine: 4,
          endColumn: 20,
        },
      ];
      const summary = getDocumentIssueSummaryFromIssues(issues);
      expect(summary.countTotal).toBe(1);
      expect(summary.countErrors).toBe(1);
      expect(summary.countNonErrors).toBe(0);
      expect(summary.summary).toEqual('1 error diagnostic(s)');
      expect(summary.message).toEqual(
        'Diagnostics:\n' +
        'Error at 4:13-20 - The entry rule cannot be a data type rule.\n\n' +
        '1 error diagnostic(s)'
      );
    });

    test('Multiple validation errors', () => {
      const issues: DocumentIssue[] = [
        {
          source: DocumentIssueSource.VALIDATION,
          severity: DocumentIssueSeverity.ERROR,
          message: 'The entry rule cannot be a data type rule.',
          startLine: 4,
          startColumn: 13,
          endLine: 4,
          endColumn: 20,
        },
        {
          source: DocumentIssueSource.VALIDATION,
          severity: DocumentIssueSeverity.ERROR,
          message:
            'This parser rule does not create an object. Add a primitive return type or an action to the start of the rule to force object instantiation.',
          startLine: 4,
          startColumn: 13,
          endLine: 4,
          endColumn: 20,
        },
        {
          source: DocumentIssueSource.VALIDATION,
          severity: DocumentIssueSeverity.ERROR,
          message: 'Data type rules cannot infer a type.',
          startLine: 4,
          startColumn: 7,
          endLine: 4,
          endColumn: 25,
        },
      ];
      const summary = getDocumentIssueSummaryFromIssues(issues);
      expect(summary.countTotal).toBe(3);
      expect(summary.countErrors).toBe(3);
      expect(summary.countNonErrors).toBe(0);
      expect(summary.summary).toEqual('3 error diagnostic(s)');
      expect(summary.message).toEqual(
        'Diagnostics:\n' +
        'Error at 4:13-20 - The entry rule cannot be a data type rule.\n' +
        'Error at 4:13-20 - This parser rule does not create an object. Add a primitive return type or an action to the start of the rule to force object instantiation.\n' +
        'Error at 4:7-25 - Data type rules cannot infer a type.\n\n' +
        '3 error diagnostic(s)'
      );
    });

    test('Mixed issues (lexer and parser errors)', () => {
      const issues: DocumentIssue[] = [
        {
          source: DocumentIssueSource.LEXER,
          severity: DocumentIssueSeverity.ERROR,
          message: "unexpected character: ->'<- at offset: 123, skipped 1 characters.",
          startOffset: 123,
          startLine: 8,
          startColumn: 24,
        },
        {
          source: DocumentIssueSource.PARSER,
          severity: DocumentIssueSeverity.ERROR,
          message: "Expecting token of type ';' but found ``.",
        },
      ];
      const summary = getDocumentIssueSummaryFromIssues(issues);
      expect(summary.countTotal).toBe(2);
      expect(summary.countErrors).toBe(2);
      expect(summary.countNonErrors).toBe(0);
      expect(summary.summary).toEqual('1 lexer error(s), 1 parser error(s)');
      expect(summary.message).toEqual(
        'Lexer errors:\n' +
        "Error at 8:24 - unexpected character: ->'<- at offset: 123, skipped 1 characters.\n" +
        'Parser errors:\n' +
        "Error - Expecting token of type ';' but found ``.\n\n" +
        '1 lexer error(s), 1 parser error(s)'
      );
    });

    test('Mixed issues (all types)', () => {
      const issues: DocumentIssue[] = [
        {
          source: DocumentIssueSource.LEXER,
          severity: DocumentIssueSeverity.ERROR,
          message: "unexpected character: ->'<- at offset: 123, skipped 1 characters.",
          startOffset: 123,
          startLine: 8,
          startColumn: 24,
        },
        {
          source: DocumentIssueSource.PARSER,
          severity: DocumentIssueSeverity.ERROR,
          message: "Expecting token of type ';' but found ``.",
        },
        {
          source: DocumentIssueSource.VALIDATION,
          severity: DocumentIssueSeverity.ERROR,
          message: 'Data type rules cannot infer a type.',
          startLine: 4,
          startColumn: 7,
          endLine: 4,
          endColumn: 25,
        },
      ];
      const summary = getDocumentIssueSummaryFromIssues(issues);
      expect(summary.countTotal).toBe(3);
      expect(summary.countErrors).toBe(3);
      expect(summary.countNonErrors).toBe(0);
      expect(summary.summary).toEqual('1 lexer error(s), 1 parser error(s), 1 error diagnostic(s)');
      expect(summary.message).toEqual(
        'Lexer errors:\n' +
        "Error at 8:24 - unexpected character: ->'<- at offset: 123, skipped 1 characters.\n" +
        'Parser errors:\n' +
        "Error - Expecting token of type ';' but found ``.\n" +
        'Diagnostics:\n' +
        'Error at 4:7-25 - Data type rules cannot infer a type.\n\n' +
        '1 lexer error(s), 1 parser error(s), 1 error diagnostic(s)'
      );
    });

    test('Issues with different severities', () => {
      const issues: DocumentIssue[] = [
        {
          source: DocumentIssueSource.VALIDATION,
          severity: DocumentIssueSeverity.WARNING,
          message: 'Unused variable.',
          startLine: 10,
          startColumn: 5,
          endLine: 10,
          endColumn: 12,
        },
        {
          source: DocumentIssueSource.VALIDATION,
          severity: DocumentIssueSeverity.ERROR,
          message: 'Undefined function.',
          startLine: 15,
          startColumn: 8,
          endLine: 15,
          endColumn: 20,
        },
      ];
      const summary = getDocumentIssueSummaryFromIssues(issues);
      expect(summary.countTotal).toBe(2);
      expect(summary.countErrors).toBe(1);
      expect(summary.countNonErrors).toBe(1);
      expect(summary.summary).toEqual('1 error diagnostic(s), 1 non-error diagnostic(s)');
      expect(summary.message).toEqual(
        'Diagnostics:\n' +
        'Warning at 10:5-12 - Unused variable.\n' +
        'Error at 15:8-20 - Undefined function.\n\n' +
        '1 error diagnostic(s), 1 non-error diagnostic(s)'
      );
    });

    test('Multiple issues of the same type', () => {
      const issues: DocumentIssue[] = [
        {
          source: DocumentIssueSource.LEXER,
          severity: DocumentIssueSeverity.ERROR,
          message: 'Invalid character.',
          startLine: 2,
          startColumn: 5,
        },
        {
          source: DocumentIssueSource.LEXER,
          severity: DocumentIssueSeverity.ERROR,
          message: 'Unrecognized token.',
          startLine: 3,
          startColumn: 10,
        },
      ];
      const summary = getDocumentIssueSummaryFromIssues(issues);
      expect(summary.countTotal).toBe(2);
      expect(summary.countErrors).toBe(2);
      expect(summary.countNonErrors).toBe(0);
      expect(summary.summary).toEqual('2 lexer error(s)');
      expect(summary.message).toEqual(
        'Lexer errors:\n' +
        'Error at 2:5 - Invalid character.\n' +
        'Error at 3:10 - Unrecognized token.\n\n' +
        '2 lexer error(s)'
      );
    });

    test('Issues without position information', () => {
      const issues: DocumentIssue[] = [
        {
          source: DocumentIssueSource.PARSER,
          severity: DocumentIssueSeverity.ERROR,
          message: 'Unexpected end of input.',
        },
        {
          source: DocumentIssueSource.VALIDATION,
          severity: DocumentIssueSeverity.WARNING,
          message: 'Possible null reference.',
        },
      ];
      const summary = getDocumentIssueSummaryFromIssues(issues);
      expect(summary.countTotal).toBe(2);
      expect(summary.countErrors).toBe(1);
      expect(summary.countNonErrors).toBe(1);
      expect(summary.summary).toEqual('1 parser error(s), 1 non-error diagnostic(s)');
      expect(summary.message).toEqual(
        'Parser errors:\n' +
        'Error - Unexpected end of input.\n' +
        'Diagnostics:\n' +
        'Warning - Possible null reference.\n\n' +
        '1 parser error(s), 1 non-error diagnostic(s)'
      );
    });

    test('All types of issues with mixed severities', () => {
      const issues: DocumentIssue[] = [
        {
          source: DocumentIssueSource.LEXER,
          severity: DocumentIssueSeverity.ERROR,
          message: 'Invalid character.',
          startLine: 2,
          startColumn: 5,
        },
        {
          source: DocumentIssueSource.PARSER,
          severity: DocumentIssueSeverity.ERROR,
          message: 'Unexpected token.',
        },
        {
          source: DocumentIssueSource.VALIDATION,
          severity: DocumentIssueSeverity.WARNING,
          message: 'Unused import.',
          startLine: 5,
          startColumn: 1,
        },
        {
          source: DocumentIssueSource.VALIDATION,
          severity: DocumentIssueSeverity.HINT,
          message: 'Consider renaming variable for clarity.',
          startLine: 6,
          startColumn: 10,
        },
        {
          source: DocumentIssueSource.VALIDATION,
          severity: DocumentIssueSeverity.ERROR,
          message: 'Type mismatch.',
          startLine: 8,
          startColumn: 15,
        },
      ];
      const summary = getDocumentIssueSummaryFromIssues(issues);
      expect(summary.countTotal).toBe(5);
      expect(summary.countErrors).toBe(3);
      expect(summary.countNonErrors).toBe(2);
      expect(summary.summary).toEqual('1 lexer error(s), 1 parser error(s), 1 error diagnostic(s), 2 non-error diagnostic(s)');
      expect(summary.message).toEqual(
        'Lexer errors:\n' +
        'Error at 2:5 - Invalid character.\n' +
        'Parser errors:\n' +
        'Error - Unexpected token.\n' +
        'Diagnostics:\n' +
        'Warning at 5:1 - Unused import.\n' +
        'Hint at 6:10 - Consider renaming variable for clarity.\n' +
        'Error at 8:15 - Type mismatch.\n\n' +
        '1 lexer error(s), 1 parser error(s), 1 error diagnostic(s), 2 non-error diagnostic(s)'
      );
    });
  });
  describe('getDocumentIssuesSummary', () => {
    let services: ReturnType<typeof createLangiumGrammarServices>;
    let parse: ReturnType<typeof parseHelper<Grammar>>;
    let document: LangiumDocument<Grammar> | undefined;

    beforeAll(() => {
      services = createLangiumGrammarServices(EmptyFileSystem)
      parse = parseHelper<Grammar>(services.grammar);
    })
    test('Lexer and parser errors', async () => {
      document = await parse(t`
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
      expect(summary.message).toEqual(t`
        Lexer errors:
        Error at 6:17 - unexpected character: ->'<- at offset: 98, skipped 1 characters.
        Parser errors:
        Error at 6:18-20 - Expecting token of type ';' but found \`\`.

        1 lexer error(s), 1 parser error(s)
      `);
    });
    test('Diagnosic errors', async () => {
      document = await parse(t`
      grammar LangiumGrammar

      entry Grammar: ID;

      Unused: name=ID;

      terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
    `, { validation: true })
      const summary = getDocumentIssueSummary(document);
      expect(summary.countTotal).toBe(4);
      expect(summary.countErrors).toBe(3);
      expect(summary.countNonErrors).toBe(1);
      expect(summary.summary).toEqual('3 error diagnostic(s), 1 non-error diagnostic(s)');
      expect(summary.message).toEqual(t`
        Diagnostics:
        Error at 2:6-13 - The entry rule cannot be a data type rule.
        Error at 2:6-13 - This parser rule does not create an object. Add a primitive return type or an action to the start of the rule to force object instantiation.
        Hint at 4:0-6 - This rule is declared but never referenced.
        Error at 2:0-18 - Data type rules cannot infer a type.

        3 error diagnostic(s), 1 non-error diagnostic(s)
      `);
    });
  });
});
