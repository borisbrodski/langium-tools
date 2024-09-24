import { describe, expect, it } from "vitest";
import "../../src/base/arrays";

describe("Array sortBy", () => {
  describe("sortBy with string property", () => {
    it("empty array -> empty array", () => {
      const arr: { name: string; age: number }[] = [];
      expect(arr.sortBy("name")).toEqual([]);
    });

    it("sort by string property 'name'", () => {
      const arr = [
        { name: "Charlie", age: 35 },
        { name: "Alice", age: 30 },
        { name: "Bob", age: 25 },
      ];
      expect(arr.sortBy("name")).toEqual([
        { name: "Alice", age: 30 },
        { name: "Bob", age: 25 },
        { name: "Charlie", age: 35 },
      ]);
    });

    it("sort by number property 'age'", () => {
      const arr = [
        { name: "Charlie", age: 35 },
        { name: "Alice", age: 30 },
        { name: "Bob", age: 25 },
      ];
      expect(arr.sortBy("age")).toEqual([
        { name: "Bob", age: 25 },
        { name: "Alice", age: 30 },
        { name: "Charlie", age: 35 },
      ]);
    });
  });

  describe("sortBy with function", () => {
    it("sort by length of name", () => {
      const arr = [
        { name: "Charlie", age: 35 },
        { name: "Alice", age: 30 },
        { name: "Bob", age: 25 },
      ];
      expect(arr.sortBy((item) => item.name.length)).toEqual([
        { name: "Bob", age: 25 },
        { name: "Alice", age: 30 },
        { name: "Charlie", age: 35 },
      ]);
    });

    it("sort by custom function returning age mod 10", () => {
      const arr = [
        { name: "Charlie", age: 35 },
        { name: "Alice", age: 30 },
        { name: "Bob", age: 26 },
      ];
      expect(arr.sortBy((item) => item.age % 10)).toEqual([
        { name: "Alice", age: 30 },
        { name: "Charlie", age: 35 },
        { name: "Bob", age: 26 },
      ]);
    });
  });

  describe("edge cases", () => {
    it("handles undefined and null values (move to end)", () => {
      const arr = [
        { name: null, age: 35 },
        { name: "Alice", age: 30 },
        { name: undefined, age: 25 },
      ];
      expect(arr.sortBy("name")).toEqual([
        { name: "Alice", age: 30 },
        { name: null, age: 35 },
        { name: undefined, age: 25 },
      ]);
    });

    it("handles numbers and strings mixed in property", () => {
      const arr = [
        { value: 30 },
        { value: "40" },
        { value: 25 },
        { value: "20" },
      ];
      expect(arr.sortBy("value")).toEqual([
        { value: "20" },
        { value: 25 },
        { value: 30 },
        { value: "40" },
      ]);
    });
  });
});

