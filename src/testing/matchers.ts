import 'vitest';
import { LangiumDocument } from "langium";
import { expect } from "vitest";
import { DocumentIssueSeverity, DocumentIssueSource, documentIssueToString, getDocumentIssues as getDocumentIssues, getDocumentIssueSummary } from "../base/document-issues.js";
import { ParsedDocument } from './parser-tools.js';

/**
 * Parameters to customize which types of errors to ignore in document validation.
 * @interface IgnoreParameters
 */
export interface IgnoreParameters {
  ignoreParserErors?: boolean,
  ignoreLexerErors?: boolean,
  ignoreValidationErrors?: boolean,
  ignoreNonErrorDiagnostics?: boolean,
}

/**
 * Expects a Langium document to have no errors after parsing.
 * 
 * @param {LangiumDocument|ParsedDocument} document - The Langium document to check for errors.
 * @param {IgnoreParameters} [parameters] - Optional parameters to customize which errors to ignore.
 * 
 * @example
 * import { expect, test } from 'vitest';
 * import { parse } from './your-langium-test-setup';
 * 
 * test('document has no errors', async () => {
 *   const doc = await parseMarkedDSL(parse, 'const x = 5;');
 *   expect(doc).toHaveNoErrors();
 * });
 * 
 * test('document has no errors, ignoring lexer errors', async () => {
 *   const doc = await parse('const x = @;', { validation: true });
 *   expect(doc).toHaveNoErrors({ ignoreLexerErors: true });
 * });
 */
function toHaveNoErrors(document: LangiumDocument | ParsedDocument, parameters?: IgnoreParameters) {
  const {
    ignoreParserErors = false,
    ignoreLexerErors = false,
    ignoreValidationErrors = false,
  } = (parameters || {});
  const langiumDocument: LangiumDocument = 'document' in document ? document.document : document;
  const issues = getDocumentIssueSummary(langiumDocument, {
    skipLexerErrors: ignoreLexerErors,
    skipParserErrors: ignoreParserErors,
    skipValidation: ignoreValidationErrors,
    skipNonErrorDiagnostics: true,
  });
  return {
    pass: issues.countTotal === 0,
    message: () => issues.message
  };
}

/**
 * Represents an expected issue in a Langium document.
 * @interface IssueExpectation
 */
export interface IssueExpectation {
  /**
   * Default: ERROR
   */
  severity?: DocumentIssueSeverity,
  /**
   * Document issue source (lexer, parser, ...).
   * Not asserted, if not provided. 
   */
  source?: DocumentIssueSource,

  message: string, /* TODO Add regex support */
  /**
   * 0-based marker in DSL. Not asserted, if not provided.
   */
  markerId?: number,
}

/**
 * Expects a parsed Langium document with markers to have specific validation issues.
 * 
 * @param {ParsedDocument} parsedDocument - The parsed Langium document to check for issues.
 * @param {Array<IssueExpectation>} expectedIssues - An array of expected issues.
 * @param {IgnoreParameters} [parameters] - Optional parameters to customize which errors to ignore.
 * 
 * @example
 * import { expect, test } from 'vitest';
 * import { parse } from './your-langium-test-setup';
 * 
 * test('document has expected validation issues', async () => {
 *   const parsedDoc = await parseDocument(parse, `
 *       let [[x: string]] = 5;
 *       print(x);
 *   `, '[[', ']]');
 *   expect(parsedDoc).toHaveValidationIssues([
 *     {
 *       message: "Type 'number' is not assignable to type 'string'",
 *       markerId: 0
 *     }
 *   ]);
 * });
 * 
 * test('document has warning, ignoring errors', () => {
 *   const parsedDoc = await parseDocument(parse, `
 *      let [[foo]];
 *   `, '[[', ']]');
 *   expect(parsedDoc).toHaveValidationIssues(
 *     [
 *       {
 *         severity: DocumentIssueSeverity.WARNING,
 *         message: "Variable 'foo' is never used",
 *         markerId: 0
 *       }
 *     ],
 *     { ignoreValidationErrors: true }
 *   );
 * });
 */
