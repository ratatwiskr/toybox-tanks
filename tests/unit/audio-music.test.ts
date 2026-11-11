import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBrowserPlayback } from '../../src/audio/browser';
import { createAudioSession, type Playback } from '../../src/audio/session';

function deferred() {
  let finish: () => void = () => undefined;
  const promise = new Promise<void>((resolve) => {
    finish = () => {
      resolve();
    };
  });
  return { promise, finish };
}

function sessionFixture() {
  const activation = deferred();
  const playback = {
    unlock: vi.fn(() => activation.promise.then(() => true)),
    effect: vi.fn(),
    music: vi.fn(),
    stopEffects: vi.fn(),
    levels: vi.fn(),
    dispose: vi.fn(),
  } satisfies Playback;
  return { activation, playback, session: createAudioSession(playback) };
}

function browserFixture() {
  const resume = deferred();
  const media = {
    loop: false,
    preload: '',
    volume: 1,
    muted: false,
    paused: true,
    currentTime: 0,
    error: null,
    addEventListener: vi.fn(),
    removeAttribute: vi.fn(),
    load: vi.fn(),
    play: vi.fn<() => Promise<void>>(),
    pause: vi.fn(),
  };
  media.play.mockImplementation(() => {
    media.paused = false;
    return Promise.resolve();
  });
  media.pause.mockImplementation(() => {
    media.paused = true;
  });
  const context = {
    state: 'running',
    destination: {},
    createGain: vi.fn(() => ({
      gain: { value: 0 },
      connect: vi.fn(),
      disconnect: vi.fn(),
    })),
    resume: vi.fn(() => resume.promise),
    close: vi.fn(() => Promise.resolve()),
    decodeAudioData: vi.fn((data: ArrayBuffer) => Promise.resolve({ length: data.byteLength })),
  };
  vi.stubGlobal('Audio', function AudioStub() {
    return media;
  });
  vi.stubGlobal('AudioContext', function AudioContextStub() {
    return context;
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      }),
    ),
  );
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  return { resume, media, context, warning, playback: createBrowserPlayback() };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('music and effect activation are independent', () => {
  it('requests music synchronously on entering gameplay before effects are ready', async () => {
    const { activation, playback, session } = sessionFixture();
    session.setState('playing');
    expect(playback.music).toHaveBeenLastCalledWith('play');
    expect(playback.unlock).not.toHaveBeenCalled();
    const unlocking = session.unlock();
    session.consume([{ type: 'shot', faction: 'player' }]);
    expect(playback.effect).not.toHaveBeenCalled();
    activation.finish();
    expect(await unlocking).toBe(true);
    expect(playback.music.mock.calls).toEqual([['play']]);
    session.consume([{ type: 'shot', faction: 'player' }]);
    expect(playback.effect).toHaveBeenCalledWith('playerFire');
    session.dispose();
  });

  it('does not start music from a late effect-unlock completion after pause', async () => {
    const { activation, playback, session } = sessionFixture();
    session.setState('playing');
    const unlocking = session.unlock();
    session.setState('paused');
    activation.finish();
    await unlocking;
    expect(playback.music.mock.calls).toEqual([['play'], ['pause']]);
    session.dispose();
  });

  it('keeps muted activation silent and starts music on an explicit unmute', async () => {
    const { activation, playback, session } = sessionFixture();
    session.setLevels({ muted: true, music: 0.2, effects: 0.7 });
    session.setState('playing');
    const unlocking = session.unlock();
    activation.finish();
    await unlocking;
    expect(playback.music.mock.calls.some(([action]) => action === 'play')).toBe(false);
    session.setLevels({ muted: false, music: 0.2, effects: 0.7 });
    expect(playback.music).toHaveBeenLastCalledWith('play');
    session.dispose();
  });

  it('retries rejected media immediately, before awaiting AudioContext resume', async () => {
    const { playback, media, resume, warning } = browserFixture();
    media.play.mockRejectedValueOnce(new DOMException('Blocked', 'NotAllowedError'));
    playback.music('play');
    await vi.waitFor(() => {
      expect(warning).toHaveBeenCalledTimes(1);
    });
    await Promise.resolve();
    const unlocking = playback.unlock();
    expect(media.play).toHaveBeenCalledTimes(2);
    expect(media.paused).toBe(false);
    resume.finish();
    expect(await unlocking).toBe(true);
    playback.music('play');
    expect(media.play).toHaveBeenCalledTimes(2);
    playback.dispose();
  });

  it('does not start menu music merely because effects were unlocked', async () => {
    const { playback, media, resume } = browserFixture();
    const unlocking = playback.unlock();
    expect(media.play).not.toHaveBeenCalled();
    resume.finish();
    expect(await unlocking).toBe(true);
    expect(media.play).not.toHaveBeenCalled();
    playback.dispose();
  });

  it('keeps a successful music start independent of an effects activation failure', async () => {
    const { playback, media, context } = browserFixture();
    context.resume.mockRejectedValueOnce(new Error('Effects unavailable'));
    playback.music('play');
    expect(await playback.unlock()).toBe(false);
    expect(media.play).toHaveBeenCalledTimes(1);
    expect(media.paused).toBe(false);
    playback.dispose();
  });
});