import { LangiumDocument } from "langium";
import { DiagnosticSeverity, Diagnostic } from "vscode-languageserver";

export enum DocumentIssueSource {
  LEXER = "LEXER",
  PARSER = "PARSER",
  VALIDATION = "VALIDATION",
}

export enum DocumentIssueSeverity {
  ERROR = "ERROR",
  WARNING = "WARNING",
  INFORMATION = "INFO",
  HINT = "HINT",
  UNKNOWN = "-"
}

export type DocumentIssue = {
  source: DocumentIssueSource,
  severity: DocumentIssueSeverity,
  message: string,
  startOffset?: number,
  startLine?: number,
  startColumn?: number,
  endOffset?: number,
  endLine?: number,
  endColumn?: number
}

export type DocumentIssueSummary = {
  countTotal: number,
  countErrors: number,
  countNonErrors: number,

  summary: string,
  message: string;
}

export interface GetDocumentIssuesParams {
  skipNonErrorDiagnostics?: boolean,
  skipLexerErrors?: boolean,
  skipParserErrors?: boolean,
  skipValidation?: boolean,
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
 * Return summary and details of errors and other issues in a langium document.
 *
 * @param document The document to check for issues
 * @param includeNonErrors If true, non-error diagnostics are included in the summary.
 *                         Otherwise, only errors are included. Default is true.
 * @returns A summary of the issues in the document
 */
export function getDocumentIssues(document: LangiumDocument, params?: GetDocumentIssuesParams): Array<DocumentIssue> {
  const {
    skipNonErrorDiagnostics = false,
    skipLexerErrors = false,
    skipParserErrors = false,
    skipValidation = false,
  } = params || {}

  const issues: ReturnType<typeof getDocumentIssues> = []
  if (!skipLexerErrors) {
    document.parseResult.lexerErrors.forEach((lexerIssue) => {
      issues.push({
        source: DocumentIssueSource.LEXER,
        message: lexerIssue.message,
        severity: DocumentIssueSeverity.ERROR,
        startOffset: lexerIssue.offset,
        startLine: lexerIssue.line,
        startColumn: lexerIssue.column
      })
    })
  }

  if (!skipParserErrors) {
    document.parseResult.parserErrors.forEach((parserError) => {
      issues.push({
        source: DocumentIssueSource.PARSER,
        severity: DocumentIssueSeverity.ERROR,
        message: parserError.message,
        startOffset: parserError.token.startOffset,
        startLine: parserError.token.startLine,
        startColumn: parserError.token.startColumn,
        endOffset: parserError.token.endOffset,
        endLine: parserError.token.endLine,
        endColumn: parserError.token.endColumn
      })
    })
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
        })
      }
    })
  }

  return issues
}

/**
 * Return summary and details of errors and other issues in a langium document.
 *
 * @param document The document to check for issues
 * @param includeNonErrors If true, non-error diagnostics are included in the summary.
 *                         Otherwise, only errors are included. Default is true.
 * @returns A summary of the issues in the document
 */
export function getDocumentIssueSummary(document: LangiumDocument, params?: GetDocumentIssuesParams): DocumentIssueSummary {
  // TODO Use it
  // const issues = getDocumentIssues(document, params)


  const skipNonErrorDiagnostics = params?.skipNonErrorDiagnostics || false;
  const skipLexerErrors = params?.skipLexerErrors || false;
  const skipParserErrors = params?.skipParserErrors || false;
  const skipValidation = params?.skipValidation || false;

  const lexerErrors = skipLexerErrors ? [] : document.parseResult.lexerErrors;
  const parserErrors = skipParserErrors ? [] : document.parseResult.parserErrors;
  const diagnostics = skipValidation ? [] : document.diagnostics || [];

  let countErrors = 0;
  let countNonErrors = 0;
  let errorString = '';
  const summary = []

  if (lexerErrors.length > 0) {
    summary.push(`${lexerErrors.length} lexer error(s)`)
    errorString += 'Lexer errors:\n';
    for (const error of lexerErrors) {
      errorString += `Error${at(error.line, error.column)} - ${error.message}\n`;
      countErrors++;
    }
  }

  if (parserErrors.length > 0) {
    summary.push(`${parserErrors.length} parser error(s)`)
    errorString += 'Parser errors:\n';
    for (const error of parserErrors) {
      errorString += `Error${at(error.token.startLine, error.token.startColumn, error.token.endLine, error.token.endColumn)} - ${error.message}\n`;
      countErrors++;
    }
  }

  let diagnosticsToShow: Diagnostic[]
  const diagnosticsErrors = diagnostics.filter(d => d.severity === DiagnosticSeverity.Error);
  if (diagnosticsErrors.length > 0) {
    summary.push(`${diagnosticsErrors.length} error diagnostic(s)`)
  }
  if (!skipNonErrorDiagnostics) {
    const diagnosticsNonErrorCount = diagnostics.length - diagnosticsErrors.length
    if (diagnosticsNonErrorCount > 0) {
      summary.push(`${diagnosticsNonErrorCount} non-error diagnostic(s)`)
    }
    countNonErrors += diagnosticsNonErrorCount;
    countErrors += diagnosticsErrors.length;
    diagnosticsToShow = diagnostics;
  } else {
    countErrors += diagnosticsErrors.length;
    diagnosticsToShow = diagnosticsErrors;
  }
  if (diagnosticsToShow.length > 0) {
    errorString += 'Diagnostics:\n';
    for (const diagnostic of diagnosticsToShow) {
      errorString += `${severityToString(diagnostic.severity)}${at(diagnostic.range.start.line, diagnostic.range.start.character, diagnostic.range.end.line, diagnostic.range.end.character)
        } - ${diagnostic.message}\n`;
    }
  }

  if (summary.length === 0) {
    summary.push('No errors')
  }

  const summaryString = summary.join(', ')
  if (errorString.length > 0) {
    errorString = `${errorString}\n${summaryString}`
  }

  return {
    countTotal: countErrors + countNonErrors,
    countErrors: countErrors,
    countNonErrors: countNonErrors,
    summary: summaryString,
    message: errorString
  }
}

export function documentIssueToString(issue: DocumentIssue): string {
  return `${issue.severity}${at(issue.startLine, issue.startColumn, issue.endLine, issue.endColumn)} - ${issue.message}`
}

export function severityToString(severity: DiagnosticSeverity | number | undefined): string {
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

function at(startLine?: number, startColumn?: number, endLine?: number, endColumn?: number): string {
  let result = ''
  if (startLine !== undefined && !isNaN(startLine)) {
    result += ` at ${startLine + 1}`
    if (startColumn !== undefined && !isNaN(startColumn)) {
      result += `:${startColumn + 1}`
      if (endLine !== undefined && !isNaN(endLine) && endColumn !== undefined && !isNaN(endColumn)) {
        if (startLine !== endLine) {
          result += `-${endLine + 1}:${endColumn + 1}`
        } else {
          result += `-${endColumn + 1}`
        }
      }
    }
  }
  return result;
}
