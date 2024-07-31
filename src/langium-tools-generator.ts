import * as fs from 'node:fs';
import * as path from 'node:path';


/**
 * Generated content.
 *
 * Map: file path -> file description.
 */
export type GeneratedContent = Map<string, {
  content: string,
  overwrite: boolean,
  dslWorkspacePath: string
}>;

/**
 * Interface for "single model" generators output.
 * 
 * Supports:
 * - creating new files
 * - initial creation (if file not exists)
 */
export interface GeneratorOutput {
  createFile(filePath: string, content: string, overwrite: boolean): void;
  createFile(filePath: string, content: string): void;
  getDslWorkspacePath(): string;
}

/**
 * Collects generated content.
  *
  * Usage:
  *
  * ```ts
  * const collector = new GeneratorOutputCollector()
  * generator(model, collector.generatorOutputFor('path/test.dsl'))
  * const content = collector.getGeneratedContent()
  * ```
  *
  * @see GeneratorOutput
  *
  * @category Generator
  * @since 0.1.0
  */
export class GeneratorOutputCollector {
  private readonly generatedContent: GeneratedContent = new Map();

  /**
   * Creates a new instance of GeneratorOutput for the given DSL file (identified by the provided workspace path).
   *
   * @param dslWorkspacePath - The workspace path of the DSL file.
   * @returns A new instance of GeneratorOutput.
   * @since 0.1.0
   */
  generatorOutputFor(dslWorkspacePath: string): GeneratorOutput {
    return {
      createFile: (filePath: string, content: string, overwrite: boolean = false) => {
        this.createFile(filePath, content, overwrite, dslWorkspacePath);
      },
      getDslWorkspacePath: () => dslWorkspacePath
    };
  }

  /**
   * Creates a new file with the given content and DSL file identified by the provided workspace path..
   *
   * @param filePath - The path of the file to create.
   * @param content - The content of the file.
   * @param overwrite - Whether to overwrite the file if it already exists.
   * @param dslWorkspacePath - The workspace path of the DSL file that generated the content.
   * @since 0.1.0
   */
  createFile(filePath: string, content: string, overwrite: boolean, dslWorkspacePath: string): void {
    const existingContent = this.generatedContent.get(filePath);
    if (existingContent) {
      if (existingContent.content != content)
        throw new Error(`ERROR generating ${dslWorkspacePath} -> ${filePath}: File with different content was already generated from ${existingContent.dslWorkspacePath}`);
      if (existingContent.overwrite !== overwrite)
        throw new Error(`ERROR generating ${dslWorkspacePath} -> ${filePath}: File with different overwrite flag was already generated from ${existingContent.dslWorkspacePath}`);
      // Allow generating the same file multiple times with the same content and overwrite flag
    } else {
      this.generatedContent.set(filePath, {
        content,
        overwrite: overwrite,
        dslWorkspacePath: dslWorkspacePath
      });
    }
  }

  /**
   * Returns the generated content.
   *
   * @returns The generated content.
   * @since 0.1.0
   */
  getGeneratedContent(): GeneratedContent {
    return this.generatedContent;
  }
}
