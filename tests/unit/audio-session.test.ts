import { describe, expect, it, vi } from 'vitest';
import { createAudioSession, type Playback } from '../../src/audio/session';
import { soundForEvent } from '../../src/audio/events';
import type { SimulationEvent } from '../../src/sim/types';

function setup(allowed = true) {
  const playback = {
    unlock: vi.fn(() => Promise.resolve(allowed)),
    effect: vi.fn(),
    music: vi.fn(),
    stopEffects: vi.fn(),
    levels: vi.fn(),
    dispose: vi.fn(),
  } satisfies Playback;
  return { playback, audio: createAudioSession(playback) };
}

describe('audio session', () => {
  it('maps lethal damage to one destruction cue and defeat to silence', () => {
    expect(soundForEvent({ type: 'damage', faction: 'player', destroyed: true })).toBe(
      'playerDisabled',
    );
    expect(soundForEvent({ type: 'damage', faction: 'enemy', destroyed: true })).toBe(
      'enemyDestroyed',
    );
    expect(soundForEvent({ type: 'outcome', state: 'defeat' })).toBeNull();
    expect(soundForEvent({ type: 'outcome', state: 'completed' })).toBe('gameComplete');
  });

  it('drops cues before activation rather than replaying them', async () => {
    const { audio, playback } = setup();
    const batch: SimulationEvent[] = [{ type: 'shot', faction: 'player' }];
    audio.consume(batch);
    expect(playback.effect).not.toHaveBeenCalled();
    await audio.unlock();
    expect(playback.effect).not.toHaveBeenCalled();
    audio.consume(batch);
    audio.consume([{ type: 'shot', faction: 'enemy' }]);
    expect(playback.effect.mock.calls).toEqual([['playerFire'], ['enemyFire']]);
  });

  it('stays playable when activation is blocked or rejects', async () => {
    const { audio, playback } = setup(false);
    audio.setState('playing');
    expect(await audio.unlock()).toBe(false);
    audio.consume([{ type: 'shot', faction: 'player' }]);
    expect(playback.effect).not.toHaveBeenCalled();
    playback.unlock.mockRejectedValueOnce(new Error('blocked'));
    expect(await audio.unlock()).toBe(false);
  });

  it('does not start delayed music if the game paused while unlocking', async () => {
    const { audio, playback } = setup();
    audio.setState('playing');
    const activation = audio.unlock();
    audio.setState('paused');
    await activation;
    expect(playback.music).toHaveBeenLastCalledWith('pause');
  });

  it('pauses, clears voices, resumes, and resets without an extra outcome cue', async () => {
    const { audio, playback } = setup();
    await audio.unlock();
    audio.setState('playing');
    expect(playback.music).toHaveBeenLastCalledWith('play');
    audio.setState('paused');
    expect(playback.stopEffects).toHaveBeenCalledTimes(1);
    expect(playback.music).toHaveBeenLastCalledWith('pause');
    audio.setState('playing');
    audio.consume([{ type: 'outcome', state: 'completed' }]);
    audio.setState('completed');
    expect(playback.effect.mock.calls).toEqual([['gameComplete']]);
    expect(playback.music).toHaveBeenLastCalledWith('stop');
    audio.reset();
    audio.setState('playing');
    expect(playback.stopEffects).toHaveBeenCalledTimes(2);
    expect(playback.music).toHaveBeenLastCalledWith('play');
  });

  it('applies/clamps volumes, silences muted cues, and preserves settings on reset', async () => {
    const { audio, playback } = setup();
    await audio.unlock();
    audio.setLevels({ muted: true, music: 2, effects: -1 });
    expect(playback.levels).toHaveBeenLastCalledWith({ muted: true, music: 1, effects: 0 });
    audio.consume([{ type: 'shot', faction: 'player' }]);
    audio.reset();
    audio.setState('playing');
    expect(playback.effect).not.toHaveBeenCalled();
    expect(playback.music).toHaveBeenLastCalledWith('pause');
    audio.setLevels({ muted: false, music: 0.2, effects: 0.7 });
    expect(playback.music).toHaveBeenLastCalledWith('play');
  });

  it('disposes once and does not resurrect a delayed activation', async () => {
    const { audio, playback } = setup();
    audio.setState('playing');
    const activation = audio.unlock();
    audio.dispose();
    audio.dispose();
    playback.music.mockClear();
    expect(await activation).toBe(false);
    audio.setState('playing');
    audio.reset();
    audio.consume([{ type: 'shot', faction: 'player' }]);
    expect(playback.dispose).toHaveBeenCalledTimes(1);
    expect(playback.music).not.toHaveBeenCalled();
    expect(playback.effect).not.toHaveBeenCalled();
  });
});