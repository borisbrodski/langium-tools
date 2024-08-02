import { AstNode, LangiumDocument, URI, WorkspaceFolder } from 'langium';
import { type DefaultSharedModuleContext, type LangiumSharedServices } from 'langium/lsp';
import { NodeFileSystem } from 'langium/node';
import path from 'path';
import fs from 'fs';
import { expect, test } from 'vitest';
import { getDocumentIssues } from '../base/document-errors.js';
import { GeneratedContent, GeneratorOutput, GeneratorOutputCollector } from '../generator/generator-output-collector.js';

type DslServices<SERVICES> = { shared: LangiumSharedServices } & SERVICES;

export interface GeneratorTestOptions<SERVICES, MODEL> {
  createServices: (context: DefaultSharedModuleContext) => DslServices<SERVICES>;
  initWorkspace?: (service: DslServices<SERVICES>, workspaceDir: string) => Promise<WorkspaceFolder>;
  buildDocuments?: (service: DslServices<SERVICES>, workspaceFolder: WorkspaceFolder) => Promise<LangiumDocument<AstNode>[]>;
  validateDocuments?: (service: DslServices<SERVICES>, documents: LangiumDocument<AstNode>[]) => Promise<LangiumDocument<AstNode>[]>;
  generateForWorkspace?: (service: DslServices<SERVICES>, documents: LangiumDocument<AstNode>[], workspaceFolder: WorkspaceFolder) => Promise<GeneratorOutputCollector>;
  generateForModel?: (document: MODEL, generatorOutput: GeneratorOutput) => Promise<void>;
}

const generateMode = process.env.GENERATOR_TEST === "generate";

export function langiumGeneratorSuite<SERVICES, MODEL>(testSuiteDir: string, options: GeneratorTestOptions<SERVICES, MODEL>): void {
  fs.readdirSync(testSuiteDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .forEach((dirent) => {
      const testDirName = dirent.name;

      test(`DSL-Workspace "${testDirName}"${generateMode ? ' (generating)' : ''})}`, async () => {
        langiumGeneratorTest<SERVICES, MODEL>(path.join(testSuiteDir, testDirName), options);
      })
    })
}

export async function langiumGeneratorTest<SERVICES, MODEL>(testDir: string, options: GeneratorTestOptions<SERVICES, MODEL>): Promise<void> {
  async function generateForWorkspace(_service: DslServices<SERVICES>, documents: LangiumDocument<AstNode>[], workspaceFolder: WorkspaceFolder): Promise<GeneratorOutputCollector> {
    const optionsGenerator = options.generateForModel
    if (!optionsGenerator) {
      throw new Error('One of generateForDocument or generateForWorkspace must be defined')
    }

    const collector = new GeneratorOutputCollector();
    for (const document of documents) {
      const model = document.parseResult.value as MODEL;
      const relativeFileName = path.relative(workspaceFolder.uri, document.uri.toString());
      await optionsGenerator(model, collector.generatorOutputFor(relativeFileName));
    }
    return collector;
  }
  const optionsInitWorkspace = options.initWorkspace || initWorkspace;
  const optionsBuildDocuments = options.buildDocuments || buildDocuments;
  const optionsValidateDocuments = options.validateDocuments || validateDocuments;
  const optionsGenerateForWorkspace = options.generateForWorkspace || generateForWorkspace;

  const services = options.createServices(NodeFileSystem)
  const workspaceFolder = await optionsInitWorkspace(services, path.join(testDir, 'dsls'));
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
    const summery = getDocumentIssues(doc, false);
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
function verifyFiles(content: GeneratedContent, outputDir: string) {
  const files = (fs.readdirSync(outputDir, { recursive: true }) as string[])
    .filter(file => fs.statSync(path.join(outputDir, file)).isFile());
  content.forEach((content, fileName) => {
    expect(files, "Unexpected generated file").toContain(fileName);
    const filePath = path.join(outputDir, fileName);
    const fileContent = fs.readFileSync(filePath, "utf-8");
    expect(fileContent, "File: " + fileName).toBe(content.content);
  });
  if (files.length !== content.size) {
    const missingFiles = Array.from(content.keys()).filter((file) => !files.includes(file));
    expect("Missing files: " + missingFiles).toBe("No missing files");
  }

}
