import { EmptyFileSystem, Grammar, LangiumDocument } from 'langium';
import { createLangiumGrammarServices } from 'langium/grammar';
import { parseHelper } from 'langium/test';
import 'vitest';
import { beforeAll, describe, expect, test } from 'vitest';
import '../../src/testing/matchers';
import { ParsedDocument, parseWithMarks } from '../../src/testing/parser-tools';
import { t } from '../common';
import { DocumentIssueSeverity, DocumentIssueSource } from '../../src/base/document-issues';

describe('Langium matchers', () => {
  let services: ReturnType<typeof createLangiumGrammarServices>;
  let parse: ReturnType<typeof parseHelper<Grammar>>;
  let document: LangiumDocument<Grammar> | undefined;

  beforeAll(() => {
    services = createLangiumGrammarServices(EmptyFileSystem);
    parse = parseHelper<Grammar>(services.grammar);
  });

  describe('toHaveNoErrors', () => {
    test('no errors', async () => {
      document = await parse(
        `
        grammar LangiumGrammar

        entry Grammar: id=ID;

        A: a=ID;

        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `,
        { validation: true }
      );

      expect(document).toHaveNoErrors();
    });

    test('lexer and parser errors', async () => {
      document = await parse(`
        grammar LangiumGrammar

        entry Grammar: id=ID;

        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
        terminal Error: 'err
      `);
      expect(() => {
        expect(document).toHaveNoErrors();
      }).toThrow('Lexer errors');
    });

    test('lexer and parser errors ignoring both', async () => {
      document = await parse(`
        grammar LangiumGrammar

        entry Grammar: id=ID;

        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
        terminal Error: 'err
      `);
      expect(document).toHaveNoErrors({ ignoreLexerErrors: true, ignoreParserErrors: true });
    });

    test('lexer and parser errors ignoring lexer errors', async () => {
      document = await parse(`
        grammar LangiumGrammar

        entry Grammar: id=ID;

        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
        terminal Error: 'err
      `);
      expect(() => {
        expect(document).toHaveNoErrors({ ignoreLexerErrors: true });
      }).toThrow('Parser errors');
    });

    test('lexer and parser errors ignoring parser errors', async () => {
      document = await parse(`
        grammar LangiumGrammar

        entry Grammar: id=ID;

        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
        terminal Error: 'err
      `);
      expect(() => {
        expect(document).toHaveNoErrors({ ignoreParserErrors: true });
      }).toThrow('Lexer errors');
    });

    test('validation errors', async () => {
      document = await parse(
        `
        grammar LangiumGrammar

        entry Grammar: ID;

        Unused: name=ID;

        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `,
        { validation: true }
      );
      expect(() => {
        expect(document).toHaveNoErrors();
      }).toThrow('Diagnostics');
    });

    test('validation errors ignoring diagnostics', async () => {
      document = await parse(
        `
        grammar LangiumGrammar

        entry Grammar: ID;

        Unused: name=ID;

        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `,
        { validation: true }
      );
      expect(document).toHaveNoErrors({ ignoreValidationErrors: true });
    });

    test('using ParsedDocument with toHaveNoErrors works', async () => {
      const document = await parseWithMarks(
        parse,
        t`
        grammar LangiumGrammar

        entry Grammar: name=ID;

        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `
      );
      expect(document).toHaveNoErrors();
    });

    test('using LangiumDocument with toHaveDocumentIssues shows nice error message', async () => {
      document = await parse(
        `
        grammar LangiumGrammar

        entry Grammar: name=ID;

        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `,
        { validation: true }
      );
      expect(() => {
        expect((document as unknown) as ParsedDocument).toHaveDocumentIssues([]);
      }).toThrow("Expected ParsedDocument object. Use 'parseMarkedDSL' to parse.");
    });

    test('expect validation issue matched by severity and text', async () => {
      const document = await parseWithMarks(
        parse,
        t`
        grammar LangiumGrammar

        entry Grammar: name=ID;

        <<{|Unused|}>>d: name=ID;

        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `
      );
      expect(document).toHaveDocumentIssues(
        [
          {
            severity: DocumentIssueSeverity.HINT,
            message: 'This rule is declared but never referenced.',
          },
        ],
        { ignoreNonErrorDiagnostics: false }
      );
    });

    test('expect validation issue matched by severity and wrong text', async () => {
      const document = await parseWithMarks(
        parse,
        t`
        grammar LangiumGrammar

        entry Grammar: name=ID;

        <<{|Unused|}>>d: name=ID;

        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `
      );
      expect(() => {
        expect(document).toHaveDocumentIssues([
          {
            severity: DocumentIssueSeverity.HINT,
            message: 'This rule is declared but never ever referenced.',
          },
        ]);
      }).toThrow('Unmatched actual issues');
    });
  });

  describe('toHaveNoIssues', () => {
    test('no issues', async () => {
      document = await parse(
        `
        grammar LangiumGrammar

        entry Grammar: id=ID;

        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `,
        { validation: true }
      );

      expect(document).toHaveNoIssues();
    });

    test('has warnings, should fail', async () => {
      document = await parse(
        `
        grammar LangiumGrammar

        entry Grammar: id=ID;

        // Unused rule
        B: b=ID;

        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `,
        { validation: true }
      );

      expect(() => {
        expect(document).toHaveNoIssues();
      }).toThrow('Diagnostics');
    });

    test('has warnings, ignore non-error diagnostics', async () => {
      document = await parse(
        `
        grammar LangiumGrammar

        entry Grammar: id=ID;

        A: a=ID;

        // Unused rule
        B: b=ID;

        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `,
        { validation: true }
      );

      expect(document).toHaveNoIssues({ ignoreNonErrorDiagnostics: true });
    });

    test('has errors, should fail', async () => {
      document = await parse(`
        grammar LangiumGrammar

        entry Grammar: id=ID;

        A: a=ID;

        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;

        // Syntax error
        terminal Error: 'err
      `);

      expect(() => {
        expect(document).toHaveNoIssues();
      }).toThrow('Lexer errors');
    });

    test('using ParsedDocument with toHaveNoIssues works', async () => {
      const document = await parseWithMarks(
        parse,
        t`
        grammar LangiumGrammar

        entry Grammar: name=ID;

        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `
      );
      expect(document).toHaveNoIssues();
    });
  });

  describe('toHaveDocumentIssues', () => {
    test('expect validation issue matched by source, severity, message, and markerId', async () => {
      const document = await parseWithMarks(parse, t`
        grammar LangiumGrammar
        entry Grammar: name=ID;
        <<{|Unused|}>>: name=ID;
        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `);

      expect(document).toHaveDocumentIssues([{
        source: DocumentIssueSource.VALIDATION,
        severity: DocumentIssueSeverity.HINT,
        message: 'This rule is declared but never referenced.',
        markerId: 0,
      }]);
    });
    test('expect validation issue UNmatched by severity', async () => {
      const document = await parseWithMarks(parse, t`
        grammar LangiumGrammar
        entry Grammar: name=ID;
        <<{|Unused|}>>: name=ID;
        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `);

      expect(() => {
        expect(document).toHaveDocumentIssues([{
          source: DocumentIssueSource.VALIDATION,
          severity: DocumentIssueSeverity.WARNING,
          message: 'This rule is declared but never referenced.',
          markerId: 0,
        }]);
      }).toThrow(t`
        Unmatched actual issues:
        (Validation) Hint at 3:1-6 - This rule is declared but never referenced.
        Unmatched expected issues:
        (Validation) Warning at 3:1-6 - This rule is declared but never referenced.
      `)
    });
    test('expect validation issue UNmatched by marker', async () => {
      const document = await parseWithMarks(parse, t`
        grammar LangiumGrammar
        entry Grammar: name=ID;
        <<{|Unuse|}>>d: name=ID;
        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `);

      expect(() => {
        expect(document).toHaveDocumentIssues([{
          source: DocumentIssueSource.VALIDATION,
          severity: DocumentIssueSeverity.HINT,
          message: 'This rule is declared but never referenced.',
          markerId: 0,
        }]);
      }).toThrow(t`
        Unmatched actual issues:
        (Validation) Hint at 3:1-6 - This rule is declared but never referenced.
        Unmatched expected issues:
        (Validation) Hint at 3:1-5 - This rule is declared but never referenced.
      `)
    });
    test('expect validation issue UNmatched by message', async () => {
      const document = await parseWithMarks(parse, t`
        grammar LangiumGrammar
        entry Grammar: name=ID;
        <<{|Unused|}>>: name=ID;
        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `);

      expect(() => {
        expect(document).toHaveDocumentIssues([{
          source: DocumentIssueSource.VALIDATION,
          severity: DocumentIssueSeverity.HINT,
          message: 'This rule is DECLARED but never referenced.',
          markerId: 0,
        }]);
      }).toThrow(t`
        Unmatched actual issues:
        (Validation) Hint at 3:1-6 - This rule is declared but never referenced.
        Unmatched expected issues:
        (Validation) Hint at 3:1-6 - This rule is DECLARED but never referenced.
      `)
    });
    test('expect validation issue UNmatched by source', async () => {
      const document = await parseWithMarks(parse, t`
        grammar LangiumGrammar
        entry Grammar: name=ID;
        <<{|Unused|}>>: name=ID;
        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `);

      expect(() => {
        expect(document).toHaveDocumentIssues([{
          source: DocumentIssueSource.PARSER,
          severity: DocumentIssueSeverity.HINT,
          message: 'This rule is declared but never referenced.',
          markerId: 0,
        }]);
      }).toThrow(t`
        Unmatched actual issues:
        (Validation) Hint at 3:1-6 - This rule is declared but never referenced.
        Unmatched expected issues:
        (Parser) Hint at 3:1-6 - This rule is declared but never referenced.
      `)
    });

    test('expect validation issue matched by message regex', async () => {
      const document = await parseWithMarks(parse, t`
        grammar LangiumGrammar
        entry Grammar: name=ID;
        Unused: name=ID;
        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `);

      expect(document).toHaveDocumentIssues([{
        severity: DocumentIssueSeverity.HINT,
        message: /This rule is declared ... never ref.*/,
      }], { ignoreNonErrorDiagnostics: false }
      );
    });

    test('expect validation issue matched by source', async () => {
      const document = await parseWithMarks(parse, t`
        grammar LangiumGrammar
        entry Grammar: name=ID;
        Unused: name=ID;
        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `);

      expect(document).toHaveDocumentIssues([{
        severity: DocumentIssueSeverity.HINT,
        source: DocumentIssueSource.VALIDATION,
        message: /.*/,
      }], { ignoreNonErrorDiagnostics: false }
      );
    });

    test('expect multiple validation issues matched by message and markerId', async () => {
      const document = await parseWithMarks(parse, t`
        grammar LangiumGrammar
        entry Grammar: name=ID;
        <<{|Unused1|}>>: name=ID;
        <<{|Unused2|}>>: name=ID;
        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `);

      expect(document).toHaveDocumentIssues([{
        source: DocumentIssueSource.VALIDATION,
        severity: DocumentIssueSeverity.HINT,
        message: 'This rule is declared but never referenced.',
        markerId: 0,
      }, {
        source: DocumentIssueSource.VALIDATION,
        severity: DocumentIssueSeverity.HINT,
        message: 'This rule is declared but never referenced.',
        markerId: 1,
      }]);
    });

    test('unmatched actual issues cause failure', async () => {
      const document = await parseWithMarks(parse, t`
        grammar LangiumGrammar
        entry Grammar: name=ID;
        <<{|Unused|}>>: name=ID;
        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `);

      expect(() => {
        expect(document).toHaveDocumentIssues([]);
      }).toThrow(t`
        Unmatched actual issues:
        (Validation) Hint at 3:1-6 - This rule is declared but never referenced.
      `);
    });

    test('unmatched expected issues cause failure', async () => {
      const document = await parseWithMarks(parse, t`
        grammar LangiumGrammar
        entry Grammar: name=ID;
        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `);

      expect(() => {
        expect(document).toHaveDocumentIssues([{
          source: DocumentIssueSource.VALIDATION,
          severity: DocumentIssueSeverity.HINT,
          message: 'This rule is declared but never referenced.',
        }]);
      }).toThrow(t`
        Expected 1 issues, but none were present in the document.
        (Validation) Hint - This rule is declared but never referenced.
      `);
    });

    test('invalid markerId causes error', async () => {
      const document = await parseWithMarks(parse, t`
        grammar LangiumGrammar
        entry Grammar: name=ID;
        <<{|Unused|}>>: name=ID;
        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `);

      expect(() => {
        expect(document).toHaveDocumentIssues([{
          source: DocumentIssueSource.VALIDATION,
          severity: DocumentIssueSeverity.HINT,
          message: 'This rule is declared but never referenced.',
          markerId: 99,
        }]);
      }).toThrow('Invalid markerId 99. Available markers range from 0 to 0.');
    });

    test('expect validation issue matched by message regex', async () => {
      const document = await parseWithMarks(parse, t`
        grammar LangiumGrammar
        entry Grammar: name=ID;
        Unused: name=ID;
        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `);

      expect(document).toHaveDocumentIssues([{
        severity: DocumentIssueSeverity.HINT,
        message: /declared but never referenced/,
      }]);
    });

    test('expect validation issue matched by message only', async () => {
      const document = await parseWithMarks(parse, t`
        grammar LangiumGrammar
        entry Grammar: name ID;
        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `);

      expect(document).toHaveDocumentIssues([{
        message: "Could not resolve reference to AbstractRule named 'name'.",
      }]);
    });

    test('expect validation issue matched by severity and message', async () => {
      const document = await parseWithMarks(parse, t`
        grammar LangiumGrammar
        entry Grammar: name=ID;
        Unused: name=ID;
        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `);

      expect(document).toHaveDocumentIssues([{
        severity: DocumentIssueSeverity.HINT,
        message: 'This rule is declared but never referenced.',
      }]);
    });

    test('expect validation issue matched by source and message', async () => {
      const document = await parseWithMarks(parse, t`
        grammar LangiumGrammar
        entry Grammar: name ID;
        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `);

      expect(document).toHaveDocumentIssues([{
        source: DocumentIssueSource.VALIDATION,
        message: "Could not resolve reference to AbstractRule named 'name'.",
      }]);
    });

    test('expect validation issue matched by message and markerId', async () => {
      const document = await parseWithMarks(parse, t`
        grammar LangiumGrammar
        entry Grammar: <<{|name|}>> ID;
        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `);

      expect(document).toHaveDocumentIssues([{
        message: "Could not resolve reference to AbstractRule named 'name'.",
        markerId: 0,
      }]);
    });

    test('expect parser error matched by message', async () => {
      const document = await parseWithMarks(parse, t`
        grammar LangiumGrammar
        terminal
      `);

      expect(document).toHaveDocumentIssues([{
        source: DocumentIssueSource.PARSER,
        severity: DocumentIssueSeverity.ERROR,
        message: /Expecting: one of these possible Token sequences/,
      }], { ignoreValidationErrors: true });
    });

    test('expect lexer error matched by message', async () => {
      const document = await parseWithMarks(parse, t`
        grammar LangiumGrammar
        terminal Error: 'err
      `);

      expect(document).toHaveDocumentIssues([{
        source: DocumentIssueSource.LEXER,
        severity: DocumentIssueSeverity.ERROR,
        message: /unexpected character: ->'<- at offset: \d+, skipped \d+ characters./,
      }], { ignoreValidationErrors: true, ignoreParserErrors: true });
    });

    test('no issues matched when ignoreNonErrorDiagnostics is true', async () => {
      const document = await parseWithMarks(parse, t`
        grammar LangiumGrammar
        entry Grammar: name=ID;
        Unused: name=ID;
        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `);

      expect(() => {
        expect(document).toHaveDocumentIssues([{
          severity: DocumentIssueSeverity.HINT,
          message: 'This rule is declared but never referenced.',
        }], { ignoreNonErrorDiagnostics: true });
      }).toThrow(t`
        Expected 1 issues, but none were present in the document.
        Hint - This rule is declared but never referenced.
      `);
    });

    test('unmatched actual issues when not all expected', async () => {
      const document = await parseWithMarks(parse, t`
        grammar LangiumGrammar
        entry Grammar: name=ID;
        <<{|Unused1|}>>: name=ID;
        <<{|Unused2|}>>: name=ID;
        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `);

      expect(() => {
        expect(document).toHaveDocumentIssues([{
          severity: DocumentIssueSeverity.HINT,
          message: 'This rule is declared but never referenced.',
          markerId: 0,
        }]);
      }).toThrow(t`
        Unmatched actual issues:
        (Validation) Hint at 4:1-7 - This rule is declared but never referenced.
      `);
    });

    test('expect issue with missing severity defaults to ERROR', async () => {
      const document = await parseWithMarks(parse, t`
        grammar LangiumGrammar
        entry Grammar: name ID;
        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `);

      expect(document).toHaveDocumentIssues([{
        message: "Could not resolve reference to AbstractRule named 'name'.",
      }]);
    });

    test('no issues present when expectedIssues is empty', async () => {
      const document = await parseWithMarks(parse, t`
        grammar LangiumGrammar
        entry Grammar: name=ID;
        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `);

      expect(document).toHaveDocumentIssues([]);
    });

    test('unmatched expected issues when document has no issues', async () => {
      const document = await parseWithMarks(parse, t`
        grammar LangiumGrammar
        entry Grammar: name=ID;
        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `);

      expect(() => {
        expect(document).toHaveDocumentIssues([{
          message: 'Non-existent issue',
        }]);
      }).toThrow(t`
        Expected 1 issues, but none were present in the document.
        Error - Non-existent issue
      `);
    });

    test('expect multiple issues with some unmatched', async () => {
      const document = await parseWithMarks(parse, t`
        grammar LangiumGrammar
        entry Grammar: terminal;
        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `);

      expect(() => {
        expect(document).toHaveDocumentIssues([{
          source: DocumentIssueSource.PARSER,
          severity: DocumentIssueSeverity.ERROR,
          message: /Expecting: one of these possible Token sequences/,
        }, {
          source: DocumentIssueSource.VALIDATION,
          severity: DocumentIssueSeverity.ERROR,
          message: /Expecting: one of these possible Token sequences/,
        }, {
          source: DocumentIssueSource.VALIDATION,
          severity: DocumentIssueSeverity.ERROR,
          message: /Unmatched issue/,
        }]);
      }).toThrow(t`
        Unmatched expected issues:
        (Validation) Error - /Unmatched issue/
      `);
    });
  });

  describe('toContainIssue', () => {
    test('document contains specific validation issue', async () => {
      const document = await parseWithMarks(parse, t`
        grammar LangiumGrammar
        entry Grammar: name ID;
        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `);

      expect(document).toContainIssue({
        message: "Could not resolve reference to AbstractRule named 'name'.",
      });
    });

    test('document contains specific issue matched by regex', async () => {
      const document = await parseWithMarks(parse, t`
        grammar LangiumGrammar
        entry Grammar: name ID;
        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `);

      expect(document).toContainIssue({
        message: /Could not resolve reference/,
      });
    });

    test('document contains issue with specific severity and source', async () => {
      const document = await parseWithMarks(parse, t`
        grammar LangiumGrammar
        entry Grammar: name ID;
        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `);

      expect(document).toContainIssue({
        severity: DocumentIssueSeverity.ERROR,
        source: DocumentIssueSource.VALIDATION,
        message: "Could not resolve reference to AbstractRule named 'name'.",
      });
    });

    test('document with no issues does not contain expected issue', async () => {
      const document = await parseWithMarks(parse, t`
        grammar LangiumGrammar
        entry Grammar: name=ID;
        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `);

      expect(() => {
        expect(document).toContainIssue({
          message: "Non-existent issue",
        });
      }).toThrow('No issues were found in the document.');
    });

    test('document does not contain specified issue', async () => {
      const document = await parseWithMarks(parse, t`
        grammar LangiumGrammar
        entry Grammar: name name;
        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `);

      expect(() => {
        expect(document).toContainIssue({
          message: "Non-existent issue",
        });
      }).toThrow('Expected issue was not found in the document');
    });

    test('document contains issue at specific markerId', async () => {
      const document = await parseWithMarks(parse, t`
        grammar LangiumGrammar
        entry Grammar: <<{|name|}>> ID;
        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `);

      expect(document).toContainIssue({
        message: "Could not resolve reference to AbstractRule named 'name'.",
        markerId: 0,
      });
    });

    test('document does not contain issue at incorrect markerId', async () => {
      const document = await parseWithMarks(parse, t`
        grammar LangiumGrammar
        entry Grammar: <<{|name|}>> <<{|ID|}>>;
        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `);

      expect(document).toContainIssue({
        message: "Could not resolve reference to AbstractRule named 'name'.",
        markerId: 0,
      });
      expect(() => {
        expect(document).toContainIssue({
          message: "Could not resolve reference to AbstractRule named 'name'.",
          markerId: 1,
        });
      }).toThrow('Expected issue was not found in the document');
    });

    test('document contains lexer error', async () => {
      const document = await parseWithMarks(parse, t`
        grammar LangiumGrammar
        terminal Error: 'err
      `);

      expect(document).toContainIssue({
        source: DocumentIssueSource.LEXER,
        severity: DocumentIssueSeverity.ERROR,
        message: /unexpected character: ->'<- at offset/,
      }, { ignoreValidationErrors: true, ignoreParserErrors: true });
    });

    test('document contains parser error', async () => {
      const document = await parseWithMarks(parse, t`
        grammar LangiumGrammar
        entry Grammar name=ID;
      `);

      expect(document).toContainIssue({
        source: DocumentIssueSource.PARSER,
        severity: DocumentIssueSeverity.ERROR,
        message: /Expecting token of type ':' but found `name`/,
      }, { ignoreValidationErrors: true });
    });

    test('document contains issue when ignoring non-error diagnostics', async () => {
      const document = await parseWithMarks(parse, t`
        grammar LangiumGrammar
        entry Grammar: name ID;
        UnusedRule: name=ID;
        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `);

      expect(document).toContainIssue({
        message: "Could not resolve reference to AbstractRule named 'name'.",
      }, { ignoreNonErrorDiagnostics: false });
    });

    test('document does not contain issue when ignoring non-error diagnostics', async () => {
      const document = await parseWithMarks(parse, t`
        grammar LangiumGrammar
        entry Grammar: name=ID;
        UnusedRule: name=ID;
        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `);

      expect(() => {
        expect(document).toContainIssue({
          message: 'This rule is declared but never referenced.',
        }, { ignoreNonErrorDiagnostics: true });
      }).toThrow('No issues were found in the document.');
    });

    test('document contains issue matching regex with special characters', async () => {
      const document = await parseWithMarks(parse, t`
        grammar LangiumGrammar
        entry Grammar: <<{|name|}>> ID; // Special case
        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `);

      expect(document).toContainIssue({
        message: /Could not resolve reference to AbstractRule named '.*'/,
        markerId: 0,
      });
    });

    test('document does not contain issue due to incorrect severity', async () => {
      const document = await parseWithMarks(parse, t`
        grammar LangiumGrammar
        entry Grammar: name ID;
        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `);

      expect(document).toContainIssue({
        severity: DocumentIssueSeverity.ERROR,
        message: "Could not resolve reference to AbstractRule named 'name'.",
      });
      expect(() => {
        expect(document).toContainIssue({
          severity: DocumentIssueSeverity.WARNING,
          message: "Could not resolve reference to AbstractRule named 'name'.",
        });
      }).toThrow('Expected issue was not found in the document');
    });

    test('document does not contain issue due to incorrect source', async () => {
      const document = await parseWithMarks(parse, t`
        grammar LangiumGrammar
        entry Grammar: name ID;
        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `);

      expect(() => {
        expect(document).toContainIssue({
          source: DocumentIssueSource.PARSER,
          message: "Could not resolve reference to AbstractRule named 'name'.",
        });
      }).toThrow('Expected issue was not found in the document');
    });

    test('document does not contain issue when all issues are ignored', async () => {
      const document = await parseWithMarks(parse, t`
        grammar LangiumGrammar
        entry Grammar: name=ID;
        UnusedRule: name=ID;
        terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
      `);

      expect(() => {
        expect(document).toContainIssue({
          message: 'This rule is declared but never referenced.',
        }, { ignoreValidationErrors: true, ignoreNonErrorDiagnostics: true });
      }).toThrow('No issues were found in the document');
    });

    // Add more tests as needed to cover edge cases and additional scenarios
  });
});

