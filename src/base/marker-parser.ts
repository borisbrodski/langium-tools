import escapeStringRegexp from "escape-string-regexp"

export type MarkerPosition = {
  /**
   * 0-based absolute position of the beginning of the marker
   */
  startOffset: number,

  /**
   * 0-based line number of the beginning of the marker
   */
  startLine: number,
  /**
   * 0-based column of the beginning of the marker
   */
  startColumn: number,

  /**
   * 0-based absolute position of the character _after_ the end of the marker.
   * (0-based position of the last character + 1)
   *
   * This allows representation of the 0-length markers as "startPos == endPos".
   * In this case endLine and endColumn should be ignored.
   */
  endOffset: number,
  /**
   * 0-based line of the end of the marker
   */
  endLine: number,
  /**
   * 0-based Position of the character _after_ the end of the marker.
   * (1-based position of the last character + 1)
   */
  endColumn: number,
}

export type ParseMarkedTextResult = {
  text: string,
  markers: Array<MarkerPosition>
}

export function parseMarkedText(text: string, beginMarker: string = "<<{|", endMarker: string = "|}>>"): ParseMarkedTextResult {
  const tokenRegex = new RegExp(`(${escapeStringRegexp(beginMarker)})|(${escapeStringRegexp(endMarker)})|(\r?\n)`, 'g');
  const TOKEN_BEGIN_MARKER = 1
  const TOKEN_END_MERKER = 2
  const TOKEN_LN = 3

  const positions: MarkerPosition[] = [];
  const originalParts: string[] = [];
  let openMarker: { line: number; column: number; pos: number } | null = null;

  let lastIndex = 0
  let currentColumn = 0
  let currentLine = 0
  let currentPos = 0

  let match
  while ((match = tokenRegex.exec(text))) {
    currentColumn += match.index - lastIndex
    currentPos += match.index - lastIndex
    originalParts.push(text.slice(lastIndex, match.index))
    lastIndex = tokenRegex.lastIndex

    if (match[TOKEN_BEGIN_MARKER] && !openMarker) {
      openMarker = {
        line: currentLine,
        column: currentColumn,
        pos: currentPos
      }
    }
    if (match[TOKEN_END_MERKER] && openMarker) {
      positions.push({
        startOffset: openMarker.pos,
        startLine: openMarker.line,
        startColumn: openMarker.column,
        endOffset: currentPos,
        endLine: currentLine,
        endColumn: currentColumn,
      })
      openMarker = null
    }
    if (match[TOKEN_LN]) {
      currentLine += 1
      currentColumn = 0
      // Add token to output
      currentPos += tokenRegex.lastIndex - match.index
      originalParts.push(text.slice(match.index, tokenRegex.lastIndex))
    }
  }
  originalParts.push(text.slice(lastIndex))

  return {
    text: originalParts.join(""),
    markers: positions
  };
}
