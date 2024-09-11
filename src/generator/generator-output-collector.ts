import { AstNode, LangiumDocument, URI } from 'langium';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { getWorkspaceForDocument } from './tools.js';

/**
 * Generated content.
 *
 * Map: file path -> file description.
 */
export type GeneratedContent = Map<string, {
  content: string,
  overwrite: boolean,
  documentPath: string
}>;

/**
 * Interface for "single model" generators output.
 * 
 * Supports:
 * - creating new files
 * - initial creation (if file not exists)
 */
export interface GeneratorOutput<MODEL extends AstNode = AstNode> {
  /**
   * Create new file with relative path and generated content.
   *
   * @param {string} filePath filename with optional relative path, relative to 'generated' directory.
   *                          See <code>GeneratorOutputCollector.writeToDisk(dir)</code>
   * @param {string} content generated content of the new file
   * @param {boolean} [overwrite] if file should be overwritten with the new content (if file already exists).
   *                              Default <code>true</code>. Can be used to make initial generation of files.
   */
  createFile(filePath: string, content: string, overwrite?: boolean): void;

  /**
   * Return model ({AstNode} of generic type MODEL).
   * @return {MODEL} model for current generator.
   */
  getModel(): MODEL;

  /**
   * Return associated document.
   *
   * @return {LangiumDocument} associated langium document, if known.
   */
  getDocument(): LangiumDocument<MODEL> | undefined;

  /**
   * Return workspace URI corresponding to the langium document URI.
   * The URI will be selected from a list of known workspace URIs.
   * @return {URI} workspace URI if could be determined
   */
  getWorkspaceURI(): URI | undefined;

  /**
   * Return relative path of the langium document within the determined workspace.
   * See <code>getWorkspaceURI()</code>.
   *
   * @return {string} relative path, if workspace URI could be determined.
   */
  getDocumentLocalPath(): string | undefined;
}

/**
 * Collects generated content.
  *
  * Usage:
  *
  * ```ts
  * const collector = new GeneratorOutputCollector()
  * generator(model1, collector.generatorOutputFor('path/my1.dsl'))
  * generator(model2, collector.generatorOutputFor('path/my2.dsl'))
  * const content = collector.getGeneratedContent()
  * collector.writeToDisk('./generated/')
  * ```
  *
  * @see GeneratorOutput
  *
  * @category Generator
  * @since 0.1.0
  */
export class GeneratorOutputCollector {
  private readonly generatedContent: GeneratedContent = new Map();
  private readonly workspaceURIs?: URI[]

  constructor(workspaceDirs?: Array<string | URI>) {
    this.workspaceURIs = workspaceDirs?.map(dir => typeof dir === 'string' ? URI.parse(dir) : dir);
  }

  /**
   * Creates a new instance of GeneratorOutput for the given DSL file (identified by the provided workspace path).
   *
   * @param dslWorkspacePath - The workspace path of the DSL file.
   * @returns A new instance of GeneratorOutput.
   * @since 0.1.0
   */
  generatorOutputFor<MODEL extends AstNode = AstNode>(model: MODEL): GeneratorOutput {
    const documentURI = model.$document?.uri
    const workspaceURI = getWorkspaceForDocument(documentURI, this.workspaceURIs)
    const relativePath = workspaceURI !== undefined ? documentURI?.toString().slice(workspaceURI.toString().length) : undefined
    const documentPath = relativePath || documentURI?.toString() || 'document URI undefined'
    return {
      createFile: (filePath: string, content: string, overwrite: boolean = true) => {
        this.createFile(filePath, content, overwrite, documentPath);
      },
      getModel: () => model,
      getDocument: () => model.$document,
      getWorkspaceURI: () => workspaceURI,
      getDocumentLocalPath: () => relativePath
    };
  }

  /**
   * Creates a new file with the given content and DSL file identified by the provided workspace path..
   *
   * @param filePath - The path of the file to create.
   * @param content - The content of the file.
   * @param overwrite - Whether to overwrite the file if it already exists.
   * @param documentPath - The relative to workspace or absolute path to the langium document, source of the generated file.
   *                       Used e.g. to reference to the langium document in the possible error messages.
   */
  createFile(filePath: string, content: string, overwrite: boolean, documentPath: string): void {
    const existingContent = this.generatedContent.get(filePath);
    if (existingContent) {
      if (existingContent.content != content)
        throw new Error(`ERROR generating ${documentPath} -> ${filePath}: File with different content was already generated from ${existingContent.documentPath}`);
      if (existingContent.overwrite !== overwrite)
        throw new Error(`ERROR generating ${documentPath} -> ${filePath}: File with different overwrite flag was already generated from ${existingContent.documentPath}`);
      // Allow generating the same file multiple times with the same content and overwrite flag
    } else {
      this.generatedContent.set(filePath, {
        content,
        overwrite: overwrite,
        documentPath: documentPath
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

  /**
   * Writes the generated content to the file system.
   * Existing files are only overwritten if the overwrite flag is set (default behavior).
   * If the file already exists and the content is the same, the file is not overwritten
   * preveserving the timestamp and not triggering file system file change events.
   *
   * @param workspaceDir - The workspace directory.
   * @since 0.1.0
   */
  writeToDisk(workspaceDir: string) {
    if (!fs.existsSync(workspaceDir)) {
      fs.mkdirSync(workspaceDir, { recursive: true });
    }

    this.generatedContent.forEach((content, file) => {
      const absoluteFilePath = path.join(workspaceDir, file);
      const filePath = path.dirname(absoluteFilePath);
      if (!fs.existsSync(filePath)) {
        fs.mkdirSync(filePath, { recursive: true });
      } else if (fs.existsSync(absoluteFilePath)) {
        if (!content.overwrite) {
          return;
        }
        const existingContent = fs.readFileSync(absoluteFilePath);
        if (existingContent.toString() === content.content) {
          return;
        }
      }
      fs.writeFileSync(absoluteFilePath, content.content);
    });
  }
}
