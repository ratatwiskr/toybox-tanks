export function computeCanvasSize(
  rectW: number,
  rectH: number,
  rawDpr: number,
  maxDpr = 2,
): { width: number; height: number; dpr: number } {
  const dpr = Number.isFinite(rawDpr) && rawDpr > 0 ? Math.min(rawDpr, maxDpr) : 1;
  return {
    width: Math.max(1, Math.round(rectW * dpr)),
    height: Math.max(1, Math.round(rectH * dpr)),
    dpr,
  };
}
