import { AstNode, LangiumDocument, URI, WorkspaceFolder } from 'langium';
import { type DefaultSharedModuleContext, type LangiumSharedServices } from 'langium/lsp';
import { NodeFileSystem } from 'langium/node';
import path from 'path';
import fs from 'fs';
import { expect, test } from 'vitest';
import { getDocumentIssueSummary } from '../base/document-errors.js';
import { GeneratedContent, GeneratorOutput, GeneratorOutputCollector } from '../generator/generator-output-collector.js';


type DslServices<SERVICES, SHARED_SERVICES> = { shared: LangiumSharedServices & SHARED_SERVICES } & SERVICES;
type ValueOf<T> = T[keyof T];

type ExtractServiceType<T> = ValueOf<Omit<T, 'shared'>>;


export interface GeneratorTestOptions<SERVICES, SHARED_SERVICES, MODEL extends AstNode> {
  createServices: (context: DefaultSharedModuleContext) => DslServices<SERVICES, SHARED_SERVICES>;
  initWorkspace?: (service: DslServices<SERVICES, SHARED_SERVICES>, workspaceDir: string) => Promise<WorkspaceFolder>;
  buildDocuments?: (service: DslServices<SERVICES, SHARED_SERVICES>, workspaceFolder: WorkspaceFolder) => Promise<LangiumDocument<AstNode>[]>;
  validateDocuments?: (service: DslServices<SERVICES, SHARED_SERVICES>, documents: LangiumDocument<AstNode>[]) => Promise<LangiumDocument<AstNode>[]>;
  generateForWorkspace?: (service: DslServices<SERVICES, SHARED_SERVICES>, documents: LangiumDocument<AstNode>[], workspaceFolder: WorkspaceFolder) => Promise<GeneratorOutputCollector>;
  generateForModel?: (services: ExtractServiceType<SERVICES>, document: MODEL, generatorOutput: GeneratorOutput) => Promise<void>;
}

const generateMode = process.env.GENERATOR_TEST === "generate";

