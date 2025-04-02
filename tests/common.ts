import path from "path";
import * as fs from 'fs'

export function using<T>(obj: T, fnc: (t: T) => void) {
  fnc(obj);
}

export function listAllFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = entries.map((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return listAllFiles(fullPath);
    } else if (entry.isFile()) {
      return [fullPath];
    } else {
      return []; // Skip symbolic links, etc.
    }
  })
  return files.flat();
}

export function removeTmpDirectory(dir: string): void {
  if (fs.existsSync(dir)) {
    // Ensure we removing only .dsl and .js files and the directory itself
    listAllFiles(dir).forEach((file) => {
      const ext = path.extname(file)
      if (ext !== '.dsl' && ext !== '.js') {
        throw new Error(`Unexpected file found in tmp directory: ${file}`)
      }
    })
    fs.rmSync(dir, { recursive: true })
  }
}

