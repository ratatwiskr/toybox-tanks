import { fileURLToPath } from 'node:url';

import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../..', import.meta.url));
const fixtureRoot = 'tests/fixtures/guardrails/sim';

interface LintedFile {
  readonly filePath: string;
  readonly messages: readonly { readonly ruleId: string | null; readonly message: string }[];
}

async function lintFixture(path: string): Promise<LintedFile> {
  const eslint = new ESLint({ cwd: root, ignore: false });
  const results = await eslint.lintFiles([path]);
  const result = results[0];

  if (result === undefined) {
    throw new Error(`ESLint returned no result for ${path}`);
  }

  return { filePath: result.filePath, messages: result.messages };
}

function ruleIds(file: LintedFile): string[] {
  return file.messages.map((message) => message.ruleId ?? '<fatal>');
}

describe('simulation guardrails', () => {
  it('accepts clean simulation fixtures', async () => {
    const file = await lintFixture(`${fixtureRoot}/positive/clean.ts`);

    expect(file.messages, JSON.stringify(file.messages, null, 2)).toEqual([]);
  });

  it.each([
    ['prohibited-import.ts', 'no-restricted-imports'],
    ['restricted-global.ts', 'no-restricted-globals'],
    ['explicit-any.ts', '@typescript-eslint/no-explicit-any'],
    ['unhandled-union.ts', '@typescript-eslint/switch-exhaustiveness-check'],
  ])('rejects %s with %s', async (name, expectedRule) => {
    const file = await lintFixture(`${fixtureRoot}/negative/${name}`);

    expect(ruleIds(file)).toContain(expectedRule);
  });

  it('reports exactly one violation per negative fixture', async () => {
    for (const name of [
      'prohibited-import.ts',
      'restricted-global.ts',
      'explicit-any.ts',
      'unhandled-union.ts',
    ]) {
      const file = await lintFixture(`${fixtureRoot}/negative/${name}`);
      expect(ruleIds(file), name).toHaveLength(1);
    }
  });
});
