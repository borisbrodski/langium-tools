import { expandToNode, toString } from "langium/generate";

export function using<T>(obj: T, fnc: (t: T) => void) {
  fnc(obj);
}

export function t(staticParts: TemplateStringsArray, ...substitutions: unknown[]): string {
  return toString(expandToNode(staticParts, ...substitutions));
}
