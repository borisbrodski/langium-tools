import { describe } from 'node:test'
import 'vitest'
import { expect, test } from 'vitest'
import { JavaImportManager } from '../../../src/lang/java/import-manager.js';
import { adjusted } from '../../../src/base/string.js';

describe("JavaImportManager", () => {
  test("no imports", () => {
    const manager = new JavaImportManager()
    expect(manager.generateImports()).toBe("")
  });

  test("no imports with current package", () => {
    const manager = new JavaImportManager("my.pkg")
    expect(manager.generateImports()).toBe("")
  });

  test("1 import", () => {
    const manager = new JavaImportManager()
    const useClass = manager.useClass("my.pkg.MyClass")

    expect(useClass).toBe("MyClass")
    expect(manager.generateImports()).toBe("import my.pkg.MyClass;")
  })

  test("1 import outside of the current package", () => {
    const manager = new JavaImportManager("my.pkg.other")
    const useClass = manager.useClass("my.pkg.MyClass")

    expect(useClass).toBe("MyClass")
    expect(manager.generateImports()).toBe("import my.pkg.MyClass;")
  })

  test("1 import within the current package", () => {
    const manager = new JavaImportManager("my.pkg")
    const useClass = manager.useClass("my.pkg.MyClass")

    expect(useClass).toBe("MyClass")
    expect(manager.generateImports()).toBe("")
  })

  test("1 use of default package", () => {
    const manager = new JavaImportManager()
    const useClass = manager.useClass("MyClass")

    expect(useClass).toBe("MyClass")
    expect(manager.generateImports()).toBe("")
  })

  test("use same class twice", () => {
    const manager = new JavaImportManager()

    expect(manager.useClass("my.pkg.MyClass")).toBe("MyClass")
    expect(manager.useClass("my.pkg.MyClass")).toBe("MyClass")
    expect(manager.generateImports()).toBe("import my.pkg.MyClass;")
  })

  test("imports are sorted", () => {
    const manager = new JavaImportManager()

    expect(manager.useClass("my.pkg1.MyClass12")).toBe("MyClass12")
    expect(manager.useClass("my.pkg2.MyClass21")).toBe("MyClass21")
    expect(manager.useClass("my.pkg2.MyClass22")).toBe("MyClass22")
    expect(manager.useClass("my.pkg3.MyClass33")).toBe("MyClass33")
    expect(manager.useClass("my.MyClass4"))

    expect(manager.generateImports().replace(/\r/g, '')).toBe(adjusted`
      import my.MyClass4;
      import my.pkg1.MyClass12;
      import my.pkg2.MyClass21;
      import my.pkg2.MyClass22;
      import my.pkg3.MyClass33;
    `)
  })

  test("same class from different packages", () => {
    const manager = new JavaImportManager()

    expect(manager.useClass("my.pkg1.MyClass")).toBe("MyClass")
    expect(manager.useClass("my.pkg2.MyClass")).toBe("my.pkg2.MyClass")
    expect(manager.useClass("my.pkg2.MyClass")).toBe("my.pkg2.MyClass")
    expect(manager.useClass("my.pkg1.MyClass")).toBe("MyClass")
    expect(manager.useClass("my.pkg3.MyClass")).toBe("my.pkg3.MyClass")

    expect(manager.generateImports()).toBe("import my.pkg1.MyClass;")
  })

  test("import classes from current package on name conflict", () => {
    const manager = new JavaImportManager("my.pkg2")

    expect(manager.useClass("my.pkg1.MyClass")).toBe("MyClass")
    expect(manager.useClass("my.pkg2.MyClass")).toBe("my.pkg2.MyClass")
    expect(manager.useClass("my.pkg3.MyClass")).toBe("my.pkg3.MyClass")

    expect(manager.useClass("my.pkg1.MyClass")).toBe("MyClass")
    expect(manager.useClass("my.pkg2.MyClass")).toBe("my.pkg2.MyClass")
    expect(manager.useClass("my.pkg3.MyClass")).toBe("my.pkg3.MyClass")

    expect(manager.generateImports()).toBe("import my.pkg1.MyClass;")
  })

  test("import classes from current package on name conflict, starting from class out of current package", () => {
    const manager = new JavaImportManager("my.pkg1")

    expect(manager.useClass("my.pkg1.MyClass")).toBe("MyClass")
    expect(manager.useClass("my.pkg2.MyClass")).toBe("my.pkg2.MyClass")
    expect(manager.useClass("my.pkg3.MyClass")).toBe("my.pkg3.MyClass")

    expect(manager.useClass("my.pkg1.MyClass")).toBe("MyClass")
    expect(manager.useClass("my.pkg2.MyClass")).toBe("my.pkg2.MyClass")
    expect(manager.useClass("my.pkg3.MyClass")).toBe("my.pkg3.MyClass")
  })

});

