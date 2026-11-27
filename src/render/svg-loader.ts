/// <reference types="vite/client" />

import { ASSET_MANIFEST, type AssetDef } from './asset-manifest';
import { AssetLoadError, decodeSvgImage } from './assets';

const SVG_DIR = '/src/assets/svg/';

// Eager raw imports keep every checked-in SVG inside the hosted and single-file
// bundles; there is no runtime fetch and no external resource.
const RAW_SVG_SOURCES = import.meta.glob<string>('/src/assets/svg/**/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
});

export type SvgSourceMap = Readonly<Record<string, string>>;
export type SvgDecoder = (source: string) => Promise<CanvasImageSource>;

export type SplitSvgLayers = {
  readonly hull: CanvasImageSource;
  readonly turret: CanvasImageSource | null;
  readonly key: CanvasImageSource | null;
};

export type SingleSvgLayers = {
  readonly full: CanvasImageSource;
};

export type PreparedSvgLayers = SplitSvgLayers | SingleSvgLayers;

export type SvgLoaderOptions = {
  readonly sources?: SvgSourceMap;
  readonly decode?: SvgDecoder;
  readonly manifest?: Readonly<Record<string, AssetDef>>;
};

export type SvgLoadReport = {
  readonly loaded: readonly string[];
  readonly failed: readonly AssetLoadError[];
  readonly warning: string | null;
};

export type SvgAssetAdapter = {
  prepare(id: string): Promise<PreparedSvgLayers>;
  get(id: string): PreparedSvgLayers | null;
  preload(ids?: readonly string[]): Promise<SvgLoadReport>;
  reset(): void;
};

