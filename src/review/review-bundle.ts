import type { FrameSamplerSummary } from './frame-sampler';
import type { ReviewEvent } from './review-events';

export interface ReviewBundleInput {
  readonly brief: string;
  readonly promptKey: string;
  readonly prompt: string;
  readonly diagnostics: string;
  readonly capture: FrameSamplerSummary | null;
  readonly eventLog: readonly ReviewEvent[];
  readonly fields: Readonly<Record<string, string>>;
  readonly selectedSourcePath: string;
  readonly selectedSource: string;
}

export function buildReviewBundleMarkdown(input: ReviewBundleInput): string {
  return [
    '# Toybox Tanks agent review bundle',
    '',
    '## Brief',
    input.brief,
    '',
    '## Selected prompt',
    `Key: ${input.promptKey}`,
    '',
    input.prompt,
    '',
    '## Runtime diagnostics',
    input.diagnostics,
    '',
    '## 10s capture',
    input.capture === null ? '_Not recorded._' : JSON.stringify(input.capture, null, 2),
    '',
    '## Event log',
    input.eventLog.length === 0
      ? '_No events._'
      : input.eventLog.map((e) => `- ${e.at} [${e.kind}] ${e.detail}`).join('\n'),
    '',
    '## Form fields',
    ...Object.entries(input.fields).flatMap(([key, value]) => [
      `### ${key}`,
      value || '_Not recorded._',
      '',
    ]),
    '## Selected source',
    `Path: ${input.selectedSourcePath || '_none_'}`,
    '',
    '```ts',
    input.selectedSource || '// no source selected',
    '```',
  ].join('\n');
}

export function buildReviewBundleJson(input: ReviewBundleInput): Record<string, unknown> {
  return {
    schemaVersion: 1,
    brief: input.brief,
    prompt: { key: input.promptKey, text: input.prompt },
    diagnostics: input.diagnostics,
    capture: input.capture,
    eventLog: input.eventLog,
    fields: input.fields,
    selectedSource: {
      path: input.selectedSourcePath,
      content: input.selectedSource,
    },
  };
}
