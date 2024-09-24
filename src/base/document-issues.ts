import "./string.js";
import { LangiumDocument } from "langium";
import { DiagnosticSeverity } from "vscode-languageserver";
import type { IToken } from 'chevrotain';

/**
 * Represents the source of a document issue.
 *
 * - `LEXER`: Issues originating from the lexer (tokenization errors).
 * - `PARSER`: Issues originating from the parser (syntax errors).
 * - `VALIDATION`: Issues originating from validation (semantic errors).
 */
export enum DocumentIssueSource {
  LEXER = "LEXER",
  PARSER = "PARSER",
  VALIDATION = "VALIDATION",
}

/**
 * Represents the severity level of a document issue.
 *
 * - `ERROR`: Critical issue that prevents further processing.
 * - `WARNING`: Issue that may lead to problems but does not prevent processing.
 * - `INFORMATION`: Informational message.
 * - `HINT`: Suggestion to improve the document.
 * - `UNKNOWN`: Severity is unknown.
 */
export enum DocumentIssueSeverity {
  ERROR = "ERROR",
  WARNING = "WARNING",
  INFORMATION = "INFO",
  HINT = "HINT",
  UNKNOWN = "-"
}

/**
 * Represents an issue in a document, such as a syntax error or a validation issue.
 * The issue can be associated with a specific source, such as the lexer, parser, or validation.
 */
export type DocumentIssue = {
  /** The source of the issue (lexer, parser, or validation). */
  source: DocumentIssueSource;
  /** The severity level of the issue. */
  severity: DocumentIssueSeverity;
  /** The message describing the issue. */
  message: string;
  /**
   * 0-based absolute position of the beginning of the marker
   */
  startOffset?: number,

  /**
   * 0-based line number of the beginning of the marker
   */
  startLine?: number,
  /**
   * 0-based column of the beginning of the marker
   */
  startColumn?: number,

  /**
   * 0-based absolute position of the character _after_ the end of the marker.
   * (0-based position of the last character + 1)
   *
   * This allows representation of the 0-length markers as "startPos == endPos".
   * In this case endLine and endColumn should be ignored.
   */
  endOffset?: number,
  /**
   * 0-based line of the end of the marker
   */
  endLine?: number,
  /**
   * 0-based Position of the character _after_ the end of the marker.
   * (1-based position of the last character + 1)
   */
  endColumn?: number,
};

/**
 * Represents a summary of document issues.
 *
 * Contains counts of errors and non-error issues, as well as formatted summary and message strings.
 */
export type DocumentIssueSummary = {
  /** Total number of issues found in the document. */
  countTotal: number;
  /** Number of issues with severity `ERROR`. */
  countErrors: number;
  /** Number of issues with severity other than `ERROR`. */
  countNonErrors: number;
  /** A brief summary string of the issues. */
  summary: string;
  /** A detailed message string listing all issues. */
  message: string;
};

/**
 * Parameters for filtering document issues.
 */
export interface GetDocumentIssuesParams {
  /**
   * If `true`, non-error diagnostics (warnings, information, hints) are skipped.
   * Defaults to `false`.
   */
  skipNonErrorDiagnostics?: boolean;

  /**
   * If `true`, lexer errors are skipped.
   * Defaults to `false`.
   */
  skipLexerErrors?: boolean;

  /**
   * If `true`, parser errors are skipped.
   * Defaults to `false`.
   */
  skipParserErrors?: boolean;

  /**
   * If `true`, validation issues are skipped.
   * Defaults to `false`.
   */
  skipValidation?: boolean;
}

/**
 * Maps a `DiagnosticSeverity` from the language server protocol to a `DocumentIssueSeverity`.
 *
 * @param severity - The `DiagnosticSeverity` to map.
 * @returns The corresponding `DocumentIssueSeverity`.
 */
function mapSeverity(severity?: DiagnosticSeverity): DocumentIssueSeverity {
  if (!severity) {
    return DocumentIssueSeverity.UNKNOWN;
  }
  switch (severity) {
    case DiagnosticSeverity.Error:
      return DocumentIssueSeverity.ERROR;
    case DiagnosticSeverity.Warning:
      return DocumentIssueSeverity.WARNING;
    case DiagnosticSeverity.Information:
      return DocumentIssueSeverity.INFORMATION;
    case DiagnosticSeverity.Hint:
      return DocumentIssueSeverity.HINT;
    default:
      throw new Error(`Unknown DiagnosticSeverity: ${severity}`);
  }
}

