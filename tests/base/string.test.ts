import { toFirstUpper } from "../../src/base/string";
import { describe, expect, it } from "vitest";

describe("langium-tools-base", () => {
  describe("toFirstUpper", () => {
    it("undefined -> undefined", () => {
      expect(toFirstUpper(undefined)).toBe(undefined);
    });
    it("empty string -> empty string", () => {
      expect(toFirstUpper("")).toBe("");
    });
    it("hello -> Hello", () => {
      expect(toFirstUpper("hello")).toBe("Hello");
    });
    it("Hello -> Hello", () => {
      expect(toFirstUpper("Hello")).toBe("Hello");
    });
    it("string.toFirstUpper() works", () => {
      expect("hello".toFirstUpper()).toBe("Hello");
    });
  });
})
