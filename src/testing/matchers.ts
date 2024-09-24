import 'vitest';
import { LangiumDocument } from "langium";
import { expect } from "vitest";
import {
  DocumentIssue,
  DocumentIssueSeverity,
  DocumentIssueSource,
  documentIssueToString,
  getDocumentIssues,
  getDocumentIssueSummary
} from "../base/document-issues.js";
import { ParsedDocument } from './parser-tools.js';

/**
 * Parameters to customize which types of issues to ignore during document validation.
 */
export interface IgnoreParameters {
  /** Whether to ignore parser errors. Default is `false`. */
  ignoreParserErrors?: boolean;
  /** Whether to ignore lexer errors. Default is `false`. */
  ignoreLexerErrors?: boolean;
  /** Whether to ignore validation errors. Default is `false`. */
  ignoreValidationErrors?: boolean;
  /** Whether to ignore non-error diagnostics (e.g., warnings, hints). Default is `false`. */
  ignoreNonErrorDiagnostics?: boolean;
}

/**
 * Expects a Langium document to have no errors after parsing.
 * Non-error diagnostics are ignored by default.
 *
 * @param document - The Langium document or parsed document to check for errors.
 * @param parameters - Optional parameters to customize which errors to ignore.
 *
 * @example
 * ```typescript
 * import { expect, test } from 'vitest';
 * import { parse } from './your-langium-test-setup';
 *
 * test('document has no errors', async () => {
 *   const doc = await parse('const x = 5;');
 *   expect(doc).toHaveNoErrors();
 * });
 *
 * test('document has no errors, ignoring lexer errors', async () => {
 *   const doc = await parse('const x = @;', { validation: true });
 *   expect(doc).toHaveNoErrors({ ignoreLexerErrors: true });
 * });
 * ```
 */
function toHaveNoErrors(
  document: LangiumDocument | ParsedDocument,
  parameters?: IgnoreParameters
) {
  const {
    ignoreParserErrors = false,
    ignoreLexerErrors = false,
    ignoreValidationErrors = false,
    ignoreNonErrorDiagnostics = true, // Default to true for 'toHaveNoErrors'
  } = parameters || {};
  return toHaveNoIssues(document, {
    ignoreParserErrors,
    ignoreLexerErrors,
    ignoreValidationErrors,
    ignoreNonErrorDiagnostics,
  });
}

/**
 * Expects a Langium document to have no issues after parsing.
 *
 * @param document - The Langium document or parsed document to check for issues.
 * @param parameters - Optional parameters to customize which issues to ignore.
 *
 * @example
 * ```typescript
 * import { expect, test } from 'vitest';
 * import { parse } from './your-langium-test-setup';
 *
 * test('document has no issues', async () => {
 *   const doc = await parse('const x = 5;');
 *   expect(doc).toHaveNoIssues();
 * });
 *
 * test('document has no issues, ignoring lexer errors', async () => {
 *   const doc = await parse('const x = @;', { validation: true });
 *   expect(doc).toHaveNoIssues({ ignoreLexerErrors: true });
 * });
 * ```
 */
function toHaveNoIssues(
  document: LangiumDocument | ParsedDocument,
  parameters?: IgnoreParameters
) {
  const {
    ignoreParserErrors = false,
    ignoreLexerErrors = false,
    ignoreValidationErrors = false,
    ignoreNonErrorDiagnostics = false,
  } = parameters || {};
  const langiumDocument: LangiumDocument =
    'document' in document ? document.document : document;
  const issues = getDocumentIssueSummary(langiumDocument, {
    skipLexerErrors: ignoreLexerErrors,
    skipParserErrors: ignoreParserErrors,
    skipValidation: ignoreValidationErrors,
    skipNonErrorDiagnostics: ignoreNonErrorDiagnostics,
  });
  return {
    pass: issues.countTotal === 0,
    message: () => issues.message,
  };
}

/**
 * Represents an expected issue in a Langium document.
 */
