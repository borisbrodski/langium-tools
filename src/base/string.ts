import { expandToNode, toString } from "langium/generate";

/**
 * Converts the first character of a string to upper case.
 * Example: "hello" -> "Hello"
 *
 * @param s The string to convert.
 * @returns The converted string.
 */
export function toFirstUpper<T extends string | undefined>(s: T): T {
  if (s === undefined) {
    return undefined as T;
  }
  return s.charAt(0).toUpperCase() + s.slice(1) as T;
}

/**
 * Converts the first character of a string to upper case.
 * Example: "hello" -> "Hello"
 *
 * @param s The string to convert.
 * @returns The converted string.
 */
export function toFirstLower<T extends string | undefined>(s: T): T {
  if (s === undefined) {
    return undefined as T;
  }
  return s.charAt(0).toLowerCase() + s.slice(1) as T;
}

declare global {
  interface String {
    toFirstUpper(): string;
    toFirstLower(): string;
  }
}

String.prototype.toFirstUpper = function (): string {
  return toFirstUpper(this as string);
};
String.prototype.toFirstLower = function (): string {
  return toFirstLower(this as string);
};

/**
 * Formats a multi-line template literal by adjusting indentation and preserving line breaks.
 *
 * This function ensures consistent formatting of multi-line strings, which is particularly
 * useful for defining code blocks or text outputs. It uses Unix-style newlines (`\n`), making
 * it system independent.
 *
 * The indentation of dynamically inserted placeholders (`${...}`) will be adjusted to match
 * the indentation level of the placeholder itself. This feature is especially useful for code
 * generation scenarios, where nested structures or varying indentation levels are needed.
 *
 * ### Example
 * ```typescript
 * const text = adjusted`
 *     ${cmds}
 *     if (sayAgain) {
 *       ${cmds}
 *     }
 * `;
 *
 * // Output (without `|`):
 * // |console.log('Hello,');
 * // |console.log('World!');
 * // |if (sayAgain) {
 * // |  console.log('Hello,');
 * // |  console.log('World!');
 * // |}
 * ```
 *
 * @param staticParts The static (literal) parts of the template string.
 * @param substitutions The dynamic parts of the template string, which will be injected into the corresponding placeholders in `staticParts`.
 * @returns A formatted string with fixed indentation and Unix-style line breaks (`\n`), without carriage return characters (`\r`).
 */
export function adjusted(staticParts: TemplateStringsArray, ...substitutions: unknown[]): string {
  return toString(expandToNode(staticParts, ...substitutions)).replace(/\r/g, '');
}


