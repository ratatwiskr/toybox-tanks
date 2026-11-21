import type { Playback } from './session';

/** Build-time replacement for browser playback; imports no audio assets. */
export function createBrowserPlayback(): Playback {
  return {
    unlock: () => Promise.resolve(false),
    effect: () => undefined,
    music: () => undefined,
    stopEffects: () => undefined,
    levels: () => undefined,
    dispose: () => undefined,
  };
}
