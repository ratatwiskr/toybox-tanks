/// <reference types="vite/client" />

import { decodeSvgImage } from './assets';

const raw = import.meta.glob<string>('/src/assets/svg/**/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
});

async function runSvgBuildSpike(): Promise<void> {
  const status = document.documentElement.dataset;
  status.svgBuildSpike = 'pending';

  try {
    const source = raw['/src/assets/svg/spike-58.svg'];
    if (typeof source !== 'string' || !source.includes('id="toybox-s3-probe"')) {
      throw new Error('Expected the probe SVG as raw text');
    }
    const image = await decodeSvgImage(source);
    if (image.naturalWidth !== 16 || image.naturalHeight !== 16) {
      throw new Error('Expected a decoded 16 × 16 SVG');
    }
    status.svgBuildSpike = 'pass';
  } catch (cause) {
    status.svgBuildSpikeDetail = cause instanceof Error ? cause.message : String(cause);
    status.svgBuildSpike = 'fail';
  }
}

void runSvgBuildSpike();
