import { MUSIC_URL, SOUND_IDS, SOUND_URLS } from './assets';
import type { SoundId } from './events';
import type { Levels, Playback } from './session';

const MAX_VOICES = 16;

export function createBrowserPlayback(): Playback {
  let context: AudioContext | null = null;
  let gain: GainNode | null = null;
  let loading: Promise<void> | null = null;
  let disposed = false;
  let wantedMusic = false;
  let musicPending = false;
  let levels: Levels = { muted: false, music: 0.2, effects: 0.7 };
  const buffers = new Map<SoundId, AudioBuffer>();
  const voices = new Set<AudioBufferSourceNode>();
  const warnings = new Set<string>();
  const music = new Audio(MUSIC_URL);
  music.loop = true;
  music.preload = 'none';
  music.volume = levels.music;
  const abort = new AbortController();

  function isActive(active: AudioContext): boolean {
    return !disposed && active.state === 'running';
  }

  function warn(key: string, error: unknown): void {
    if (disposed || warnings.has(key)) return;
    warnings.add(key);
    console.warn(`[Toybox audio] ${key}`, error);
  }

  function removeVoice(source: AudioBufferSourceNode): void {
    voices.delete(source);
    source.onended = null;
    source.disconnect();
  }

  function stopVoice(source: AudioBufferSourceNode): void {
    source.onended = null;
    try {
      source.stop();
    } catch (error) {
      warn('stop effect', error);
    }
    removeVoice(source);
  }

  function stopEffects(): void {
    for (const source of [...voices]) stopVoice(source);
  }

  function playMusic(): void {
    if (disposed || !wantedMusic || levels.muted || musicPending || !music.paused) return;
    musicPending = true;
    void music
      .play()
      .then(() => {
        if (disposed || !wantedMusic || levels.muted) music.pause();
      })
      .catch((error: unknown) => {
        warn('music playback rejected; use Enable audio to retry', error);
      })
      .finally(() => {
        musicPending = false;
      });
  }

  music.addEventListener('error', () => {
    warn('music asset failed', music.error);
  });

  return {
    async unlock(): Promise<boolean> {
      if (disposed) return false;
      try {
        context ??= new AudioContext();
        const active = context;
        if (gain === null) {
          gain = active.createGain();
          gain.gain.value = levels.muted ? 0 : levels.effects;
          gain.connect(active.destination);
        }
        await active.resume();
        if (!isActive(active)) return false;
        loading ??= Promise.all(
          SOUND_IDS.map(async (id) => {
            const url = SOUND_URLS[id];
            try {
              const response = await fetch(url, { signal: abort.signal });
              if (!response.ok) throw new Error(`HTTP ${String(response.status)}: ${url}`);
              const buffer = await active.decodeAudioData(await response.arrayBuffer());
              if (!disposed) {
                buffers.set(id, buffer);
              }
            } catch (error) {
              warn(`effect asset failed: ${id}`, error);
            }
          }),
        ).then(() => undefined);
        await loading;
        if (!isActive(active)) return false;
        playMusic();
        return true;
      } catch (error) {
        warn('audio activation failed; use Enable audio to retry', error);
        return false;
      }
    },
    effect(id): void {
      const buffer = buffers.get(id);
      if (
        disposed ||
        levels.muted ||
        context?.state !== 'running' ||
        gain === null ||
        buffer === undefined
      )
        return;
      if (voices.size >= MAX_VOICES) {
        const oldest = voices.values().next().value;
        if (oldest !== undefined) stopVoice(oldest);
      }
      try {
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(gain);
        source.onended = () => {
          removeVoice(source);
        };
        voices.add(source);
        try {
          source.start();
        } catch (error) {
          removeVoice(source);
          throw error;
        }
      } catch (error) {
        warn(`effect playback failed: ${id}`, error);
      }
    },
    music(action): void {
      wantedMusic = action === 'play';
      if (wantedMusic) {
        playMusic();
        return;
      }
      music.pause();
      if (action === 'stop') music.currentTime = 0;
    },
    stopEffects,
    levels(next): void {
      levels = next;
      music.muted = next.muted;
      music.volume = next.music;
      if (gain !== null) gain.gain.value = next.muted ? 0 : next.effects;
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      wantedMusic = false;
      abort.abort();
      stopEffects();
      music.pause();
      music.removeAttribute('src');
      music.load();
      gain?.disconnect();
      buffers.clear();
      if (context !== null) void context.close().catch(() => undefined);
    },
  };
}