export interface IssueExpectation {
  /**
   * The severity of the issue.
   * Defaults to `DocumentIssueSeverity.ERROR` if not specified.
   */
  severity?: DocumentIssueSeverity;

  /**
   * The source of the issue (lexer, parser, validator, etc.).
   * Not asserted if not provided.
   */
  source?: DocumentIssueSource;

  /**
   * The expected message of the issue.
   * Can be a string or a regular expression to match against the actual message.
   */
  message: string | RegExp;

  /**
   * 0-based marker ID in the DSL.
   * Not asserted if not provided.
   */
  markerId?: number;
}

/**
 * Expects a parsed Langium document with markers to have specific issues.
 *
 * @param parsedDocument - The parsed Langium document with markers to check for issues.
 * @param expectedIssues - An array of expected issues.
 * @param parameters - Optional parameters to customize which issues to ignore.
 *
 * @example
 * ```typescript
 * import { expect, test } from 'vitest';
 * import { parseDocument } from './your-langium-test-setup';
 *
 * test('document has expected issues', async () => {
 *   const parsedDoc = await parseMarkedDSL(`
 *     let [[x: string]] = 5;
 *     print(x);
 *   `, '[[', ']]');
 *   expect(parsedDoc).toHaveDocumentIssues([
 *     {
 *       message: "Type 'number' is not assignable to type 'string'",
 *       markerId: 0
 *     }
 *   ]);
 * });
 *
 * test('document has a warning, ignoring errors', async () => {
 *   const parsedDoc = await parseMarkedDSL(`
 *     let [[foo]];
 *   `, '[[', ']]');
 *   expect(parsedDoc).toHaveDocumentIssues(
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
 * ```
 */
function toHaveDocumentIssues(
  parsedDocument: ParsedDocument,
  expectedIssues: Array<IssueExpectation>,
  parameters?: IgnoreParameters
) {
  if (!('document' in parsedDocument)) {
    throw new Error(
      `Expected ParsedDocument object. Use 'parseMarkedDSL' to parse.`
    );
  }
  const {
    ignoreParserErrors = false,
    ignoreLexerErrors = false,
    ignoreValidationErrors = false,
    ignoreNonErrorDiagnostics = false,
  } = parameters || {};
  const actualIssues = getDocumentIssues(parsedDocument.document, {
    skipLexerErrors: ignoreLexerErrors,
    skipParserErrors: ignoreParserErrors,
    skipValidation: ignoreValidationErrors,
    skipNonErrorDiagnostics: ignoreNonErrorDiagnostics,
  });

  if (!actualIssues || actualIssues.length === 0) {
    if (expectedIssues.length === 0) {
      return {
        pass: true,
        message: () => "",
      };
    }
    return {
      pass: false,
      message: () =>
        `Expected ${expectedIssues.length} issues, but none were present in the document.\n${expectedIssues
          .map((issue) => issueExpectationToString(parsedDocument, issue))
          .join("\n")}`,
    };
  }

  const unmatchedExpectedIssues: Array<IssueExpectation> = [];
  let remainingActualIssues = [...actualIssues];

  expectedIssues.forEach((expectedIssue) => {
    const matchedActualIssue = remainingActualIssues.find((actualIssue) =>
      matchesIssueExpectation(actualIssue, expectedIssue, parsedDocument)
    );
    if (matchedActualIssue) {
      remainingActualIssues = remainingActualIssues.filter(
        (issue) => issue !== matchedActualIssue
      );
    } else {
      unmatchedExpectedIssues.push(expectedIssue);
    }
  });

  const errors: Array<string> = [];
  if (remainingActualIssues.length > 0) {
    errors.push("Unmatched actual issues:");
    errors.push(...remainingActualIssues.map((issue) => {
      const source = issue.source ? `(${issue.source.toLowerCase().toFirstUpper()}) ` : '';
      return `${source}${documentIssueToString(issue)}`;
    }));
  }
  if (unmatchedExpectedIssues.length > 0) {
    errors.push("Unmatched expected issues:");
    errors.push(
      ...unmatchedExpectedIssues.map((issue) =>
        issueExpectationToString(parsedDocument, issue)
      )
    );
  }

  return {
    pass: errors.length === 0,
    message: () => errors.join("\n"),
  };
}