/**
 * Retrieves all issues from a Langium document, optionally filtering based on provided parameters.
 *
 * @param document - The Langium document to extract issues from.
 * @param params - Optional parameters to filter issues.
 * @returns An array of `DocumentIssue` representing the issues in the document.
 *
 * @example
 * ```typescript
 * const issues = getDocumentIssues(document, { skipNonErrorDiagnostics: true });
 * ```
 */
export function getDocumentIssues(
  document: LangiumDocument,
  params?: GetDocumentIssuesParams
): DocumentIssue[] {
  const {
    skipNonErrorDiagnostics = false,
    skipLexerErrors = false,
    skipParserErrors = false,
    skipValidation = false,
  } = params || {};

  const issues: DocumentIssue[] = [];
  if (!skipLexerErrors) {
    document.parseResult.lexerErrors.forEach((lexerIssue) => {
      issues.push({
        source: DocumentIssueSource.LEXER,
        message: lexerIssue.message,
        severity: DocumentIssueSeverity.ERROR,
        startOffset: lexerIssue.offset,
        startLine: plus(lexerIssue.line, -1),
        startColumn: plus(lexerIssue.column, -1),
      });
    });
  }

  if (!skipParserErrors) {
    document.parseResult.parserErrors.forEach((parserError) => {
      // Try to get the previous token from the internal Chevrotain structure to get a better position
      const previousToken = (parserError as unknown as { previousToken: IToken })?.previousToken as IToken;
      issues.push({
        source: DocumentIssueSource.PARSER,
        severity: DocumentIssueSeverity.ERROR,
        message: parserError.message,
        startOffset: firstDefinedNumber(parserError.token.startOffset, previousToken?.startOffset),
        startLine: plus(firstDefinedNumber(parserError.token.startLine, previousToken?.startLine), -1),
        startColumn: plus(firstDefinedNumber(parserError.token.startColumn, previousToken?.startColumn), -1),

        // Unrelieable end position returned by Chevrotain (24.09.2024)
        // endOffset: firstDefinedNumber(parserError.token.endOffset, previousToken?.endOffset),
        // endLine: plus(firstDefinedNumber(parserError.token.endLine, previousToken?.endLine), -1),
        // endColumn: plus(firstDefinedNumber(parserError.token.endColumn, previousToken?.endColumn), 1),
      });
    });
  }

  if (!skipValidation) {
    document.diagnostics?.forEach((diagnostic) => {
      if (!skipNonErrorDiagnostics || diagnostic.severity === DiagnosticSeverity.Error) {
        issues.push({
          source: DocumentIssueSource.VALIDATION,
          severity: mapSeverity(diagnostic.severity),
          message: diagnostic.message,
          startLine: diagnostic.range.start.line,
          startColumn: diagnostic.range.start.character,
          endLine: diagnostic.range.end.line,
          endColumn: diagnostic.range.end.character,
        });
      }
    });
  }

  return issues;
}

/**
 * Generates a summary of issues in a Langium document.
 *
 * @param document - The Langium document to summarize issues from.
 * @param params - Optional parameters to filter issues.
 * @returns A `DocumentIssueSummary` containing counts and formatted messages.
 *
 * @example
 * ```typescript
 * const summary = getDocumentIssueSummary(document);
 * console.log(summary.summary);
 * console.log(summary.message);
 * ```
 */
export function getDocumentIssueSummary(
  document: LangiumDocument,
  params?: GetDocumentIssuesParams
): DocumentIssueSummary {
  const issues = getDocumentIssues(document, params);
  return getDocumentIssueSummaryFromIssues(issues);
}

/**
 * Generates a summary of issues from a list of `DocumentIssue`.
 *
 * @param issues - An array of `DocumentIssue`.
 * @returns A `DocumentIssueSummary` containing counts and formatted messages.
 *
 * @example
 * ```typescript
 * const issues: DocumentIssue[] = [ ... ];
 * const summary = getDocumentIssueSummaryFromIssues(issues);
 * console.log(summary.summary);
 * console.log(summary.message);
 * ```
 */
