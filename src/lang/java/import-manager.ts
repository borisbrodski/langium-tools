import { EOL } from "node:os";

export class JavaImportManager {
  classes: Map<string, string> = new Map();

  useClass(fullQualifiedName: string): string {
    const dotIndex = fullQualifiedName.lastIndexOf(".");
    if (dotIndex === -1) {
      return fullQualifiedName;
    }

    const name = fullQualifiedName.slice(dotIndex + 1);
    if (!this.classes.has(name)) {
      this.classes.set(name, fullQualifiedName);
      return name;
    }
    const importedFQN = this.classes.get(name);
    return (importedFQN === fullQualifiedName) ? name : fullQualifiedName;
  }

  generateImports(): string {
    return Array.from(this.classes.values()).map((fqn) => `import ${fqn};`).sort().join(EOL);
  }
}

