import { AssetLoadError, decodeSvgImage } from './assets';
import type { FloorDefinition } from './floor-data';

const SVG_NS = 'http://www.w3.org/2000/svg';

export type FloorDecoder = (source: string) => Promise<CanvasImageSource>;

export function validateFloorDefinition(floor: FloorDefinition): string[] {
  const issues: string[] = [];
  if (floor.id.trim() === '') {
    issues.push('id must not be empty');
  }
  if (!Number.isFinite(floor.tileSize) || floor.tileSize <= 0) {
    issues.push('tileSize must be a positive number');
  }
  if (floor.svg.trim() === '') {
    issues.push('svg must contain a tile fragment');
  }
  return issues;
}

export function buildFloorSvg(floor: FloorDefinition): string {
  const size = floor.tileSize;
  return (
    `<svg xmlns="${SVG_NS}" width="${String(size)}" height="${String(size)}" ` +
    `viewBox="0 0 ${String(size)} ${String(size)}">${floor.svg}</svg>`
  );
}

/**
 * Decodes the floor tile once. The caller turns it into a repeating pattern on
 * the renderer's own 2D context, so the pattern origin stays at world 0,0.
 */
export async function prepareFloorImage(
  floor: FloorDefinition,
  decode: FloorDecoder = decodeSvgImage,
): Promise<CanvasImageSource> {
  const issues = validateFloorDefinition(floor);
  if (issues.length > 0) {
    throw new AssetLoadError('invalid-asset', floor.id, issues.join('; '));
  }

  try {
    return await decode(buildFloorSvg(floor));
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : 'unknown error';
    throw new AssetLoadError('decode-failed', floor.id, detail);
  }
}
