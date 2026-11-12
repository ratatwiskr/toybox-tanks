import {
  TANK_BLUE,
  TANK_ORANGE,
  TURRET_ENEMY,
  type AssetDefinition,
  type AssetPart,
  type AssetPartRole,
} from './asset-data';

export type AssetId = 'tank-blue' | 'tank-orange' | 'turret-enemy';

export const ASSET_DEFINITIONS: Readonly<Record<AssetId, AssetDefinition>> = {
  'tank-blue': TANK_BLUE,
  'tank-orange': TANK_ORANGE,
  'turret-enemy': TURRET_ENEMY,
};

export type PreparedAssetLayer = {
  role: AssetPartRole;
  canvas: HTMLCanvasElement;
};

export type AssetLayerAngles = {
  bodyAngle?: number;
  aimAngle?: number;
};

export type AssetErrorCode =
  'unknown-asset' | 'invalid-asset' | 'decode-failed' | 'canvas-unavailable' | 'invalid-resolution';

export class AssetLoadError extends Error {
  readonly code: AssetErrorCode;
  readonly assetId: string;

  constructor(code: AssetErrorCode, assetId: string, detail: string) {
    super(
      `Could not load asset "${assetId}" (${code}): ${detail}. ` +
        'Procedural artwork will be used instead.',
    );
    this.name = 'AssetLoadError';
    this.code = code;
    this.assetId = assetId;
  }
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const DEFAULT_RESOLUTION = 256;
const DEFAULT_CACHE_LIMIT = 16;
const LAYER_ROLES: readonly AssetPartRole[] = ['body', 'aim', 'fixed', 'loaded'];

export function buildLayerSvg(
  asset: AssetDefinition,
  part: AssetPart,
  resolution: number = DEFAULT_RESOLUTION,
): string {
  const viewBox = asset.viewBox.join(' ');
  return (
    `<svg xmlns="${SVG_NS}" width="${String(resolution)}" height="${String(resolution)}" ` +
    `viewBox="${viewBox}">${part.svg}</svg>`
  );
}

function validateNumberPair(field: string, value: readonly number[]): string[] {
  if (value.length !== 2 || value.some((entry) => !Number.isFinite(entry))) {
    return [`${field} must contain two finite numbers`];
  }
  return [];
}

/**
 * Returns everything that would make rasterizing or drawing an asset ambiguous.
 * This is pure so it can run for checked-in data and for an injected pack alike.
 */
export function validateAssetDefinition(asset: AssetDefinition): string[] {
  const issues: string[] = [];

  if (asset.label.trim() === '') {
    issues.push('label must not be empty');
  }

  const viewBox: readonly number[] = asset.viewBox;
  if (viewBox.length !== 4 || viewBox.some((entry) => !Number.isFinite(entry))) {
    issues.push('viewBox must contain four finite numbers');
  } else {
    const width = viewBox[2];
    const height = viewBox[3];
    if (width === undefined || height === undefined || width <= 0 || height <= 0) {
      issues.push('viewBox width and height must be positive');
    }
  }

  const anchor: readonly number[] = asset.anchor;
  issues.push(...validateNumberPair('anchor', anchor));

  if (asset.muzzle !== undefined) {
    const muzzle: readonly number[] = asset.muzzle;
    issues.push(...validateNumberPair('muzzle', muzzle));
  }

  if (asset.shadow !== undefined && asset.shadow !== null) {
    const shadow: readonly number[] = asset.shadow;
    issues.push(...validateNumberPair('shadow', shadow));
  }

  if (asset.parts.length === 0) {
    issues.push('at least one layer is required');
  }

  const roles = new Set<AssetPartRole>();
  for (const part of asset.parts) {
    if (!LAYER_ROLES.includes(part.role)) {
      issues.push(`unknown layer role "${part.role}"`);
    }
    if (roles.has(part.role)) {
      issues.push(`duplicate layer role "${part.role}"`);
    }
    roles.add(part.role);
    if (part.svg.trim() === '') {
      issues.push(`layer "${part.role}" must contain an SVG fragment`);
    }
  }

  return issues;
}

export function getAssetDefinition(
  id: string,
  definitions: Readonly<Record<string, AssetDefinition>> = ASSET_DEFINITIONS,
): AssetDefinition {
  const asset = definitions[id];
  if (asset === undefined) {
    throw new AssetLoadError('unknown-asset', id, 'no definition is registered for this ID');
  }
  return asset;
}

export type AssetDecoder = (source: string) => Promise<CanvasImageSource>;

export type AssetCanvas = {
  readonly canvas: HTMLCanvasElement;
  readonly context: CanvasRenderingContext2D;
};

export type AssetCanvasFactory = (resolution: number) => AssetCanvas;

export type AssetLayerPipeline = {
  readonly decode: AssetDecoder;
  readonly createCanvas: AssetCanvasFactory;
};

class CanvasUnavailableError extends Error {
  constructor() {
    super('Canvas 2D context is unavailable');
    this.name = 'CanvasUnavailableError';
  }
}

function decodeSvg(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve(image);
    };
    image.onerror = () => {
      reject(new Error('SVG decode failed'));
    };
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
  });
}

