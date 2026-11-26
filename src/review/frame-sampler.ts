export interface FrameSample {
  readonly dt: number;
  readonly simMs: number;
  readonly renderMs: number;
  readonly hudMs: number;
  readonly steps: number;
  readonly clamped: boolean;
}

export interface FrameSamplerSummary {
  readonly samples: number;
  readonly p50: number;
  readonly p95: number;
  readonly p99: number;
  readonly max: number;
  readonly over20ms: number;
  readonly over33ms: number;
  readonly clampHits: number;
}

export interface FrameSampler {
  record(sample: FrameSample): void;
  summary(): FrameSamplerSummary;
  reset(): void;
  startCapture(nowMs: number): void;
  captureSummary(nowMs: number): FrameSamplerSummary | null;
}

const RING_SIZE = 240;
const CAPTURE_MS = 10_000;

function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
  return sorted[index] ?? 0;
}

function summarize(samples: readonly FrameSample[]): FrameSamplerSummary {
  const dts = samples.map((sample) => sample.dt).sort((a, b) => a - b);
  let over20ms = 0;
  let over33ms = 0;
  let clampHits = 0;
  for (const sample of samples) {
    if (sample.dt > 20) over20ms += 1;
    if (sample.dt > 33) over33ms += 1;
    if (sample.clamped) clampHits += 1;
  }
  return {
    samples: samples.length,
    p50: percentile(dts, 0.5),
    p95: percentile(dts, 0.95),
    p99: percentile(dts, 0.99),
    max: dts[dts.length - 1] ?? 0,
    over20ms,
    over33ms,
    clampHits,
  };
}

export function createFrameSampler(): FrameSampler {
  const ring: FrameSample[] = [];
  let ringIndex = 0;
  let capture: FrameSample[] | null = null;
  let captureUntilMs = 0;
  let capturedSummary: FrameSamplerSummary | null = null;

  const ringSamples = (): FrameSample[] => {
    if (ring.length < RING_SIZE) return ring.slice();
    return [...ring.slice(ringIndex), ...ring.slice(0, ringIndex)];
  };

  return {
    record(sample) {
      if (ring.length < RING_SIZE) {
        ring.push(sample);
      } else {
        ring[ringIndex] = sample;
        ringIndex = (ringIndex + 1) % RING_SIZE;
      }
      if (capture !== null) capture.push(sample);
    },
    summary() {
      return summarize(ringSamples());
    },
    reset() {
      ring.length = 0;
      ringIndex = 0;
      capture = null;
      captureUntilMs = 0;
      capturedSummary = null;
    },
    startCapture(nowMs) {
      capture = [];
      captureUntilMs = nowMs + CAPTURE_MS;
      capturedSummary = null;
    },
    captureSummary(nowMs) {
      if (capture !== null && nowMs >= captureUntilMs) {
        capturedSummary = summarize(capture);
        capture = null;
      }
      return capturedSummary;
    },
  };
}