const SCRIPT_ELEMENT = /<script\b/i;
const FOREIGN_OBJECT = /<foreignObject\b/i;
const HREF_ATTRIBUTE = /(?:\s|^)(?:xlink:)?href\s*=\s*(["'])(.*?)\1/gis;
const EVENT_HANDLER_ATTRIBUTE = /\son[a-z]+\s*=/i;

/** Returns string-level problems that would make an SVG unsafe to decode. */
export function validateSvg(src: string): string[] {
  const issues: string[] = [];

  if (src.trim() === '') {
    issues.push('svg source must not be empty');
  }
  if (SCRIPT_ELEMENT.test(src)) {
    issues.push('script elements are not allowed');
  }
  if (FOREIGN_OBJECT.test(src)) {
    issues.push('foreignObject elements are not allowed');
  }
  for (const match of src.matchAll(HREF_ATTRIBUTE)) {
    const value = match[2] ?? '';
    if (!value.trimStart().startsWith('#')) {
      issues.push(`external href is not allowed: ${value}`);
    }
  }
  if (EVENT_HANDLER_ATTRIBUTE.test(src)) {
    issues.push('event handler attributes are not allowed');
  }

  return issues;
}

function directLayer(root: Element, id: string): Element | null {
  for (const child of Array.from(root.children)) {
    if (child.id === id) {
      return child;
    }
  }
  return null;
}

/**
 * Splits a tank into independently drawable layers. Only direct children of
 * the root qualify; `<defs>` is kept in every layer so shared painting still
 * resolves after decoding.
 */
export function splitTank(src: string): {
  hull: string;
  turret: string | null;
  key: string | null;
} {
  const doc = new DOMParser().parseFromString(src, 'image/svg+xml');
  if (
    doc.querySelector('parsererror') !== null ||
    doc.documentElement.tagName.toLowerCase() !== 'svg'
  ) {
    throw new Error('invalid svg');
  }

  const root = doc.documentElement;
  const serializer = new XMLSerializer();

  const hull = root.cloneNode(true) as Element;
  for (const child of Array.from(hull.children)) {
    if (child.id === 'turret' || child.id === 'windup-key') {
      child.remove();
    }
  }

  const only = (id: string): string | null => {
    if (directLayer(root, id) === null) {
      return null;
    }
    const copy = root.cloneNode(true) as Element;
    for (const child of Array.from(copy.children)) {
      if (child.id !== id && child.tagName.toLowerCase() !== 'defs') {
        child.remove();
      }
    }
    return serializer.serializeToString(copy);
  };

  return {
    hull: serializer.serializeToString(hull),
    turret: only('turret'),
    key: only('windup-key'),
  };
}

export function isSplitSvgLayers(layers: PreparedSvgLayers): layers is SplitSvgLayers {
  return 'hull' in layers;
}

export function buildSvgFailureWarning(failed: readonly AssetLoadError[]): string | null {
  if (failed.length === 0) {
    return null;
  }
  const ids = [...new Set(failed.map((error) => error.assetId))];
  return `Artwork unavailable for ${ids.join(', ')} — procedural drawing will be used.`;
}

function resolveSource(file: string, sources: SvgSourceMap): string | undefined {
  const normalized = file.replace(/^\/+/, '');
  return sources[`${SVG_DIR}${normalized}`] ?? sources[file];
}

function detailOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'unknown error';
}

export function createSvgAssetAdapter(options: SvgLoaderOptions = {}): SvgAssetAdapter {
  const sources: SvgSourceMap = options.sources ?? RAW_SVG_SOURCES;
  const decode: SvgDecoder = options.decode ?? decodeSvgImage;
  const manifest: Readonly<Record<string, AssetDef>> = options.manifest ?? ASSET_MANIFEST;
  const cache = new Map<string, PreparedSvgLayers>();
  const pending = new Map<string, Promise<PreparedSvgLayers>>();
  let generation = 0;

  const prepare = async (id: string): Promise<PreparedSvgLayers> => {
    const cached = cache.get(id);
    if (cached !== undefined) {
      return cached;
    }
    const inFlight = pending.get(id);
    if (inFlight !== undefined) {
      return inFlight;
    }

    const generationAtStart = generation;
    const job = (async (): Promise<PreparedSvgLayers> => {
      const definition = manifest[id];
      if (definition === undefined) {
        throw new AssetLoadError('unknown-asset', id, 'no manifest entry is registered');
      }

      const source = resolveSource(definition.file, sources);
      if (source === undefined) {
        throw new AssetLoadError(
          'missing-source',
          id,
          `no bundled SVG is available for ${definition.file}`,
        );
      }

      const problems = validateSvg(source);
      if (problems.length > 0) {
        throw new AssetLoadError('invalid-asset', id, problems.join('; '));
      }

      let split: ReturnType<typeof splitTank> | null = null;
      if (definition.kind === 'tank') {
        try {
          split = splitTank(source);
        } catch (cause) {
          throw new AssetLoadError('invalid-asset', id, detailOf(cause));
        }
      }

      try {
        if (split !== null) {
          return {
            hull: await decode(split.hull),
            turret: split.turret === null ? null : await decode(split.turret),
            key: split.key === null ? null : await decode(split.key),
          };
        }
        return { full: await decode(source) };
      } catch (cause) {
        throw new AssetLoadError('decode-failed', id, detailOf(cause));
      }
    })();

    pending.set(id, job);
    try {
      const layers = await job;
      if (generationAtStart === generation) {
        cache.set(id, layers);
      }
      return layers;
    } finally {
      if (pending.get(id) === job) {
        pending.delete(id);
      }
    }
  };

  const preload = async (
    ids: readonly string[] = Object.keys(manifest),
  ): Promise<SvgLoadReport> => {
    const results = await Promise.allSettled(ids.map((id) => prepare(id)));
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
        failed.push(new AssetLoadError('decode-failed', id, detailOf(result.reason)));
      }
    });

    return { loaded, failed, warning: buildSvgFailureWarning(failed) };
  };

  return {
    prepare,
    get: (id) => cache.get(id) ?? null,
    preload,
    reset: () => {
      generation += 1;
      cache.clear();
      pending.clear();
    },
  };
}

export const svgAssets = createSvgAssetAdapter();

export function preloadSvgAssets(ids?: readonly string[]): Promise<SvgLoadReport> {
  return svgAssets.preload(ids);
}