function createBrowserCanvas(resolution: number): AssetCanvas {
  const canvas = document.createElement('canvas');
  canvas.width = resolution;
  canvas.height = resolution;
  const context = canvas.getContext('2d');
  if (context === null) {
    throw new CanvasUnavailableError();
  }
  return { canvas, context };
}

const DEFAULT_PIPELINE: AssetLayerPipeline = {
  decode: decodeSvg,
  createCanvas: createBrowserCanvas,
};

async function rasterizeLayer(
  source: string,
  resolution: number,
  pipeline: AssetLayerPipeline,
): Promise<HTMLCanvasElement> {
  const image = await pipeline.decode(source);
  const { canvas, context } = pipeline.createCanvas(resolution);
  context.drawImage(image, 0, 0, resolution, resolution);
  return canvas;
}

function toAssetLoadError(cause: unknown, assetId: string): AssetLoadError {
  if (cause instanceof AssetLoadError) {
    return cause;
  }
  if (cause instanceof CanvasUnavailableError) {
    return new AssetLoadError('canvas-unavailable', assetId, cause.message);
  }
  const detail = cause instanceof Error ? cause.message : 'unknown error';
  return new AssetLoadError('decode-failed', assetId, detail);
}

async function rasterizeAsset(
  id: string,
  asset: AssetDefinition,
  resolution: number,
  pipeline: AssetLayerPipeline,
): Promise<PreparedAssetLayer[]> {
  const layers: PreparedAssetLayer[] = [];

  for (const part of asset.parts) {
    const source = buildLayerSvg(asset, part, resolution);
    try {
      layers.push({
        role: part.role,
        canvas: await rasterizeLayer(source, resolution, pipeline),
      });
    } catch (cause) {
      throw toAssetLoadError(cause, id);
    }
  }

  return layers;
}

export async function prepareAssetLayers(
  asset: AssetDefinition,
  resolution: number = DEFAULT_RESOLUTION,
  pipeline: AssetLayerPipeline = DEFAULT_PIPELINE,
): Promise<PreparedAssetLayer[]> {
  return rasterizeAsset(asset.label, asset, resolution, pipeline);
}

export function drawAssetLayers(
  context: CanvasRenderingContext2D,
  layers: readonly PreparedAssetLayer[],
  x: number,
  y: number,
  size: number,
  angles: AssetLayerAngles = {},
): void {
  const bodyAngle = angles.bodyAngle ?? 0;
  const aimAngle = angles.aimAngle ?? bodyAngle;

  context.save();
  context.translate(x, y);

  for (const layer of layers) {
    const angle =
      layer.role === 'body'
        ? bodyAngle
        : layer.role === 'aim' || layer.role === 'loaded'
          ? aimAngle
          : 0;

    context.save();
    context.rotate((angle * Math.PI) / 180);
    context.drawImage(layer.canvas, -size / 2, -size / 2, size, size);
    context.restore();
  }

  context.restore();
}

export type AssetAdapterOptions = {
  readonly resolution?: number;
  readonly cacheLimit?: number;
  readonly onError?: (error: AssetLoadError) => void;
  readonly decode?: AssetDecoder;
  readonly createCanvas?: AssetCanvasFactory;
  readonly definitions?: Readonly<Record<string, AssetDefinition>>;
};

export type AssetPreloadReport = {
  readonly loaded: readonly string[];
  readonly failed: readonly AssetLoadError[];
};

export type AssetAdapter = {
  /** Rasterizes the asset once per ID and resolution. Concurrent calls share one decode. */
  prepare(id: string, resolution?: number): Promise<readonly PreparedAssetLayer[]>;
  /** Loads the given assets, collecting failures instead of rejecting the whole batch. */
  preload(ids?: readonly string[]): Promise<AssetPreloadReport>;
  /** Returns the prepared layers for a synchronous draw, or null when the fallback should run. */
  get(id: string, resolution?: number): readonly PreparedAssetLayer[] | null;
  /** Draws prepared layers and returns false when the caller must use procedural art. */
  draw(
    context: CanvasRenderingContext2D,
    id: string,
    x: number,
    y: number,
    size: number,
    angles?: AssetLayerAngles,
  ): boolean;
  cacheSize(): number;
  /** Drops cached and in-flight results so a new world never sees stale state. */
  reset(): void;
};

