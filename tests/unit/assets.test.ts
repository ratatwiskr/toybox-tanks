import { describe, expect, it } from 'vitest';
import type { AssetDefinition } from '../../src/render/asset-data';
import { TANK_BLUE } from '../../src/render/asset-data';
import {
  ASSET_DEFINITIONS,
  buildLayerSvg,
  createAssetAdapter,
  validateAssetDefinition,
  type AssetCanvasFactory,
  type AssetDecoder,
  type AssetLoadError,
} from '../../src/render/assets';

interface RecordedDraw {
  readonly image: CanvasImageSource;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface RecordingContext {
  readonly context: CanvasRenderingContext2D;
  readonly draws: RecordedDraw[];
  readonly rotations: number[];
}

function createRecordingContext(): RecordingContext {
  const draws: RecordedDraw[] = [];
  const rotations: number[] = [];
  const context = {
    save: () => {},
    restore: () => {},
    translate: () => {},
    rotate: (angle: number) => {
      rotations.push(angle);
    },
    drawImage: (image: CanvasImageSource, x: number, y: number, width: number, height: number) => {
      draws.push({ image, x, y, width, height });
    },
  } as unknown as CanvasRenderingContext2D;

  return { context, draws, rotations };
}

interface FakePipeline {
  readonly decode: AssetDecoder;
  readonly createCanvas: AssetCanvasFactory;
  readonly decoded: string[];
  readonly canvases: HTMLCanvasElement[];
  readonly decodeCalls: () => number;
}

function createFakePipeline(failAtDecode?: number): FakePipeline {
  const decoded: string[] = [];
  const canvases: HTMLCanvasElement[] = [];
  let calls = 0;

  const decode: AssetDecoder = (source) => {
    calls += 1;
    decoded.push(source);
    if (failAtDecode !== undefined && calls === failAtDecode) {
      return Promise.reject(new Error('decode boom'));
    }
    return Promise.resolve({} as unknown as CanvasImageSource);
  };

  const createCanvas: AssetCanvasFactory = (resolution) => {
    const canvas = { width: resolution, height: resolution } as unknown as HTMLCanvasElement;
    canvases.push(canvas);
    return { canvas, context: createRecordingContext().context };
  };

  return { decode, createCanvas, decoded, canvases, decodeCalls: () => calls };
}

interface Deferred<T> {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe('asset adapter', () => {
  it('builds a layer SVG with the asset viewBox and fragment', () => {
    const [body] = TANK_BLUE.parts;
    if (!body) {
      throw new Error('TANK_BLUE is missing its body layer.');
    }
    const svg = buildLayerSvg(TANK_BLUE, body, 256);

    expect(svg).toContain('viewBox="-64 -64 128 128"');
    expect(svg).toContain('width="256"');
    expect(svg).toContain('height="256"');
    expect(svg).toContain('fill="#458fc5"');
  });

  it('accepts every checked-in asset definition', () => {
    for (const [id, definition] of Object.entries(ASSET_DEFINITIONS)) {
      expect(validateAssetDefinition(definition), id).toEqual([]);
    }
  });

  it('flags malformed definitions before rasterization', () => {
    const invalid = {
      label: 'Broken',
      viewBox: [0, 0, -1, 1],
      anchor: [0, 0],
      parts: [
        { role: 'body', svg: '' },
        { role: 'body', svg: '<g/>' },
      ],
    } as unknown as AssetDefinition;

    expect(validateAssetDefinition(invalid)).toEqual(
      expect.arrayContaining([
        'viewBox width and height must be positive',
        'duplicate layer role "body"',
        'layer "body" must contain an SVG fragment',
      ]),
    );
  });

  it('reports an unknown ID instead of rasterizing anything', async () => {
    const fake = createFakePipeline();
    const errors: AssetLoadError[] = [];
    const adapter = createAssetAdapter({
      decode: fake.decode,
      createCanvas: fake.createCanvas,
      onError: (error) => {
        errors.push(error);
      },
    });

    await expect(adapter.prepare('missing-tank')).rejects.toMatchObject({
      code: 'unknown-asset',
      assetId: 'missing-tank',
    });
    expect(fake.decodeCalls()).toBe(0);
    expect(adapter.cacheSize()).toBe(0);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toContain('Procedural artwork will be used instead');
  });

  it('reports invalid definitions through the adapter', async () => {
    const invalid: AssetDefinition = {
      label: 'Broken',
      viewBox: [0, 0, 0, 1],
      anchor: [0, 0],
      parts: [{ role: 'body', svg: '<g/>' }],
    };
    const fake = createFakePipeline();
    const adapter = createAssetAdapter({
      definitions: { broken: invalid },
      decode: fake.decode,
      createCanvas: fake.createCanvas,
      onError: () => {},
    });

    await expect(adapter.prepare('broken')).rejects.toMatchObject({ code: 'invalid-asset' });
    expect(fake.decodeCalls()).toBe(0);
  });

  it('rasterizes each layer once and reuses the cached layers', async () => {
    const fake = createFakePipeline();
    const adapter = createAssetAdapter({
      decode: fake.decode,
      createCanvas: fake.createCanvas,
    });

    const first = await adapter.prepare('tank-blue');
    const second = await adapter.prepare('tank-blue');

    expect(second).toBe(first);
    expect(fake.decoded).toHaveLength(TANK_BLUE.parts.length);
    expect(adapter.cacheSize()).toBe(1);
  });

  it('shares one decode between concurrent prepare calls', async () => {
    const fake = createFakePipeline();
    const adapter = createAssetAdapter({
      decode: fake.decode,
      createCanvas: fake.createCanvas,
    });

    const [first, second] = await Promise.all([
      adapter.prepare('tank-blue'),
      adapter.prepare('tank-blue'),
    ]);

    expect(second).toBe(first);
    expect(fake.decodeCalls()).toBe(TANK_BLUE.parts.length);
  });

  it('evicts the least recently used layer set when the cache is full', async () => {
    const fake = createFakePipeline();
    const adapter = createAssetAdapter({
      cacheLimit: 2,
      decode: fake.decode,
      createCanvas: fake.createCanvas,
    });

    await adapter.prepare('tank-blue');
    await adapter.prepare('tank-orange');
    await adapter.prepare('turret-enemy');

    expect(adapter.cacheSize()).toBe(2);

    const before = fake.decodeCalls();
    await adapter.prepare('tank-blue');
    expect(fake.decodeCalls()).toBe(before + TANK_BLUE.parts.length);
    expect(adapter.cacheSize()).toBe(2);
  });

  it('reports decode failures, keeps them out of the cache and allows a retry', async () => {
    const fake = createFakePipeline(2);
    const errors: AssetLoadError[] = [];
    const adapter = createAssetAdapter({
      decode: fake.decode,
      createCanvas: fake.createCanvas,
      onError: (error) => {
        errors.push(error);
      },
    });

    await expect(adapter.prepare('tank-blue')).rejects.toMatchObject({ code: 'decode-failed' });
    expect(adapter.cacheSize()).toBe(0);
    expect(errors).toHaveLength(1);

    const layers = await adapter.prepare('tank-blue');
    expect(layers).toHaveLength(TANK_BLUE.parts.length);
    expect(adapter.cacheSize()).toBe(1);
  });

  it('returns false from draw until the asset is prepared', () => {
    const fake = createFakePipeline();
    const adapter = createAssetAdapter({
      decode: fake.decode,
      createCanvas: fake.createCanvas,
    });
    const { context, draws } = createRecordingContext();

    expect(adapter.draw(context, 'tank-blue', 0, 0, 24)).toBe(false);
    expect(draws).toHaveLength(0);
  });

  it('draws prepared layers without mutating them', async () => {
    const fake = createFakePipeline();
    const adapter = createAssetAdapter({
      decode: fake.decode,
      createCanvas: fake.createCanvas,
    });
    const layers = await adapter.prepare('tank-blue');
    Object.freeze(layers);
    const angles = Object.freeze({ bodyAngle: 0, aimAngle: 90 });
    const { context, draws, rotations } = createRecordingContext();

    expect(adapter.draw(context, 'tank-blue', 10, 20, 40, angles)).toBe(true);
    expect(draws).toHaveLength(TANK_BLUE.parts.length);
    expect(rotations).toHaveLength(TANK_BLUE.parts.length);
    expect(rotations[1]).toBeCloseTo(Math.PI / 2);
  });

  it('drops an in-flight result after reset', async () => {
    const image = deferred<CanvasImageSource>();
    const fake = createFakePipeline();
    const adapter = createAssetAdapter({
      decode: () => image.promise,
      createCanvas: fake.createCanvas,
    });

    const loading = adapter.prepare('tank-blue');
    adapter.reset();
    image.resolve({} as unknown as CanvasImageSource);

    await expect(loading).resolves.toHaveLength(TANK_BLUE.parts.length);
    expect(adapter.cacheSize()).toBe(0);
  });

  it('collects failures from preload instead of rejecting the batch', async () => {
    const fake = createFakePipeline();
    const adapter = createAssetAdapter({
      decode: fake.decode,
      createCanvas: fake.createCanvas,
      onError: () => {},
    });

    const report = await adapter.preload(['tank-blue', 'missing-tank']);

    expect(report.loaded).toEqual(['tank-blue']);
    expect(report.failed).toHaveLength(1);
    expect(report.failed[0]?.code).toBe('unknown-asset');
    expect(adapter.cacheSize()).toBe(1);
  });
});
