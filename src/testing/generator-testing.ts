import { AstNode, LangiumDocument, URI, WorkspaceFolder } from 'langium';
import { type DefaultSharedModuleContext, type LangiumSharedServices } from 'langium/lsp';
import { NodeFileSystem } from 'langium/node';
import path from 'path';
import fs from 'fs';
import { expect, test } from 'vitest';
import { getDocumentIssueSummary } from '../base/document-issues.js';
import { GeneratedContent, GeneratorManager, GeneratedContentManager, GeneratorTarget, DEFAULT_TARGET } from '../generator/generated-content-manager.js';
import "../base/arrays.js";


type DslServices<SERVICES, SHARED_SERVICES> = { shared: LangiumSharedServices & SHARED_SERVICES } & SERVICES;
type ValueOf<T> = T[keyof T];

type ExtractServiceType<T> = ValueOf<Omit<T, 'shared'>>;

export enum GeneratorMode {
  Generate,
  Verify
}

/**
 * Metadata for generated files.
 * Saved in the output directory of corresponding output directory.
 */
export interface GeneratorTestOutputDirectoryMetadata {
  generatedFiles:
  {
    filename: string,
    overwrite: boolean
  }[]
};


export interface GeneratorTestOptions<SERVICES, SHARED_SERVICES, MODEL extends AstNode> {
  generateMode?: GeneratorMode;

  createServices: (
    context: DefaultSharedModuleContext
  ) => DslServices<SERVICES, SHARED_SERVICES>;
  initWorkspace?: (
    service: DslServices<SERVICES, SHARED_SERVICES>,
    workspaceDir: string
  ) => Promise<WorkspaceFolder>;
  buildDocuments?: (
    service: DslServices<SERVICES, SHARED_SERVICES>,
    workspaceFolder: WorkspaceFolder
  ) => Promise<LangiumDocument<AstNode>[]>;
  validateDocuments?: (
    service: DslServices<SERVICES, SHARED_SERVICES>,
    documents: LangiumDocument<AstNode>[]
  ) => Promise<LangiumDocument<AstNode>[]>;
  generateForWorkspace?: (
    service: DslServices<SERVICES, SHARED_SERVICES>,
    documents: LangiumDocument<AstNode>[],
    workspaceFolder: WorkspaceFolder,
    targets?: GeneratorTarget[]
  ) => Promise<GeneratedContentManager>;
  generateForModel?: (
    services: ExtractServiceType<SERVICES>,
    document: MODEL,
    generatorOutput: GeneratorManager
  ) => Promise<void>;
}

const globalGenerateMode = process.env.GENERATOR_TEST === "generate" ? GeneratorMode.Generate : GeneratorMode.Verify;

/**
 * Run generator snapshot tests for all workspaces (subdirectories of the `testSuiteDir` directory).
 * For each workspace there will be a tests added to vitest suite.
 *
 * @param testSuiteDir directory with the workspace directories (as direct subdirectories to `testSuiteDir`)
 * @param options options
 * @param targets optional list of additional target directories (Xtext outlets) to be supported by the generator (generator provided in `options`).
 */
