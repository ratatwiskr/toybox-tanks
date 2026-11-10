import type {
  AssetDefinition,
  AssetPart,
  AssetPartRole,
} from './asset-data';

export type PreparedAssetLayer = {
  role: AssetPartRole;
  canvas: HTMLCanvasElement;
};

export type AssetLayerAngles = {
  bodyAngle?: number;
  aimAngle?: number;
};

const SVG_NS = 'http://www.w3.org/2000/svg';
const DEFAULT_RESOLUTION = 256;

export function buildLayerSvg(
  asset: AssetDefinition,
  part: AssetPart,
  resolution: number = DEFAULT_RESOLUTION,
): string {
  const [x, y, width, height] = asset.viewBox;
  return (
    `<svg xmlns="${SVG_NS}" width="${resolution}" height="${resolution}" ` +
    `viewBox="${x} ${y} ${width} ${height}">${part.svg}</svg>`
  );
}

function decodeSvg(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('SVG decode failed'));
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
  });
}

async function rasterizeLayer(
  source: string,
  resolution: number,
): Promise<HTMLCanvasElement> {
  const image = await decodeSvg(source);
  const canvas = document.createElement('canvas');
  canvas.width = resolution;
  canvas.height = resolution;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D context is unavailable.');
  }
  context.drawImage(image, 0, 0, resolution, resolution);
  return canvas;
}

export async function prepareAssetLayers(
  asset: AssetDefinition,
  resolution: number = DEFAULT_RESOLUTION,
): Promise<PreparedAssetLayer[]> {
  return Promise.all(
    asset.parts.map(async (part) => ({
      role: part.role,
      canvas: await rasterizeLayer(
        buildLayerSvg(asset, part, resolution),
        resolution,
      ),
    })),
  );
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
