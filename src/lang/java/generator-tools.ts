import { CreateFileOptions, GeneratorManager } from "langium-tools/generator";
import { CompositeGeneratorNode, expandToNode, toString } from "langium/generate";
import { packageToPath } from "./common.js";
import { JavaImportManager } from "./import-manager.js";

/**
 * Generates a Java source file with proper package declaration, imports, and body content.
 *
 * This function simplifies the generation of Java files by handling common boilerplate code such as
 * package declarations and import statements. It leverages a `JavaImportManager` to manage imports
 * automatically based on the classes used in the body content.
 *
 * @param {string} fileName - The name of the Java file to be generated (without the `.java` extension).
 * @param {string} packageName - The package name for the Java file (e.g., `com.example.project`).
 * @param {GeneratorManager} generatorManager - The manager responsible for handling file creation and output.
 * @param {(importManager: (fqn: string) => string) => CompositeGeneratorNode} bodyGenerator - A function that generates
 * the body of the Java file. It receives an `importManager` function to handle class imports and returns a `CompositeGeneratorNode`
 * representing the body content.
 * @param {CreateFileOptions} [options] - Optional settings for file creation, such as encoding or overwrite behavior.
 *
 * @example
 * ```typescript
 * generateJavaFile(
 *   'MyClass',
 *   'com.example.project',
 *   generatorManager,
 *   (importClass) => expandToNode`
 *       public class MyClass {
 *           public ${imp('java.util.Properties')} getProperties() {
 *               // ...
 *           }
 *       }
 *   }`
 * );
 * ```
 *
 * The above example generates a Java class `MyClass` in the package `com.example.project`, with an imported `java.util.Properties`.
 * The `imp` function handles the import management, ensuring that `java.util.Properties` is imported and conflicts are resolved.
 */
export function generateJavaFile(
  fileName: string,
  packageName: string,
  generatorManager: GeneratorManager,
  bodyGenerator: (importManager: (fqn: string) => string) => CompositeGeneratorNode,
  options?: CreateFileOptions
) {
  const importManager = new JavaImportManager(packageName);

  const body = bodyGenerator(fqn => importManager.useClass(fqn));

  generatorManager.createFile(`${packageToPath(packageName)}/${fileName}.java`, toString(expandToNode`
    package ${packageName};

    ${importManager.generateImports()}

    ${body}
  `), options);
}

