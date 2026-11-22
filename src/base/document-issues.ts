import "./string.js";
import { LangiumDocument } from "langium";
import { Diagnostic, DiagnosticSeverity, MarkupContent } from "vscode-languageserver";
import type { IToken } from 'chevrotain';
import { EOL } from "node:os";

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
/**
 * LSP 3.18 allows a diagnostic message to be {@link MarkupContent}.
 * Langium still emits plain strings. Keep the public issue message a string.
 */
function diagnosticMessage(message: string | MarkupContent): string {
  return typeof message === 'string' ? message : message.value;
}

/** Codes Langium's `DocumentValidator` stores on copied lexer and parser diagnostics. */
const LEXING_ERROR = "lexing-error";
const PARSING_ERROR = "parsing-error";

function diagnosticCode(diagnostic: Diagnostic): string | undefined {
  const data = diagnostic.data;
  if (typeof data !== "object" || data === null || !("code" in data)) {
    return undefined;
  }
  const code = (data as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

function syntaxSource(diagnostic: Diagnostic): DocumentIssueSource.LEXER | DocumentIssueSource.PARSER | undefined {
  const code = diagnosticCode(diagnostic);
  if (code === LEXING_ERROR) {
    return DocumentIssueSource.LEXER;
  }
  if (code === PARSING_ERROR) {
    return DocumentIssueSource.PARSER;
  }
  return undefined;
}

/**
 * Langium copies each lexer and parser error into `document.diagnostics` after validation.
 * Prefer that copy: its range has an end position. Keep the offset from `parseResult`.
 * A `parseResult` error with no matching diagnostic is kept as it is.
 */
function mergeSyntaxErrors<T>(
  errors: readonly T[],
  diagnostics: readonly Diagnostic[],
  source: DocumentIssueSource,
  fromParseResult: (error: T) => DocumentIssue,
  messageOf: (error: T) => string,
): DocumentIssue[] {
  const issues: DocumentIssue[] = [];
  const used = new Set<number>();
  for (const error of errors) {
    const message = messageOf(error);
    const match = diagnostics.findIndex((diagnostic, index) =>
      !used.has(index) && diagnosticMessage(diagnostic.message) === message
    );
    const parsed = fromParseResult(error);
    if (match >= 0) {
      used.add(match);
      const diagnostic = diagnostics[match];
      issues.push({
        source,
        severity: mapSeverity(diagnostic.severity),
        message: diagnosticMessage(diagnostic.message),
        startOffset: parsed.startOffset,
        startLine: diagnostic.range.start.line,
        startColumn: diagnostic.range.start.character,
        endLine: diagnostic.range.end.line,
        endColumn: diagnostic.range.end.character,
      });
    } else {
      issues.push(parsed);
    }
  }
  diagnostics.forEach((diagnostic, index) => {
    if (!used.has(index)) {
      issues.push({
        source,
        severity: mapSeverity(diagnostic.severity),
        message: diagnosticMessage(diagnostic.message),
        startLine: diagnostic.range.start.line,
        startColumn: diagnostic.range.start.character,
        endLine: diagnostic.range.end.line,
        endColumn: diagnostic.range.end.character,
      });
    }
  });
  return issues;
}

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

  const diagnostics = document.diagnostics ?? [];
  const issues: DocumentIssue[] = [];
  if (!skipLexerErrors) {
    issues.push(...mergeSyntaxErrors(
      document.parseResult.lexerErrors,
      diagnostics.filter((diagnostic) => syntaxSource(diagnostic) === DocumentIssueSource.LEXER),
      DocumentIssueSource.LEXER,
      (lexerIssue) => ({
        source: DocumentIssueSource.LEXER,
        message: lexerIssue.message,
        severity: DocumentIssueSeverity.ERROR,
        startOffset: lexerIssue.offset,
        startLine: plus(lexerIssue.line, -1),
        startColumn: plus(lexerIssue.column, -1),
      }),
      (lexerIssue) => lexerIssue.message,
    ));
  }

  if (!skipParserErrors) {
    issues.push(...mergeSyntaxErrors(
      document.parseResult.parserErrors,
      diagnostics.filter((diagnostic) => syntaxSource(diagnostic) === DocumentIssueSource.PARSER),
      DocumentIssueSource.PARSER,
      (parserError) => {
        // Chevrotain exposes the token before the failure. Inserted EOF tokens use -1
        // for offset, line, and column, which is not a real position.
        const previousToken = (parserError as unknown as { previousToken: IToken })?.previousToken as IToken;
        return {
          source: DocumentIssueSource.PARSER,
          severity: DocumentIssueSeverity.ERROR,
          message: parserError.message,
          startOffset: firstDefinedNumber(parserError.token.startOffset, previousToken?.startOffset),
          startLine: plus(firstDefinedNumber(parserError.token.startLine, previousToken?.startLine), -1),
          startColumn: plus(firstDefinedNumber(parserError.token.startColumn, previousToken?.startColumn), -1),
        };
      },
      (parserError) => parserError.message,
    ));
  }

  if (!skipValidation) {
    diagnostics.forEach((diagnostic) => {
      if (syntaxSource(diagnostic)) {
        return;
      }
      if (!skipNonErrorDiagnostics || diagnostic.severity === DiagnosticSeverity.Error) {
        issues.push({
          source: DocumentIssueSource.VALIDATION,
          severity: mapSeverity(diagnostic.severity),
          message: diagnosticMessage(diagnostic.message),
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
  const messageString = messageList.join(EOL);
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
 * Returns the first usable source position from two options.
 * `null`, `undefined`, `NaN`, and negative values are skipped. Chevrotain uses `-1`
 * on inserted tokens (typically EOF) when it has no position.
 *
 * @param a - The first number to consider.
 * @param b - The second number to consider.
 * @returns The first usable number, or `undefined` if both are unusable.
 */
function firstDefinedNumber(a?: number, b?: number): number | undefined {
  if (a != null && !Number.isNaN(a) && a >= 0) {
    return a;
  }
  if (b != null && !Number.isNaN(b) && b >= 0) {
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
