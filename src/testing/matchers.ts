import 'vitest';
import { LangiumDocument } from "langium";
import { expect } from "vitest";
import { DocumentIssueSeverity, documentIssueToString, getDocumentIssues as getDocumentIssues, getDocumentIssueSummary } from "../base/document-issues.js";
import { ParsedDocument } from './parser-tools.js';

export interface IgnoreParameters {
  ignoreParserErors?: boolean,
  ignoreLexerErors?: boolean,
  ignoreValidationErrors?: boolean,
  ignoreNonErrorDiagnostics?: boolean,
}

/**
 * Expect a document to have no errors after parsing.
 */
function toHaveNoErrors(document: LangiumDocument, parameters?: IgnoreParameters) {
  const {
    ignoreParserErors = false,
    ignoreLexerErors = false,
    ignoreValidationErrors = false,
  } = (parameters || {});
  const issues = getDocumentIssueSummary(document, {
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

export interface IssueExpectation {
  /**
   * Default: ERROR
   */
  severity?: DocumentIssueSeverity,
  message: string,
  markerId?: number,
}

function toHaveValidationIssues(parsedDocument: ParsedDocument, expectedIssues: Array<IssueExpectation>, parameters?: IgnoreParameters) {
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
  toHaveValidationIssues: toHaveValidationIssues
});


interface LangiumMatchers<R = unknown> {
  /**
   * Expect a document to have no errors after parsing.
   */
  toHaveNoErrors: R extends LangiumDocument ? (parameters?: IgnoreParameters) => void : never;
  toHaveValidationIssues: R extends ParsedDocument ? (expectedIssues: Array<IssueExpectation>, parameters?: IgnoreParameters) => void : never;
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

