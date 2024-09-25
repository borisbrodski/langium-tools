import { LangiumDocument } from "langium";
import { parseMarkedText, ParseMarkedTextResult } from "../base/marker-parser.js";
import { parseHelper } from "langium/test";

export interface ParsedDocument {
  markedText: string,
  document: LangiumDocument,
  markerData: ParseMarkedTextResult
}

type DoParse = ReturnType<typeof parseHelper>

/**
 * Extract markers and parse dsl and run validation.
 *
 * @param doParse parse method returned from `parseHelper` method.
 * @param text DSL with markers
 * @param [endMarker="|}>>"] (optional) begin marker
 * @param [beginMarker="<<{|"] (optional) end marker
 */
export async function parseWithMarks(
  doParse: DoParse,
  text: string,
  beginMarker: string = "<<{|",
  endMarker: string = "|}>>"
): Promise<ParsedDocument> {
  const markerData = parseMarkedText(text, beginMarker, endMarker);
  const document = await doParse(markerData.text, { validation: true });
  return {
    markedText: text,
    document: document,
    markerData: markerData
  };
}
