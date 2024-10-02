import { EOL } from "node:os";

// TODO: Add support for java.lang without import

/**
 * A utility class for managing Java imports during code generation.
 *
 * This class simplifies the handling of Java imports by allowing you to register
 * full qualified class names and ensuring that simple class names do not collide.
 *
 * ## Example
 * ```typescript
 * const importManager = new JavaImportManager();
 *
 * const code = `
 *   ${importManager.useClass('java.util.List');} list1;
 *   ${importManager.useClass('java.awt.List');} list2;
 * `
 * console.log(code);
 * // Output:
 * // List list1;
 * // java.awt.List list2;
 *
 * console.log(importManager.generateImports());
 * // Output:
 * // import java.awt.List;
 * ```
 * Note, that the import manager will only generate imports for classes that are actually used.
 * Conflicting class names will be resolved by using the full qualified name.
 */
export class JavaImportManager {
  readonly classes: Map<string, string> = new Map();
  readonly currentPackage: string;

  /**
   * Creates a new Java import manager.
   *
   * @param {string} currentPackage - The current package to use. Classes from this package shouldn't be imported.
   */
  constructor(currentPackage: string = "") {
    this.currentPackage = currentPackage;
  }


  /**
   * Registers a class for use in the generated Java code and returns a suitable name.
   *
   * If the simple name of the provided full qualified name is not already registered, this method
   * registers it and returns the simple name. If a collision occurs (i.e., two different full
   * qualified names share the same simple name), the method returns the full qualified name instead.
   * 
   * This method should be called with the same full qualified name every time it is used in the generated code.
   *
   * @param {string} fullQualifiedName - The fully qualified name of the class (e.g., `java.util.List`).
   * @returns {string} The name to use in the generated code, either the simple class name or the full qualified name.
   */
  useClass(fullQualifiedName: string): string {
    const dotIndex = fullQualifiedName.lastIndexOf(".");
    if (dotIndex === -1) {
      return fullQualifiedName;
    }

    const name = fullQualifiedName.slice(dotIndex + 1);

    const packageName = fullQualifiedName.slice(0, dotIndex);
    if (packageName === this.currentPackage) {
      if (!this.classes.has(name)) {
        this.classes.set(name, "");
        return name;
      } else if (this.classes.get(name) === "") {
        return name;
      }
    }

    if (!this.classes.has(name)) {
      this.classes.set(name, fullQualifiedName);
      return name;
    }
    const importedFQN = this.classes.get(name);
    return (importedFQN === fullQualifiedName) ? name : fullQualifiedName;
  }

  /**
   * Generates a list of Java import statements based on the registered classes.
   *
   * This method iterates over the registered classes and produces the corresponding
   * import statements in alphabetical order. The result can be directly included at
   * the beginning of a Java file.
   *
   * Method {@link useClass} shouldn't be called after this method.
   *
   * @returns {string} A formatted string containing all the import statements, separated by line breaks.
   */
  generateImports(): string {
    return Array.from(this.classes.values()).map((fqn) => fqn.length > 0 ? `import ${fqn};` : '').sort().join(EOL);
  }
}