export function getDocumentIssueSummaryFromIssues(
  issues: DocumentIssue[]
): DocumentIssueSummary {
  let countErrors = 0;
  let countNonErrors = 0;
  const messageList: string[] = [];
  const summaryList: string[] = [];

  const issueSourceMap = new Map<DocumentIssueSource, string[]>();
  for (const issue of issues) {
    if (issue.severity === DocumentIssueSeverity.ERROR) {
      countErrors += 1;
    } else {
      countNonErrors += 1;
    }
    if (!issueSourceMap.has(issue.source)) {
      issueSourceMap.set(issue.source, []);
    }
    issueSourceMap.get(issue.source)!.push(documentIssueToString(issue));
  }

  for (const source of [
    DocumentIssueSource.LEXER,
    DocumentIssueSource.PARSER,
    DocumentIssueSource.VALIDATION,
  ]) {
    const issueList = issueSourceMap.get(source);
    if (issueList) {
      if (source === DocumentIssueSource.VALIDATION) {
        const summaryParts: string[] = [];
        if (issueList.length > countNonErrors) {
          summaryParts.push(`${issueList.length - countNonErrors} error diagnostic(s)`);
        }
        if (countNonErrors > 0) {
          summaryParts.push(`${countNonErrors} non-error diagnostic(s)`);
        }
        summaryList.push(summaryParts.join(', '));
      } else {
        summaryList.push(`${issueList.length} ${source.toLowerCase()} error(s)`);
      }
      const sourceName = (source === DocumentIssueSource.VALIDATION) ? "diagnostics" : `${source.toLowerCase()} errors`;
      messageList.push(`${sourceName.toFirstUpper()}:`);
      messageList.push(...issueList);
    }
  }

  if (summaryList.length === 0) {
    summaryList.push('No errors');
  }

  const summaryString = summaryList.join(', ');
  if (messageList.length > 0) {
    messageList.push('');
    messageList.push(summaryString);
  }
  const messageString = messageList.join('\n');
  return {
    countTotal: countErrors + countNonErrors,
    countErrors: countErrors,
    countNonErrors: countNonErrors,
    summary: summaryString,
    message: messageString,
  };
}

/**
 * Converts a `DocumentIssue` to a formatted string.
 *
 * @param issue - The `DocumentIssue` to format.
 * @returns A string representation of the issue.
 *
 * @example
 * ```typescript
 * const issue: DocumentIssue = { ... };
 * const issueStr = documentIssueToString(issue);
 * console.log(issueStr);
 * ```
 */
export function documentIssueToString(issue: DocumentIssue): string {
  const severity = issue.severity.toLowerCase().toFirstUpper();
  return `${severity}${at(issue)} - ${issue.message}`;
}

/**
 * Converts a `DiagnosticSeverity` to a string representation.
 *
 * @param severity - The `DiagnosticSeverity` to convert.
 * @returns A string representing the severity.
 */
export function severityToString(
  severity: DiagnosticSeverity | number | undefined
): string {
  switch (severity) {
    case DiagnosticSeverity.Error:
      return 'Error';
    case DiagnosticSeverity.Warning:
      return 'Warning';
    case DiagnosticSeverity.Information:
      return 'Information';
    case DiagnosticSeverity.Hint:
      return 'Hint';
    default:
      return 'Unknown';
  }
}

/**
 * Formats the position information of a `DocumentIssue`.
 *
 * @param issue - The `DocumentIssue` containing position information.
 * @returns A formatted string representing the position (e.g., " at 4:13-20").
 *
 * @example
 * ```typescript
 * const positionStr = at(issue);
 * console.log(positionStr); // Output: " at 4:13-20"
 * ```
 */
function at(issue: DocumentIssue): string {
  let result = '';
  if (issue.startLine !== undefined && !isNaN(issue.startLine)) {
    result += ` at ${issue.startLine + 1}`;
    if (issue.startColumn !== undefined && !isNaN(issue.startColumn)) {
      result += `:${issue.startColumn + 1}`;
      if (
        issue.endLine !== undefined &&
        !isNaN(issue.endLine) &&
        issue.endColumn !== undefined &&
        !isNaN(issue.endColumn)
      ) {
        if (issue.startLine !== issue.endLine) {
          result += `-${issue.endLine + 1}:${issue.endColumn}`;
        } else {
          result += `-${issue.endColumn}`;
        }
      }
    }
  }
  return result;
}

/**
 * Returns the first meaningful (non-null, non-NaN) value from two options.
 *
 * @param a - The first number to consider.
 * @param b - The second number to consider.
 * @returns The first meaningful number, or `undefined` if both are `null` or `NaN`.
 */
function firstDefinedNumber(a?: number, b?: number): number | undefined {
  if (a != null && !Number.isNaN(a)) {
    return a;
  }
  if (b != null && !Number.isNaN(b)) {
    return b;
  }
  return undefined;
}

/**
 * Add two numbers, returning `undefined` if either is `null` or `undefined`.
 */
function plus(a?: number, b?: number): number | undefined {
  if (a != null && b != null) {
    return a + b;
  }
  return undefined;
}
