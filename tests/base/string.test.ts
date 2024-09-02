import { toFirstLower, toFirstUpper } from "../../src/base/string";
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
    it("hELLO -> HELLO", () => {
      expect(toFirstUpper("hELLO")).toBe("HELLO");
    });
    it("Hello -> Hello", () => {
      expect(toFirstUpper("Hello")).toBe("Hello");
    });
    it("string.toFirstUpper() works", () => {
      expect("hello".toFirstUpper()).toBe("Hello");
    });
  });
  describe("toLowerUpper", () => {
    it("undefined -> undefined", () => {
      expect(toFirstLower(undefined)).toBe(undefined);
    });
    it("empty string -> empty string", () => {
      expect(toFirstLower("")).toBe("");
    });
    it("hello -> hello", () => {
      expect(toFirstLower("hello")).toBe("hello");
    });
    it("HELLO -> hELLO", () => {
      expect(toFirstLower("HELLO")).toBe("hELLO");
    });
    it("Hello -> hello", () => {
      expect(toFirstLower("Hello")).toBe("hello");
    });
    it("string.toFirstLower() works", () => {
      expect("HEllo".toFirstLower()).toBe("hEllo");
    });
  });
})
