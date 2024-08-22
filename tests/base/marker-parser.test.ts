import { describe, expect, test } from "vitest";
import { parseMarkedText, ParseMarkedTextResult } from "../../src/base/marker-parser"
import { expandToNode, toString } from "langium/generate";

const LN_LENGTH = t`
  a
  b
`.length - 2

describe("parseMarkedText", () => {
  test("no markers", () => {
    const text = t`
      Line1
      Line2
    `
    const results = parseMarkedText(text)

    expect(results).toBeDefined()
    expect(results.text).toBe(text)
    expect(results.markers).toHaveLength(0)
  });

  test("1 marker - entire line", () => {
    const text = t`
      <<<Line1>>>
      Line2
    `
    const results = parseMarkedText(text, "<<<", ">>>")

    expect(results.text).toBe(text.replace(/</g, "").replace(/>/g, ""))
    expect(results.markers).toHaveLength(1)
    expect(results.markers[0]).toStrictEqual({
      startOffset: 0,
      startLine: 0,
      startColumn: 0,
      endOffset: 5,
      endLine: 0,
      endColumn: 5,
    })
    expect(markerText(results, 0)).toBe("Line1")

  });

  test("1 marker - one character", () => {
    const text = t`
      Line<<<1>>>
      Line2
    `
    const results = parseMarkedText(text, "<<<", ">>>")

    expect(results.text).toBe(text.replace(/</g, "").replace(/>/g, ""))
    expect(results.markers).toHaveLength(1)
    expect(results.markers[0]).toStrictEqual({
      startOffset: 4,
      startLine: 0,
      startColumn: 4,
      endOffset: 5,
      endLine: 0,
      endColumn: 5,
    })
    expect(markerText(results, 0)).toBe("1")

  });

  test("1 empty marker", () => {
    const text = t`
      Line<<<>>>1
      Line2
    `
    const results = parseMarkedText(text, "<<<", ">>>")

    expect(results.text).toBe(text.replace(/</g, "").replace(/>/g, ""))
    expect(results.markers).toHaveLength(1)
    expect(results.markers[0]).toStrictEqual({
      startOffset: 4,
      startLine: 0,
      startColumn: 4,
      endOffset: 4,
      endLine: 0,
      endColumn: 4,
    })
    expect(markerText(results, 0)).toBe("")

  });

  test("2 markers on one lines", () => {
    const text = t`
      <<<Li>>>n<<<e1>>>
      Line2
    `
    const results = parseMarkedText(text, "<<<", ">>>")

    expect(results.text).toBe(text.replace(/</g, "").replace(/>/g, ""))
    expect(results.markers).toHaveLength(2)
    expect(results.markers[0]).toStrictEqual({
      startOffset: 0,
      startLine: 0,
      startColumn: 0,
      endOffset: 2,
      endLine: 0,
      endColumn: 2,
    })
    expect(results.markers[1]).toStrictEqual({
      startOffset: 3,
      startLine: 0,
      startColumn: 3,
      endOffset: 5,
      endLine: 0,
      endColumn: 5,
    })
    expect(markerText(results, 0)).toBe("Li")
    expect(markerText(results, 1)).toBe("e1")
  });

  test("2 markers on two lines", () => {
    const text = t`
      Line<<<1>>>
      Line<<<2>>>
    `
    const results = parseMarkedText(text, "<<<", ">>>")

    expect(results.text).toBe(text.replace(/</g, "").replace(/>/g, ""))
    expect(results.markers).toHaveLength(2)
    expect(results.markers[0]).toStrictEqual({
      startOffset: 4,
      startLine: 0,
      startColumn: 4,
      endOffset: 5,
      endLine: 0,
      endColumn: 5,
    })
    expect(results.markers[1]).toStrictEqual({
      startOffset: 5 + LN_LENGTH + 4,
      startLine: 1,
      startColumn: 4,
      endOffset: 5 + LN_LENGTH + 5,
      endLine: 1,
      endColumn: 5,
    })
    expect(markerText(results, 0)).toBe("1")
    expect(markerText(results, 1)).toBe("2")

  });
})

function t(staticParts: TemplateStringsArray, ...substitutions: unknown[]) {
  return toString(expandToNode(staticParts, substitutions)).trim()
}

function markerText(results: ParseMarkedTextResult, index: number): string {
  const marker = results.markers[index]
  return results.text.slice(marker.startOffset, marker.endOffset)
}

