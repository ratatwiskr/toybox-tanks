import { describe, expect, it } from 'vitest';

import { ASSET_MANIFEST } from '../../src/render/asset-manifest';
import {
  buildSvgFailureWarning,
  createSvgAssetAdapter,
  validateSvg,
} from '../../src/render/svg-loader';

const TANK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">' +
  '<defs><linearGradient id="paint"><stop stop-color="#fff"/></linearGradient></defs>' +
  '<g id="hull"><rect x="10" y="10" width="100" height="100" fill="url(#paint)"/></g>' +
  '<g id="turret"><circle cx="64" cy="64" r="20"/></g>' +
  '<g id="windup-key"><path d="M100 64h20"/></g>' +
  '</svg>';

const WALL_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">' +
  '<rect width="128" height="128" fill="#846247"/>' +
  '</svg>';

const WALL_ASSET = {
  id: 'wall',
  file: 'wall.svg',
  kind: 'tile',
  sizeTiles: 1,
} as const;

describe('svg loader', () => {
  it('keeps the manifest data-driven and sized from presentation rules', () => {
    expect(Object.keys(ASSET_MANIFEST)).toContain('tank-p1');
    expect(Object.keys(ASSET_MANIFEST)).toContain('fx-explosion');

    for (const [id, definition] of Object.entries(ASSET_MANIFEST)) {
      expect(definition.id, id).toBe(id);
      expect(definition.file, id).toMatch(/\.svg$/);
      expect(definition.sizeTiles, id).toBeGreaterThan(0);
    }
  });

  it('accepts a valid sample SVG', () => {
    expect(validateSvg(TANK_SVG)).toEqual([]);
    expect(validateSvg(WALL_SVG)).toEqual([]);
  });

  it('rejects each forbidden construct', () => {
    expect(validateSvg('<svg><script>alert(1)</script></svg>')).toContain(
      'script elements are not allowed',
    );
    expect(validateSvg('<svg><foreignObject/></svg>')).toContain(
      'foreignObject elements are not allowed',
    );
    expect(validateSvg('<svg><image href="https://example.test/a.png"/></svg>')).toContain(
      'external href is not allowed: https://example.test/a.png',
    );
    expect(
      validateSvg(
        '<svg xmlns:xlink="http://www.w3.org/1999/xlink"><image xlink:href="data:image/png;base64,AA"/></svg>',
      ),
    ).toContain('external href is not allowed: data:image/png;base64,AA');
    expect(validateSvg('<svg onload="boom()"/>')).toContain(
      'event handler attributes are not allowed',
    );
    expect(validateSvg(WALL_SVG.replace('<rect', '<rect onClick="boom()"'))).toContain(
      'event handler attributes are not allowed',
    );
  });

  it('allows local fragment references', () => {
    expect(validateSvg('<svg><use href="#shape"/><use xlink:href="#other"/></svg>')).toEqual([]);
  });

  it('decodes a non-tank asset once and reuses the cached result', async () => {
    const image = {} as unknown as CanvasImageSource;
    const decoded: string[] = [];
    const adapter = createSvgAssetAdapter({
      sources: { '/src/assets/svg/wall.svg': WALL_SVG },
      manifest: { wall: WALL_ASSET },
      decode: (source) => {
        decoded.push(source);
        return Promise.resolve(image);
      },
    });

    const first = await adapter.prepare('wall');
    const second = await adapter.prepare('wall');

    expect(first).toEqual({ full: image });
    expect(second).toBe(first);
    expect(decoded).toEqual([WALL_SVG]);
    expect(adapter.get('wall')).toBe(first);
  });

  it('returns a fallback report for a missing SVG file instead of throwing', async () => {
    let decodeCalls = 0;
    const adapter = createSvgAssetAdapter({
      sources: {},
      manifest: { wall: WALL_ASSET },
      decode: () => {
        decodeCalls += 1;
        return Promise.resolve({} as unknown as CanvasImageSource);
      },
    });

    const report = await adapter.preload();

    expect(report.loaded).toEqual([]);
    expect(report.failed).toHaveLength(1);
    expect(report.failed[0]).toMatchObject({ code: 'missing-source', assetId: 'wall' });
    expect(report.warning).toBe('Artwork unavailable for wall — procedural drawing will be used.');
    expect(decodeCalls).toBe(0);
    expect(adapter.get('wall')).toBeNull();
  });

  it('keeps decode failures isolated and reports one warning for the batch', async () => {
    const adapter = createSvgAssetAdapter({
      sources: { '/src/assets/svg/wall.svg': WALL_SVG },
      manifest: {
        wall: WALL_ASSET,
        missing: { id: 'missing', file: 'missing.svg', kind: 'sprite', sizeTiles: 1 },
      },
      decode: () => Promise.reject(new Error('decode boom')),
    });

    const report = await adapter.preload();

    expect(report.loaded).toEqual([]);
    expect(report.failed.map((error) => error.assetId).sort()).toEqual(['missing', 'wall']);
    expect(report.failed.every((error) => error instanceof Error)).toBe(true);
    expect(report.warning).toBe(
      'Artwork unavailable for wall, missing — procedural drawing will be used.',
    );
    expect(adapter.get('wall')).toBeNull();
  });

  it('does not warn when every asset loads', async () => {
    const image = {} as unknown as CanvasImageSource;
    const adapter = createSvgAssetAdapter({
      sources: { '/src/assets/svg/wall.svg': WALL_SVG },
      manifest: { wall: WALL_ASSET },
      decode: () => Promise.resolve(image),
    });

    const report = await adapter.preload(['wall']);

    expect(report.loaded).toEqual(['wall']);
    expect(report.failed).toEqual([]);
    expect(report.warning).toBeNull();
    expect(buildSvgFailureWarning([])).toBeNull();
  });

  it('drops cached results on reset', async () => {
    const image = {} as unknown as CanvasImageSource;
    let decodeCalls = 0;
    const adapter = createSvgAssetAdapter({
      sources: { '/src/assets/svg/wall.svg': WALL_SVG },
      manifest: { wall: WALL_ASSET },
      decode: () => {
        decodeCalls += 1;
        return Promise.resolve(image);
      },
    });

    await adapter.prepare('wall');
    adapter.reset();

    expect(adapter.get('wall')).toBeNull();
    await adapter.prepare('wall');
    expect(decodeCalls).toBe(2);
  });
});
