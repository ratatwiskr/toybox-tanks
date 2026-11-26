import { describe, expect, it } from 'vitest';

import { createFrameSampler, type FrameSample } from '../../src/review/frame-sampler';

function sample(dt: number, overrides: Partial<FrameSample> = {}): FrameSample {
  return {
    dt,
    simMs: 1,
    renderMs: 1,
    hudMs: 0.1,
    steps: 1,
    clamped: false,
    ...overrides,
  };
}

describe('frame sampler', () => {
  it('computes percentiles on known arrays', () => {
    const sampler = createFrameSampler();
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].forEach((dt) => {
      sampler.record(sample(dt));
    });

    expect(sampler.summary()).toMatchObject({
      samples: 10,
      p50: 5,
      p95: 10,
      p99: 10,
      max: 10,
      over20ms: 0,
      over33ms: 0,
      clampHits: 0,
    });
  });

  it('wraps the 240-sample ring buffer', () => {
    const sampler = createFrameSampler();
    for (let i = 1; i <= 245; i += 1) {
      sampler.record(sample(i));
    }

    const summary = sampler.summary();
    expect(summary.samples).toBe(240);
    expect(summary.max).toBe(245);
    expect(summary.p50).toBe(125); // samples 6..245
  });

  it('counts clamp hits and slow frames', () => {
    const sampler = createFrameSampler();
    sampler.record(sample(16));
    sampler.record(sample(21));
    sampler.record(sample(34, { clamped: true }));

    expect(sampler.summary()).toMatchObject({
      samples: 3,
      over20ms: 2,
      over33ms: 1,
      clampHits: 1,
    });
  });

  it('captures a full 10s window independently of the rolling ring', () => {
    const sampler = createFrameSampler();
    sampler.startCapture(1000);

    for (let i = 0; i < 600; i += 1) {
      sampler.record(sample(16.7));
    }
    expect(sampler.captureSummary(10_999)).toBeNull();

    const captured = sampler.captureSummary(11_000);
    expect(captured).not.toBeNull();
    expect(captured).toMatchObject({
      samples: 600,
      clampHits: 0,
      over33ms: 0,
    });

    // Samples after capture finalization should not enter the 10s summary.
    sampler.record(sample(40, { clamped: true }));
    expect(sampler.captureSummary(11_100)).toEqual(captured);

    // Rolling ring only keeps last 240, including post-capture sample.
    expect(sampler.summary().samples).toBe(240);
    expect(sampler.summary().clampHits).toBe(1);
  });
});
