import { LangiumDocument } from "langium";
import { DiagnosticSeverity, Diagnostic } from "vscode-languageserver";

export type DocumentIssueSummary = {
  countTotal: number,
  countErrors: number,
  countNonErrors: number,

  summary: string,
  message: string;
}

/**
 * Return summary and details of errors and other issues in a langium document.
 *
 * @param document The document to check for issues
 * @param includeNonErrors If true, non-error diagnostics are included in the summary.
 *                         Otherwise, only errors are included. Default is true.
 * @returns A summary of the issues in the document
 */
export function getDocumentIssues(document: LangiumDocument, includeNonErrors: boolean = true): DocumentIssueSummary {
  const lexerErrors = document.parseResult.lexerErrors;
  const parserErrors = document.parseResult.parserErrors;
  const diagnostics = document.diagnostics || [];

  let countErrors = 0;
  let countNonErrors = 0;
  let errorString = '';
  const summary = []

  if (lexerErrors.length > 0) {
    summary.push(`${lexerErrors.length} lexer error(s)`)
    errorString += 'Lexer Errors:\n';
    for (const error of lexerErrors) {
      errorString += `Error${at(error.line, error.column)} - ${error.message}\n`;
      countErrors++;
    }
  }

  if (parserErrors.length > 0) {
    summary.push(`${parserErrors.length} parser error(s)`)
    errorString += 'Parser Errors:\n';
    for (const error of parserErrors) {
      errorString += `Error${at(error.token.startLine, error.token.startColumn)} - ${error.message}\n`;
      countErrors++;
    }
  }

  let diagnosticsToShow: Diagnostic[]
  const diagnosticsErrors = diagnostics.filter(d => d.severity === DiagnosticSeverity.Error);
  if (diagnosticsErrors.length > 0) {
    summary.push(`${diagnosticsErrors.length} error diagnostic(s)`)
  }
  if (includeNonErrors) {
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
      errorString += `${severityToString(diagnostic.severity)}${at(diagnostic.range.start.line, diagnostic.range.start.character)} - ${diagnostic.message}\n`;
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

function at(line: number | undefined, character: number | undefined): string {
  let result = ''
  if (line !== undefined && !isNaN(line)) {
    result += ` at ${line}`
  }
  if (character !== undefined && !isNaN(character)) {
    result += `:${character}`
  }
  return result;
}
