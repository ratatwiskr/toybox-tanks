const MAX_DPR = 2;

export function computeCanvasSize(rectW: number, rectH: number, rawDpr: number) {
  const dpr = Number.isFinite(rawDpr) && rawDpr > 0 ? Math.min(rawDpr, MAX_DPR) : 1;
  return {
    width: Math.max(1, Math.round(rectW * dpr)),
    height: Math.max(1, Math.round(rectH * dpr)),
    dpr,
  };
}
