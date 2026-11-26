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
  readonly simP50: number;
  readonly simP95: number;
  readonly simMax: number;
  readonly renderP50: number;
  readonly renderP95: number;
  readonly renderMax: number;
  readonly hudP50: number;
  readonly hudP95: number;
  readonly hudMax: number;
  readonly over20ms: number;
  readonly over33ms: number;
  readonly clampHits: number;
}

export interface FrameSampler {
  record(sample: FrameSample, nowMs: number): void;
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
  const simMs = samples.map((sample) => sample.simMs).sort((a, b) => a - b);
  const renderMs = samples.map((sample) => sample.renderMs).sort((a, b) => a - b);
  const hudMs = samples.map((sample) => sample.hudMs).sort((a, b) => a - b);
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
    simP50: percentile(simMs, 0.5),
    simP95: percentile(simMs, 0.95),
    simMax: simMs[simMs.length - 1] ?? 0,
    renderP50: percentile(renderMs, 0.5),
    renderP95: percentile(renderMs, 0.95),
    renderMax: renderMs[renderMs.length - 1] ?? 0,
    hudP50: percentile(hudMs, 0.5),
    hudP95: percentile(hudMs, 0.95),
    hudMax: hudMs[hudMs.length - 1] ?? 0,
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

  const finalizeCapture = (nowMs: number): void => {
    if (capture !== null && nowMs >= captureUntilMs) {
      capturedSummary = summarize(capture);
      capture = null;
    }
  };

  return {
    record(sample, nowMs) {
      if (ring.length < RING_SIZE) {
        ring.push(sample);
      } else {
        ring[ringIndex] = sample;
        ringIndex = (ringIndex + 1) % RING_SIZE;
      }
      if (capture !== null) {
        capture.push(sample);
        finalizeCapture(nowMs);
      }
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
      finalizeCapture(nowMs);
      return capturedSummary;
    },
  };
}
