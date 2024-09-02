/**
 * Converts the first character of a string to upper case.
 * Example: "hello" -> "Hello"
 *
 * @param s The string to convert.
 * @returns The converted string.
 */
export function toFirstUpper<T extends string | undefined>(s: T): T {
  if (s === undefined) {
    return undefined as T
  }
  return s.charAt(0).toUpperCase() + s.slice(1) as T
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
    return undefined as T
  }
  return s.charAt(0).toLowerCase() + s.slice(1) as T
}

declare global {
  interface String {
    toFirstUpper(): string;
    toFirstLower(): string;
  }
}

String.prototype.toFirstUpper = function (): string {
  return toFirstUpper(this as string);
}
String.prototype.toFirstLower = function (): string {
  return toFirstLower(this as string);
}