function toHaveValidationIssues(parsedDocument: ParsedDocument, expectedIssues: Array<IssueExpectation>, parameters?: IgnoreParameters) {
  if (!('document' in parsedDocument)) {
    throw Error("Expected ParsedDocument object. Use 'parseMarkedDSL' to parse.");
  }
  const {
    ignoreParserErors = false,
    ignoreLexerErors = false,
    ignoreValidationErrors = false,
    ignoreNonErrorDiagnostics = false,

  } = (parameters || {});
  const isIssues = getDocumentIssues(parsedDocument.document, {
    skipLexerErrors: ignoreLexerErors,
    skipParserErrors: ignoreParserErors,
    skipValidation: ignoreValidationErrors,
    skipNonErrorDiagnostics: ignoreNonErrorDiagnostics,
  });

  if (!isIssues || isIssues.length === 0) {
    if (expectedIssues.length === 0) {
      return {
        pass: true,
        message: () => ""
      };
    }
    return {
      pass: false,
      message: () => `No of expected ${expectedIssues.length} issues were present in document\n${ //
        expectedIssues.map((issue) => issueExpectationToString(parsedDocument, issue)).join("\n")
        }`
    };
  }

  const unmatchedExpectedIssues: Array<IssueExpectation> = [];
  let isIssuesToMatch = [...isIssues];

  expectedIssues.forEach(expectedIssue => {
    const matchedIsIssue = isIssuesToMatch.find((isIssue) => {
      let match = (isIssue.message === expectedIssue.message);
      match &&= (isIssue.severity === (expectedIssue.severity || DocumentIssueSeverity.ERROR));
      if (expectedIssue.markerId) {
        const marker = parsedDocument.markerData.markers[expectedIssue.markerId];
        expect(marker,
          `MarkerId ${expectedIssue.markerId} of expected issue "${expectedIssue.message} not found. There are only ${parsedDocument.markerData.markers.length} markers available`)
          .toBeDefined();

        if (isIssue.startLine !== undefined) {
          match &&= (isIssue.startLine === marker.startLine);
        }
        if (isIssue.startColumn !== undefined) {
          match &&= (isIssue.startColumn === marker.startColumn);
        }
        if (isIssue.startOffset !== undefined) {
          match &&= (isIssue.startOffset === marker.startOffset);
        }
        if (isIssue.endLine !== undefined) {
          match &&= (isIssue.endLine === marker.endLine);
        }
        if (isIssue.endColumn !== undefined) {
          match &&= (isIssue.endColumn === marker.endColumn);
        }
        if (isIssue.endOffset !== undefined) {
          match &&= (isIssue.endOffset === marker.endOffset);
        }
      }

      return match;
    });
    if (matchedIsIssue) {
      isIssuesToMatch = isIssuesToMatch.filter((issue) => issue !== matchedIsIssue);
    } else {
      unmatchedExpectedIssues.push(expectedIssue);
    }
  });

  const errors: Array<string> = [];
  if (isIssuesToMatch.length > 0) {
    errors.push("Unmatched IS isssues:");
    errors.push(...isIssuesToMatch.map((issue) => documentIssueToString(issue)));

  }
  if (unmatchedExpectedIssues.length > 0) {
    errors.push("Unmatched EXPECTED isssues:");
    errors.push(...unmatchedExpectedIssues.map((issue) => issueExpectationToString(parsedDocument, issue)));
  }

  return {
    pass: errors.length === 0,
    message: () => errors.join("\n")
  };
}

expect.extend({
  toHaveNoErrors: toHaveNoErrors,
  toHaveDocumentIssues: toHaveValidationIssues
});


interface LangiumMatchers<R = unknown> {
  /**
   * Expect a document to have no errors after parsing.
   */
  toHaveNoErrors: R extends (LangiumDocument | ParsedDocument)
  ? (parameters?: IgnoreParameters) => void : never;
  toHaveDocumentIssues: R extends ParsedDocument ? (expectedIssues: Array<IssueExpectation>, parameters?: IgnoreParameters) => void : never;
}

declare module 'vitest' {
  interface Assertion<T> extends LangiumMatchers<T> { }
  interface AsymmetricMatchersContaining<R = unknown> extends LangiumMatchers<R> { }
}

function issueExpectationToString(parsedDocument: ParsedDocument, issue: IssueExpectation): string {
  const severity = issue.severity || DocumentIssueSeverity.ERROR;
  let message = `${severity}`;
  if (issue.markerId !== undefined) {
    const marker = parsedDocument.markerData.markers[issue.markerId];
    message += ` at ${marker.startLine + 1}:${marker.startColumn + 1}`;
    if (marker.startOffset < marker.endOffset) {
      message += "-";
      if (marker.startLine < marker.endLine) {
        message += `${marker.endLine + 1}:`;

      }
      message += `${marker.endColumn + 1}`;
    }
  }
  message += ` - ${issue.message}`;
  return message;
}

