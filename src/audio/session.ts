import type { GameState, SimulationEvent } from '../sim/types';
import { soundForEvent, type SoundId } from './events';

export interface Levels {
  readonly muted: boolean;
  readonly music: number;
  readonly effects: number;
}

export interface Playback {
  unlock(): Promise<boolean>;
  effect(id: SoundId): void;
  music(action: 'play' | 'pause' | 'stop'): void;
  stopEffects(): void;
  levels(value: Levels): void;
  dispose(): void;
}

export function createAudioSession(playback: Playback) {
  let state: GameState = 'menu';
  let ready = false;
  let disposed = false;
  let levels: Levels = { muted: false, music: 0.2, effects: 0.7 };
  playback.levels(levels);

  function isDisposed(): boolean {
    return disposed;
  }

  function syncMusic(): void {
    // Media-element music permission is independent of Web Audio SFX readiness.
    playback.music(
      state === 'playing'
        ? levels.muted
          ? 'pause'
          : 'play'
        : state === 'paused'
          ? 'pause'
          : 'stop',
    );
  }

  function setState(next: GameState): void {
    if (disposed || next === state) return;
    state = next;
    if (next === 'menu' || next === 'paused' || next === 'error') playback.stopEffects();
    syncMusic();
  }

  return {
    async unlock(): Promise<boolean> {
      if (disposed) return false;
      try {
        ready = await playback.unlock();
      } catch {
        ready = false;
      }
      if (isDisposed()) return false;
      return ready;
    },
    setState,
    consume(events: readonly SimulationEvent[]): void {
      if (disposed) return;
      for (const event of events) {
        if (event.type === 'outcome') setState(event.state);
        const id = soundForEvent(event);
        if (ready && !levels.muted && id !== null) playback.effect(id);
      }
    },
    reset(): void {
      if (disposed) return;
      playback.stopEffects();
      playback.music('stop');
      state = 'menu';
    },
    setLevels(next: Levels): void {
      if (disposed) return;
      levels = {
        muted: next.muted,
        music: Number.isFinite(next.music) ? Math.max(0, Math.min(1, next.music)) : 0,
        effects: Number.isFinite(next.effects) ? Math.max(0, Math.min(1, next.effects)) : 0,
      };
      if (levels.muted) playback.stopEffects();
      playback.levels(levels);
      syncMusic();
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      playback.dispose();
    },
  };
}

export type AudioSession = ReturnType<typeof createAudioSession>;