/**
 * Expects that a specific issue is present in the Langium document.
 *
 * @param document - The Langium document or parsed document to check for the issue.
 * @param expectedIssue - The expected issue to look for.
 * @param parameters - Optional parameters to customize which issues to ignore.
 *
 * @example
 * ```typescript
 * import { expect, test } from 'vitest';
 * import { parse } from './your-langium-test-setup';
 *
 * test('document contains specific issue', async () => {
 *   const doc = await parse('const x = @;', { validation: true });
 *   expect(doc).toContainIssue({
 *     message: /Unexpected character/,
 *     severity: DocumentIssueSeverity.ERROR,
 *     source: DocumentIssueSource.LEXER,
 *   });
 * });
 * ```
 */
function toContainIssue(
  document: LangiumDocument | ParsedDocument,
  expectedIssue: IssueExpectation,
  parameters?: IgnoreParameters
) {
  const {
    ignoreParserErrors = false,
    ignoreLexerErrors = false,
    ignoreValidationErrors = false,
    ignoreNonErrorDiagnostics = false,
  } = parameters || {};

  const langiumDocument: LangiumDocument =
    'document' in document ? document.document : document;

  const actualIssues = getDocumentIssues(langiumDocument, {
    skipLexerErrors: ignoreLexerErrors,
    skipParserErrors: ignoreParserErrors,
    skipValidation: ignoreValidationErrors,
    skipNonErrorDiagnostics: ignoreNonErrorDiagnostics,
  });

  if (!actualIssues || actualIssues.length === 0) {
    return {
      pass: false,
      message: () => `No issues were found in the document.`,
    };
  }

  const matchedIssue = actualIssues.find((actualIssue) =>
    matchesIssueExpectation(
      actualIssue,
      expectedIssue,
      'markerData' in document ? document : undefined
    )
  );

  if (matchedIssue) {
    return {
      pass: true,
      message: () => '',
    };
  } else {
    const issueDescription = issueExpectationToString(
      'markerData' in document ? document : undefined,
      expectedIssue
    );
    return {
      pass: false,
      message: () =>
        `Expected issue was not found in the document:\n${issueDescription}`,
    };
  }
}

/**
 * Helper function to determine if an actual issue matches an expected issue.
 *
 * @param actualIssue - The actual issue from the document.
 * @param expectedIssue - The expected issue defined by the user.
 * @param parsedDocument - The parsed document containing marker data (optional).
 * @returns `true` if the actual issue matches the expected issue; otherwise, `false`.
 */
function matchesIssueExpectation(
  actualIssue: DocumentIssue,
  expectedIssue: IssueExpectation,
  parsedDocument?: ParsedDocument
): boolean {
  let match =
    typeof expectedIssue.message === 'string'
      ? actualIssue.message === expectedIssue.message
      : expectedIssue.message.test(actualIssue.message);

  match &&=
    actualIssue.severity === (expectedIssue.severity || DocumentIssueSeverity.ERROR);

  match &&= expectedIssue.source === undefined || actualIssue.source === expectedIssue.source;

  if (expectedIssue.markerId !== undefined && parsedDocument) {
    const marker = parsedDocument.markerData.markers[expectedIssue.markerId];
    if (!marker) {
      throw new Error(
        `Invalid markerId ${expectedIssue.markerId}. Available markers range from 0 to ${parsedDocument.markerData.markers.length - 1
        }.`
      );
    }
    if (actualIssue.startLine !== undefined && marker.startLine !== undefined) {
      match &&= actualIssue.startLine === marker.startLine;
    }
    if (actualIssue.startColumn !== undefined && marker.startColumn !== undefined) {
      match &&= actualIssue.startColumn === marker.startColumn;
    }
    if (actualIssue.startOffset !== undefined && marker.startOffset !== undefined) {
      match &&= actualIssue.startOffset === marker.startOffset;
    }
    if (actualIssue.endLine !== undefined && marker.endLine !== undefined) {
      match &&= actualIssue.endLine === marker.endLine;
    }
    if (actualIssue.endColumn !== undefined && marker.endColumn !== undefined) {
      match &&= actualIssue.endColumn === marker.endColumn;
    }
    if (actualIssue.endOffset !== undefined && marker.endOffset !== undefined) {
      match &&= actualIssue.endOffset === marker.endOffset;
    }
  }

  return match;
}

