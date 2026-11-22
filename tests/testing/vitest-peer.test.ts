import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const packageJson = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
const installedVitest = JSON.parse(readFileSync(new URL('../../node_modules/vitest/package.json', import.meta.url), 'utf8'));
const matchersSource = readFileSync(new URL('../../src/testing/matchers.ts', import.meta.url), 'utf8');

const PEER_RANGE = '^2.1.9 || ^3.2.6 || >=4.1.0';

function compareVersions(left: readonly number[], right: readonly number[]): number {
  for (let index = 0; index < 3; index += 1) {
    const leftPart = left[index] ?? 0;
    const rightPart = right[index] ?? 0;
    if (leftPart !== rightPart) {
      return leftPart < rightPart ? -1 : 1;
    }
  }
  return 0;
}

function parseVersion(version: string): number[] {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) {
    throw new Error(`Unsupported version: ${version}`);
  }
  return match.slice(1).map(Number);
}

/**
 * The peer string is a list of `^major.minor.patch` (major >= 1) and `>=major.minor.patch` parts.
 */
function satisfiesPeer(range: string, version: string): boolean {
  const actual = parseVersion(version);
  return range.split('||').some((part) => {
    const candidate = part.trim();
    const caret = /^\^(\d+)\.(\d+)\.(\d+)$/.exec(candidate);
    if (caret) {
      const floor = caret.slice(1).map(Number);
      return actual[0] === floor[0] && compareVersions(actual, floor) >= 0;
    }
    const minimum = /^>=(\d+)\.(\d+)\.(\d+)$/.exec(candidate);
    if (minimum) {
      return compareVersions(actual, minimum.slice(1).map(Number)) >= 0;
    }
    throw new Error(`Unsupported range part: ${candidate}`);
  });
}

describe('Vitest peer dependency', () => {
  test('peer range covers the patched Vitest lines', () => {
    expect(packageJson.peerDependencies.vitest).toBe(PEER_RANGE);
    expect(packageJson.devDependencies.vitest).toBe('^5.1.1');
  });

  test('range accepts patched releases and rejects the vulnerable lines', () => {
    const range = packageJson.peerDependencies.vitest as string;
    for (const version of ['2.1.9', '2.2.0', '3.2.6', '3.2.7', '4.1.0', '4.1.12', '5.0.0', '5.1.1', '5.2.0', '6.0.0']) {
      expect(satisfiesPeer(range, version), version).toBe(true);
    }
    // 2.0.x is GHSA-9crc-q9x8-hgqq. Everything below 3.2.6 and 4.0.x is GHSA-5xrq-8626-4rwp.
    for (const version of ['2.0.5', '2.1.8', '3.0.5', '3.2.5', '4.0.9', '4.0.18']) {
      expect(satisfiesPeer(range, version), version).toBe(false);
    }
    expect(satisfiesPeer(range, installedVitest.version)).toBe(true);
  });

  test('matchers extend Chai so one declaration covers Vitest 2 through 5', () => {
    expect(matchersSource).toContain('namespace Chai');
    expect(matchersSource).not.toContain("declare module 'vitest'");
    expect(matchersSource).not.toContain('declare module "vitest"');
  });
});
