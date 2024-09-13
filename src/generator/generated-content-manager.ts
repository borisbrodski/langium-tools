import { AstNode, LangiumDocument, URI } from 'langium';
import * as fsPromises from 'fs/promises';
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

export interface Target {
  name: string
}

export const DEFAULT_TARGET: Target = { name: "DEFAULT" };

/**
 * Interface for generator manager.
 * 
 * - provides information about underlying workspace, document and model
 * - collects generated files
 * - supports multiple output directories (Xtext outlets)
 */
export interface GeneratorManager<MODEL extends AstNode = AstNode> {

  /**
   * Create new file with relative path and generated content.
   *
   * @param filePath filename with optional relative path, relative to 'generated' directory.
   *                          See <code>GeneratorOutputCollector.writeToDisk(dir)</code>
   * @param content generated content of the new file
   * @param [options] options are:
   *  <code>overwrite</code> - if existing file on the filesystem should be overwritten with the new content.
   *                           Can be used to make initial generation of files.
   *                           Default is <code>true</code> for the default target,
   *                           custom targets have their own default value for <code>overwrite</code> flag.
   *  <code>target</code>    - target output directory to use.
   *                           Default @{link DEFAULT_TARGET}.
   *                           Different targets can to written to different output directories and can have different default <code>overwrite</code> flag.
   */
  createFile(filePath: string, content: string, options?: { overwrite?: boolean, target?: Target }): void;

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
 * const manager = new GeneratedContentManager(optionalListOfWorkspaceURIs);
 *
 * generator(manager.generatorManagerFor(model1));
 * generator(manager.generatorManagerFor(model2));
 *
 * const content = manager.getGeneratedContent();
 * manager.writeToDisk('./');
 * ```
 *
 * ```ts
 * function generator(manager: GeneratorManager) {
 *   const model = manager.getModel();
 *   const document = manager.getDocument();
 *   const workspaceURI = manager.getWorkspaceURI();
 *   const localPath = manager.getDocumentLocalPath();
 *   
 *   manager.createFile("src-gen/abstract_process.ts", "// Generated by Langium. Don't edit.");
 *   manager.createFile("src/process.ts", "// Initially generated by Langium", { overwrite: false });
 * }
 * ```
 *
 * @see {@link GeneratorManager}
 * @category Generator
 * @since 0.1.0
 */
export class GeneratedContentManager {

  private readonly generatedContentMap: Map<string, GeneratedContent> = new Map([[DEFAULT_TARGET.name, new Map()]]);
  private readonly defaultOverwriteMap: Map<string, boolean> = new Map();
  private readonly workspaceURIs?: URI[];

  constructor(workspaceDirs?: Array<string | URI>) {
    this.workspaceURIs = workspaceDirs?.map(dir => typeof dir === 'string' ? URI.parse(dir) : dir);
    this.defaultOverwriteMap.set(DEFAULT_TARGET.name, true);
  }

  /**
   * Adds a new target to the generator output.
   * @param target - The target to add.
   * @param defaultOverwrite - The default overwrite flag for the target.
   */
  addTarget(target: Target, defaultOverwrite: boolean): void {
    if (this.generatedContentMap.has(target.name)) {
      throw new Error(`Target "${target.name}" has already been added`);
    }
    this.generatedContentMap.set(target.name, new Map());
    this.defaultOverwriteMap.set(target.name, defaultOverwrite);
  }

  /**
   * Creates a new instance of GeneratorOutput for the given AST model.
   *
   * @param model - The AST model
   * @returns A new instance of GeneratorOutput.
   * @since 0.1.0
   */
  generatorManagerFor<MODEL extends AstNode = AstNode>(model: MODEL): GeneratorManager<MODEL> {
    const documentURI = model.$document?.uri;
    const workspaceURI = getWorkspaceForDocument(documentURI, this.workspaceURIs);
    const relativePath = workspaceURI !== undefined && documentURI !== undefined ? path.relative(workspaceURI.fsPath, documentURI.fsPath) : undefined;
    const documentPath = relativePath || documentURI?.toString() || 'document URI undefined';
    return {
      createFile: (filePath: string, content: string, options) => {
        const target = options?.target || DEFAULT_TARGET;
        const overwrite = options?.overwrite ?? this.defaultOverwriteMap.get(target.name) ?? true;
        this.createFile(target, filePath, content, overwrite, documentPath);
      },
      getModel: () => model,
      getDocument: () => model.$document as LangiumDocument<MODEL> | undefined,
      getWorkspaceURI: () => workspaceURI,
      getDocumentLocalPath: () => relativePath
    };
  }

  /**
   * Creates a new file with the given content and DSL file identified by the provided workspace path..
   *
   * @param target - The target to generate the file for.
   * @param filePath - The path of the file to create.
   * @param content - The content of the file.
   * @param overwrite - Whether to overwrite the file if it already exists.
   * @param documentPath - The relative to workspace or absolute path to the langium document, source of the generated file.
   *                       Used e.g. to reference to the langium document in the possible error messages.
   */
  createFile(target: Target, filePath: string, content: string, overwrite: boolean, documentPath: string): void {
    const generatedContent = this.getGeneratedContent(target);
    const existingContent = generatedContent?.get(filePath);
    if (existingContent) {
      if (existingContent.content !== content)
        throw new Error(`Conflict generating file "${filePath}" from "${documentPath}": A file with different content was already generated from "${existingContent.documentPath}".`);

      if (existingContent.overwrite !== overwrite)
        throw new Error(`Conflict generating file "${filePath}" from "${documentPath}": A file with different overwrite flag was already generated from "${existingContent.documentPath}".`);
      // Allow generating the same file multiple times with the same content and overwrite flag
    } else {
      generatedContent.set(filePath, {
        content,
        overwrite: overwrite,
        documentPath: documentPath
      });
    }
  }

  /**
   * Returns the generated content for provided target or DEFAULT_TARGET.
   *
   * @param target - The target to get the generated content for.
   * @returns The generated content.
   * @since 0.1.0
   */
  getGeneratedContent(target?: Target): GeneratedContent {
    const targetName = (target || DEFAULT_TARGET).name;
    if (!this.generatedContentMap.has(targetName)) {
      throw new Error(`Target "${targetName}" is not registered`);
    }
    return this.generatedContentMap.get(targetName)!;
  }

  /**
   * Writes the generated content (for a target) to the file system asynchronously.
   *
   * Existing files are only overwritten if the overwrite flag is set (default behavior).
   * If the file already exists and the content is the same, the file is not overwritten,
   * preserving the timestamp and not triggering file system file change events.
   *
   * @param outputDir - The output directory.
   * @param [target] - Content to write. {@link DEFAULT_TARGET} will be used if not provided.
   */
  async writeToDisk(outputDir: string, target?: Target): Promise<void> {
    const generatedContent = this.getGeneratedContent(target);

    // Ensure the output directory exists
    try {
      await fsPromises.mkdir(outputDir, { recursive: true });
    } catch (error) {
      console.error(`Error creating directory "${outputDir}": ${(error as Error).message}`);
      throw error;
    }

    for (const [file, content] of generatedContent) {
      const absoluteFilePath = path.join(outputDir, file);
      const fileDir = path.dirname(absoluteFilePath);

      try {
        await fsPromises.mkdir(fileDir, { recursive: true });
      } catch (error) {
        console.error(`Error creating directory "${fileDir}": ${(error as Error).message}`);
        throw error;
      }

      let fileExists = false;
      let existingContent = '';

      try {
        existingContent = await fsPromises.readFile(absoluteFilePath, 'utf8');
        fileExists = true;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          console.error(`Error reading file "${absoluteFilePath}": ${(error as Error).message}`);
          throw error;
        }
        // File does not exist, proceed to write
      }

      if (fileExists && (!content.overwrite || existingContent === content.content)) {
        continue;
      }

      try {
        await fsPromises.writeFile(absoluteFilePath, content.content);
      } catch (error) {
        console.error(`Error writing file "${absoluteFilePath}": ${(error as Error).message}`);
        throw error;
      }
    }
  }
}