export function langiumGeneratorSuite<SERVICES, SHARED_SERVICES, MODEL extends AstNode>(testSuiteDir: string, options: GeneratorTestOptions<SERVICES, SHARED_SERVICES, MODEL>, targets?: GeneratorTarget[]): void {
  const { generateMode = globalGenerateMode } = options;
  fs.readdirSync(testSuiteDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .forEach((dirent) => {
      const testDirName = dirent.name;

      test(`DSL-Workspace "${testDirName}"${generateMode ? ' (generating)' : ''}`, async () => {
        await langiumGeneratorTest<SERVICES, SHARED_SERVICES, MODEL>(path.join(testSuiteDir, testDirName), options, targets);
      });
    });
}

/**
 * Run generator test for a single DSL workspace.
 *
 * @param testDir The directory containing the DSL workspace.
 * @param options The generator test options.
 * @param targets Optional list of custom generator targets to be used by the generator.
 */
export async function langiumGeneratorTest<SERVICES, SHARED_SERVICES, MODEL extends AstNode>(testDir: string, options: GeneratorTestOptions<SERVICES, SHARED_SERVICES, MODEL>, targets?: GeneratorTarget[]): Promise<void> {

  async function defaultGenerateForWorkspace(services: DslServices<SERVICES, SHARED_SERVICES>, documents: LangiumDocument<AstNode>[], workspaceFolder: WorkspaceFolder, targets?: GeneratorTarget[]): Promise<GeneratedContentManager> {
    const optionsGenerator = options.generateForModel;
    if (!optionsGenerator) {
      throw new Error('One of generateForDocument or generateForWorkspace must be defined');
    }

    const generatedContentManager = new GeneratedContentManager([workspaceFolder.uri]);
    targets?.forEach(target => generatedContentManager.addTarget(target));
    for (const document of documents) {
      const model = document.parseResult.value as MODEL;

      const nonSharedServices = Object.keys(services as object).filter(key => key !== 'shared');
      if (nonSharedServices.length !== 1) {
        throw new Error('Expected exactly one non-shared service');
      }
      const serviceName = nonSharedServices[0];
      await optionsGenerator(services[serviceName as keyof SERVICES] as ExtractServiceType<SERVICES>, model, generatedContentManager.generatorManagerFor(model));
    }
    return generatedContentManager;
  }
  const {
    initWorkspace = defaultInitWorkspace,
    buildDocuments = defaultBuildDocuments,
    validateDocuments = defaultValidateDocuments,
    generateForWorkspace = defaultGenerateForWorkspace,
    generateMode = globalGenerateMode,
  } = options;

  const services = options.createServices(NodeFileSystem);
  const workspaceFolder = await initWorkspace(services, testDir);
  const documents = await buildDocuments(services, workspaceFolder);
  await validateDocuments(services, documents);
  const generatedContentManager = await generateForWorkspace(services, documents, workspaceFolder, targets);

  const outputDir = path.join(testDir, 'generated');

  const dirsAndTargets = targets?.length ? generatedContentManager.getTargets().map(target => ({
    dir: path.join(outputDir, target.name),
    metadataFile: path.join(testDir, `${target.name}-metadata.json`),
    target,
  })) : [{
    dir: outputDir,
    metadataFile: path.join(testDir, 'generated-metadata.json'),
    target: DEFAULT_TARGET,
  }];
  if (generateMode === GeneratorMode.Generate) {
    cleanDir(outputDir);
    for (const { dir, metadataFile, target } of dirsAndTargets) {
      await generatedContentManager.writeToDisk(dir, target.name);
      writeMetaData(generatedContentManager, metadataFile, target.name);
    }
  } else {
    for (const { dir, metadataFile, target } of dirsAndTargets) {
      verifyFiles(generatedContentManager.getGeneratedContent(target.name), dir, target.name);
      verifyMetaData(generatedContentManager, metadataFile, target.name);
    }
  }
}

export async function defaultInitWorkspace({ shared }: { shared: LangiumSharedServices }, workspaceDir: string): Promise<WorkspaceFolder> {
  const workspaceManager = shared.workspace.WorkspaceManager;
  const workspaceFolder: WorkspaceFolder = {
    name: 'MyDSL Workspace',
    uri: URI.file(workspaceDir).toString()
  };

  await workspaceManager.initializeWorkspace([workspaceFolder]);
  return workspaceFolder;
}

export async function defaultBuildDocuments({ shared }: { shared: LangiumSharedServices }, workspaceFolder: WorkspaceFolder): Promise<LangiumDocument<AstNode>[]> {
  const LangiumDocuments = shared.workspace.LangiumDocuments;
  const DocumentBuilder = shared.workspace.DocumentBuilder;
  const documents = LangiumDocuments.all.toArray();
  console.log(`Building workspace ${workspaceFolder.uri} with ${documents.length} DSLs`);
  await DocumentBuilder.build(documents, { validation: true });
  return documents;
}

export async function defaultValidateDocuments(_service: object, documents: LangiumDocument<AstNode>[]): Promise<void> {
  documents.forEach(doc => {
    const summary = getDocumentIssueSummary(doc, { skipValidation: true });
    if (summary.countTotal > 0) {
      expect(summary.summary, `DSL file ${doc.uri} has errors:\n${summary.message}`).toBe('No errors');
    }
  });
}

/**
 * Clean output directory.
 *
 * Make sure not to delete files that are not generated by the generator
 * by checking sibling directories. The dsls directory should be present
 * in the same directory as the out directory.
 *
 * @param outputDir
 */
function cleanDir(outputDir: string) {
  if (!fs.existsSync(outputDir)) {
    return;
  }

  const siblingDirs = fs.readdirSync(path.join(outputDir, ".."));
  if (!siblingDirs.includes("dsls")) {
    throw new Error(`The out directory ${outputDir} should have a sibling directory named 'dsls'`);
  }
  const files = fs.readdirSync(outputDir);
  files.forEach((file) => {
    fs.rmSync(path.join(outputDir, file), { recursive: true });
  });
}

/**
 * Verify, that generated file structure matches exacly
 * with the existing files in the output directory.
 *
 * @param fileContentMap
 * @param outputDir
 */
function verifyFiles(generatedContent: GeneratedContent, outputDir: string, target: string) {
  const files = (fs.readdirSync(outputDir, { recursive: true }) as string[])
    .filter(file => fs.statSync(path.join(outputDir, file)).isFile())
    .map(path.normalize);
  const targetDescription = target == DEFAULT_TARGET.name ? "" : ` for target '${target}'`;
  generatedContent.forEach((content, fileName) => {
    const normFileName = path.normalize(fileName);
    expect(
      files,
      `Unexpected generated file${targetDescription}: ${normFileName}`
    ).toContain(normFileName);
    const filePath = path.join(outputDir, normFileName);
    const fileContent = fs.readFileSync(filePath, "utf-8");
    expect(content.content, `File${targetDescription}: ${fileName}`).toBe(fileContent);
  });
  const generatedFiles = Array.from(generatedContent.keys()).map(path.normalize);
  expect(
    files.length,
    `Missing generated file(s)${targetDescription}: ${files.filter((file) => !generatedFiles.includes(file)).join(", ")}`
  ).toBe(generatedContent.size);
}

/**
  * Write metadata from generated content to the output directory.
  */
function writeMetaData(generatedContent: GeneratedContentManager, metadataJsonFile: string, target: string) {
  const metadata: GeneratorTestOutputDirectoryMetadata = {
    generatedFiles: []
  };

  generatedContent.getGeneratedContent(target).forEach((contentData, fileName) => {
    metadata.generatedFiles.push({ filename: fileName, overwrite: contentData.overwrite });
  });
  metadata.generatedFiles.sortBy(m => m.filename);
  fs.writeFileSync(metadataJsonFile, JSON.stringify(metadata, null, 2));
}

/**
 * Verify metadata from generated content agains metadata file.
 */
function verifyMetaData(generatedContent: GeneratedContentManager, metadataJsonFile: string, target: string) {
  const metadata: GeneratorTestOutputDirectoryMetadata = JSON.parse(fs.readFileSync(metadataJsonFile, 'utf-8'));
  const generatedFiles = generatedContent.getGeneratedContent(target);
  const targetDescription = target == DEFAULT_TARGET.name ? "" : ` for target '${target}'`;
  metadata.generatedFiles.forEach((metadataFile) => {
    const contentData = generatedFiles.get(metadataFile.filename);
    expect(contentData, `File${targetDescription}: ${metadataFile.filename}`).toBeDefined();
    expect(contentData?.overwrite, `File${targetDescription}: ${metadataFile.filename}. Overwrite flag was changed`).toBe(metadataFile.overwrite);
  });
  expect(metadata.generatedFiles.length, `Missmatch in amount of generated files and metadata${targetDescription}`).toBe(generatedFiles.size);
}

