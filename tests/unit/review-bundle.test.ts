import { describe, expect, it } from 'vitest';

import { buildReviewBundleJson, buildReviewBundleMarkdown } from '../../src/review/review-bundle';

describe('review bundle', () => {
  it('includes required sections and schemaVersion', () => {
    const input = {
      brief: 'brief',
      promptKey: 'performance',
      prompt: 'prompt',
      diagnostics: 'diag',
      capture: {
        samples: 1,
        p50: 1,
        p95: 1,
        p99: 1,
        max: 1,
        simP50: 0.2,
        simP95: 0.3,
        simMax: 0.4,
        renderP50: 0.5,
        renderP95: 0.6,
        renderMax: 0.7,
        hudP50: 0.1,
        hudP95: 0.1,
        hudMax: 0.1,
        over20ms: 0,
        over33ms: 0,
        clampHits: 0,
      },
      eventLog: [{ at: '2026-01-01T00:00:00.000Z', kind: 'state', detail: 'menu' }],
      fields: { scope: 'Performance and scaling', observation: 'obs' },
      selectedSourcePath: '/src/main.ts',
      selectedSource: 'console.log(1);',
    };

    const md = buildReviewBundleMarkdown(input);
    expect(md).toContain('# Toybox Tanks agent review bundle');
    expect(md).toContain('## Selected prompt');
    expect(md).toContain('## Runtime diagnostics');
    expect(md).toContain('## Event log');
    expect(md).toContain('## Selected source');
    expect(md).toContain('console.log(1);');

    const json = buildReviewBundleJson(input);
    expect(json.schemaVersion).toBe(1);
    expect(json.prompt).toEqual({ key: 'performance', text: 'prompt' });
    expect(json.eventLog).toHaveLength(1);
  });
});