function requirePositiveInteger(value: number, name: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive number.`);
  }
  return Math.max(1, Math.round(value));
}

export function createAssetAdapter(options: AssetAdapterOptions = {}): AssetAdapter {
  const defaultResolution = requirePositiveInteger(
    options.resolution ?? DEFAULT_RESOLUTION,
    'resolution',
  );
  const cacheLimit = requirePositiveInteger(
    options.cacheLimit ?? DEFAULT_CACHE_LIMIT,
    'cacheLimit',
  );
  const definitions = options.definitions ?? ASSET_DEFINITIONS;
  const pipeline: AssetLayerPipeline = {
    decode: options.decode ?? DEFAULT_PIPELINE.decode,
    createCanvas: options.createCanvas ?? DEFAULT_PIPELINE.createCanvas,
  };
  const reportError =
    options.onError ??
    ((error: AssetLoadError): void => {
      console.error(error);
    });

  const cache = new Map<string, readonly PreparedAssetLayer[]>();
  const pending = new Map<string, Promise<readonly PreparedAssetLayer[]>>();
  let generation = 0;

  const remember = (key: string, layers: readonly PreparedAssetLayer[]): void => {
    cache.delete(key);
    cache.set(key, layers);
    while (cache.size > cacheLimit) {
      const oldest = cache.keys().next();
      if (oldest.done === true) {
        break;
      }
      cache.delete(oldest.value);
    }
  };

  const lookup = (key: string): readonly PreparedAssetLayer[] | null => {
    const layers = cache.get(key);
    if (layers === undefined) {
      return null;
    }
    // Refresh insertion order so the least recently used entry is evicted first.
    cache.delete(key);
    cache.set(key, layers);
    return layers;
  };

  const prepare = async (
    id: string,
    requestedResolution: number = defaultResolution,
  ): Promise<readonly PreparedAssetLayer[]> => {
    let resolution: number;
    try {
      resolution = requirePositiveInteger(requestedResolution, 'resolution');
    } catch (cause) {
      const error = new AssetLoadError(
        'invalid-resolution',
        id,
        cause instanceof Error ? cause.message : 'resolution is invalid',
      );
      reportError(error);
      throw error;
    }

    const key = `${id}@${String(resolution)}`;
    const ready = lookup(key);
    if (ready !== null) {
      return ready;
    }

    const inFlight = pending.get(key);
    if (inFlight !== undefined) {
      return inFlight;
    }

    const generationAtStart = generation;
    const job = (async (): Promise<readonly PreparedAssetLayer[]> => {
      try {
        const asset = getAssetDefinition(id, definitions);
        const issues = validateAssetDefinition(asset);
        if (issues.length > 0) {
          throw new AssetLoadError('invalid-asset', id, issues.join('; '));
        }
        return await rasterizeAsset(id, asset, resolution, pipeline);
      } catch (cause) {
        const error = toAssetLoadError(cause, id);
        if (generationAtStart === generation) {
          reportError(error);
        }
        throw error;
      }
    })();

    pending.set(key, job);
    void job.then(
      (layers) => {
        if (pending.get(key) === job) {
          pending.delete(key);
        }
        if (generationAtStart === generation) {
          remember(key, layers);
        }
      },
      () => {
        if (pending.get(key) === job) {
          pending.delete(key);
        }
      },
    );

    return job;
  };

  const get = (
    id: string,
    requestedResolution: number = defaultResolution,
  ): readonly PreparedAssetLayer[] | null => {
    const resolution = Math.max(1, Math.round(requestedResolution));
    return lookup(`${id}@${String(resolution)}`);
  };

  const draw = (
    context: CanvasRenderingContext2D,
    id: string,
    x: number,
    y: number,
    size: number,
    angles: AssetLayerAngles = {},
  ): boolean => {
    const layers = get(id);
    if (layers === null) {
      return false;
    }
    drawAssetLayers(context, layers, x, y, size, angles);
    return true;
  };

  const preload = async (
    ids: readonly string[] = Object.keys(definitions),
  ): Promise<AssetPreloadReport> => {
    const results = await Promise.allSettled(ids.map(async (id) => prepare(id)));
    const loaded: string[] = [];
    const failed: AssetLoadError[] = [];

    results.forEach((result, index) => {
      const id = ids[index];
      if (id === undefined) {
        return;
      }
      if (result.status === 'fulfilled') {
        loaded.push(id);
      } else if (result.reason instanceof AssetLoadError) {
        failed.push(result.reason);
      } else {
        failed.push(new AssetLoadError('decode-failed', id, 'unknown error'));
      }
    });

    return { loaded, failed };
  };

  return {
    prepare,
    preload,
    get,
    draw,
    cacheSize: () => cache.size,
    reset: () => {
      generation += 1;
      cache.clear();
      pending.clear();
    },
  };
}
