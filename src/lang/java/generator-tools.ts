import { CreateFileOptions, GeneratorManager } from "langium-tools/generator";
import { CompositeGeneratorNode, expandToNode, isGeneratorNode, toString } from "langium/generate";
import { packageToPath } from "./common.js";
import { JavaImportManager } from "./import-manager.js";

export function generateJavaFile(
  fileName: string,
  packageName: string,
  generatorManager: GeneratorManager,
  bodyGenerator: (importManager: (fqn: string) => string) => CompositeGeneratorNode,
  options?: CreateFileOptions
) {
  const importManager = new JavaImportManager();

  const body = bodyGenerator(fqn => importManager.useClass(fqn));

  generatorManager.createFile(`${packageToPath(packageName)}/${fileName}.java`, toString(expandToNode`
    package ${packageName};

    ${importManager.generateImports()}

    ${body}
  `), options);
}