/**
 * Extends Vitest's expect function with custom matchers for Langium documents.
 */
expect.extend({
  toHaveNoErrors,
  toHaveNoIssues,
  toHaveDocumentIssues,
  toContainIssue,
});

/**
 * Interface extending Vitest's matchers with Langium-specific assertions.
 */
interface LangiumMatchers<R = unknown> {
  /**
   * Asserts that a document has no errors after parsing.
   * Non-error diagnostics (warnings, hints) are ignored by default.
   *
   * @param parameters - Optional parameters to customize which errors to ignore.
   */
  toHaveNoErrors: R extends LangiumDocument | ParsedDocument
  ? (parameters?: IgnoreParameters) => void
  : never;

  /**
   * Asserts that a document has no issues after parsing.
   *
   * @param parameters - Optional parameters to customize which issues to ignore.
   */
  toHaveNoIssues: R extends LangiumDocument | ParsedDocument
  ? (parameters?: IgnoreParameters) => void
  : never;

  /**
   * Asserts that a parsed document has specific issues at specified markers.
   *
   * @param expectedIssues - An array of expected issues.
   * @param parameters - Optional parameters to customize which issues to ignore.
   */
  toHaveDocumentIssues: R extends ParsedDocument
  ? (
    expectedIssues: Array<IssueExpectation>,
    parameters?: IgnoreParameters
  ) => void
  : never;

  /**
   * Asserts that a document contains a specific issue.
   *
   * @param expectedIssue - The expected issue to look for.
   * @param parameters - Optional parameters to customize which issues to ignore.
   */
  toContainIssue: R extends LangiumDocument | ParsedDocument
  ? (expectedIssue: IssueExpectation, parameters?: IgnoreParameters) => void
  : never;
}

/**
 * Augments Vitest's assertion interface with Langium-specific matchers.
 */
declare module 'vitest' {

  interface Assertion<T> extends LangiumMatchers<T> { }

  interface AsymmetricMatchersContaining<R = unknown> extends LangiumMatchers<R> { }
}

/**
 * Converts an issue expectation into a readable string representation.
 *
 * @param parsedDocument - The parsed document containing marker data (optional).
 * @param issue - The issue expectation to convert.
 * @returns A string representation of the issue expectation.
 */
function issueExpectationToString(
  parsedDocument: ParsedDocument | undefined,
  issue: IssueExpectation
): string {
  const severity = issue.severity || DocumentIssueSeverity.ERROR;
  const source = issue.source ? `(${issue.source.toLowerCase().toFirstUpper()}) ` : '';
  let message = `${source}${severity.toLowerCase().toFirstUpper()}`;
  if (issue.markerId !== undefined && parsedDocument) {
    if (issue.markerId < 0 || issue.markerId >= parsedDocument.markerData.markers.length) {
      throw new Error(`Invalid markerId ${issue.markerId}. Available markers range from 0 to ${parsedDocument.markerData.markers.length - 1}.`);
    }
    const marker = parsedDocument.markerData.markers[issue.markerId];
    message += ` at ${marker.startLine + 1}:${marker.startColumn + 1}`;
    if (marker.startOffset < marker.endOffset) {
      message += "-";
      if (marker.startLine < marker.endLine) {
        message += `${marker.endLine + 1}:`;
      }
      message += `${marker.endColumn}`;
    }
  }
  const messageText =
    issue.message instanceof RegExp ? issue.message.toString() : issue.message;
  message += ` - ${messageText}`;
  return message;
}

