import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const packageJson = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
const installedVitest = JSON.parse(readFileSync(new URL('../../node_modules/vitest/package.json', import.meta.url), 'utf8'));

/**
 * `^major.minor.patch` for major >= 1: same major, and not older than the floor.
 */
function satisfiesCaret(range: string, version: string): boolean {
  const rangeMatch = /^\^(\d+)\.(\d+)\.(\d+)$/.exec(range);
  const versionMatch = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!rangeMatch || !versionMatch) {
    throw new Error(`Unsupported range or version: ${range} / ${version}`);
  }
  const rangeParts = rangeMatch.slice(1).map(Number);
  const versionParts = versionMatch.slice(1).map(Number);
  const rangeMajor = rangeParts[0]!;
  const rangeMinor = rangeParts[1]!;
  const rangePatch = rangeParts[2]!;
  const versionMajor = versionParts[0]!;
  const versionMinor = versionParts[1]!;
  const versionPatch = versionParts[2]!;
  if (rangeMajor < 1) {
    throw new Error('This check only covers major >= 1');
  }
  if (versionMajor !== rangeMajor) {
    return false;
  }
  if (versionMinor !== rangeMinor) {
    return versionMinor > rangeMinor;
  }
  return versionPatch >= rangePatch;
}

describe('Vitest peer dependency', () => {
  test('peer range is the patched Vitest 5 line', () => {
    expect(packageJson.peerDependencies.vitest).toBe('^5.1.1');
    expect(packageJson.devDependencies.vitest).toBe('^5.1.1');
  });

  test('range accepts 5.1.1 and rejects the vulnerable lines', () => {
    const range = packageJson.peerDependencies.vitest as string;
    expect(satisfiesCaret(range, '5.1.1')).toBe(true);
    expect(satisfiesCaret(range, '5.2.0')).toBe(true);
    // 2.0.5 is the old peer (GHSA-9crc-q9x8-hgqq). 4.0.x is GHSA-5xrq-8626-4rwp.
    // 3.2.x and 4.1.x are patched, but their Assertion types do not merge with Vitest 5.
    for (const version of ['2.0.5', '2.1.9', '3.2.6', '3.2.7', '4.0.9', '4.1.0', '5.1.0', '6.0.0']) {
      expect(satisfiesCaret(range, version), version).toBe(false);
    }
    expect(satisfiesCaret(range, installedVitest.version)).toBe(true);
  });
});