export function langiumGeneratorSuite<SERVICES, SHARED_SERVICES, MODEL extends AstNode>(testSuiteDir: string, options: GeneratorTestOptions<SERVICES, SHARED_SERVICES, MODEL>): void {
  fs.readdirSync(testSuiteDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .forEach((dirent) => {
      const testDirName = dirent.name;

      test(`DSL-Workspace "${testDirName}"${generateMode ? ' (generating)' : ''}`, async () => {
        await langiumGeneratorTest<SERVICES, SHARED_SERVICES, MODEL>(path.join(testSuiteDir, testDirName), options);
      })
    })
}

export async function langiumGeneratorTest<SERVICES, SHARED_SERVICES, MODEL extends AstNode>(testDir: string, options: GeneratorTestOptions<SERVICES, SHARED_SERVICES, MODEL>): Promise<void> {

  async function generateForWorkspace(services: DslServices<SERVICES, SHARED_SERVICES>, documents: LangiumDocument<AstNode>[], workspaceFolder: WorkspaceFolder): Promise<GeneratorOutputCollector> {
    const optionsGenerator = options.generateForModel
    if (!optionsGenerator) {
      throw new Error('One of generateForDocument or generateForWorkspace must be defined')
    }

    const collector = new GeneratorOutputCollector();
    for (const document of documents) {
      const model = document.parseResult.value as MODEL;
      // const relativeFileName = path.relative(workspaceFolder.uri, document.uri.toString()); // TODO

      const nonSharedServices = Object.keys(services as object).filter(key => key !== 'shared');
      if (nonSharedServices.length !== 1) {
        throw new Error('Expected exactly one non-shared service');
      }
      const serviceName = nonSharedServices[0];
      await optionsGenerator(services[serviceName as keyof SERVICES] as ExtractServiceType<SERVICES>, model, collector.generatorOutputFor(model)); // TODO relativeFileName
    }
    return collector;
  }
  const optionsInitWorkspace = options.initWorkspace || initWorkspace;
  const optionsBuildDocuments = options.buildDocuments || buildDocuments;
  const optionsValidateDocuments = options.validateDocuments || validateDocuments;
  const optionsGenerateForWorkspace = options.generateForWorkspace || generateForWorkspace;

  const services = options.createServices(NodeFileSystem)
  const workspaceFolder = await optionsInitWorkspace(services, testDir);
  const documents = await optionsBuildDocuments(services, workspaceFolder);
  await optionsValidateDocuments(services, documents);
  const generatorOutputCollector = await optionsGenerateForWorkspace(services, documents, workspaceFolder);


  const outputDir = path.join(testDir, 'generated');

  if (generateMode) {
    cleanDir(outputDir);
    generatorOutputCollector.writeToDisk(outputDir);
  } else {
    verifyFiles(generatorOutputCollector.getGeneratedContent(), outputDir);
  }
}

export async function initWorkspace({ shared }: { shared: LangiumSharedServices }, workspaceDir: string): Promise<WorkspaceFolder> {
  const workspaceManager = shared.workspace.WorkspaceManager;
  const workspaceFolder: WorkspaceFolder = {
    name: 'MyDSL Workspace',
    uri: URI.file(workspaceDir).toString()
  };

  await workspaceManager.initializeWorkspace([workspaceFolder]);
  return workspaceFolder;
}

export async function buildDocuments({ shared }: { shared: LangiumSharedServices }, workspaceFolder: WorkspaceFolder): Promise<LangiumDocument<AstNode>[]> {
  const LangiumDocuments = shared.workspace.LangiumDocuments;
  const DocumentBuilder = shared.workspace.DocumentBuilder;
  const documents = LangiumDocuments.all.toArray();
  console.log(`Building workspace ${workspaceFolder.uri} with ${documents.length} DSLs`);
  await DocumentBuilder.build(documents, { validation: true });
  return documents;
}


export async function validateDocuments(_service: object, documents: LangiumDocument<AstNode>[]): Promise<void> {
  documents.forEach(doc => {
    const summery = getDocumentIssueSummary(doc, { skipValidation: true });
    if (summery.countTotal > 0) {
      expect(summery.summary, `DSL file ${doc.uri} has errors:\n${summery.message}`).toBe('No errors');
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

  const siblingDirs = fs.readdirSync(path.join(outputDir, ".."))
  if (!siblingDirs.includes("dsls")) {
    throw new Error("The out directory ${outputDir} should have a sibling directory named 'dsls'");
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
function verifyFiles(generatedContent: GeneratedContent, outputDir: string) {
  const files = (fs.readdirSync(outputDir, { recursive: true }) as string[])
    .filter(file => fs.statSync(path.join(outputDir, file)).isFile())
    .map(path.normalize);
  generatedContent.forEach((content, fileName) => {
    const normFileName = path.normalize(fileName)
    try {
      expect(files).toContain(normFileName);
    } catch (error) {
      console.error('ERROR: Unexpected generated file:')
      console.error(`- '${URI.parse(normFileName)}')`)
      console.error('Expecting files:')
      files.forEach(file =>
        console.error(`- '${URI.parse(file)}'`)
      )
      throw error
    }
    const filePath = path.join(outputDir, normFileName);
    const fileContent = fs.readFileSync(filePath, "utf-8");
    expect(content.content, "File: " + fileName).toBe(fileContent);
  });
  try {
    expect(files.length, "Missing generated files").toBe(generatedContent.size)
  } catch (error) {
    console.error("ERROR: Missing generated files:")
    const generatedFiles = Array.from(generatedContent.keys()).map(path.normalize)
    files.filter((file) => !generatedFiles.includes(file))
      .forEach(file => {
        console.error(`- ${file}`)
      })
    throw error
  }

}
