export function packageToPath(packageName?: string): string | unknown {
  return packageName?.replace(/\./g, "/");
}

