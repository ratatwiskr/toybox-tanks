import type { Command } from '../sim/types';

type KeySet = {
  readonly left: string;
  readonly right: string;
  readonly up: string;
  readonly down: string;
  readonly ccw: string;
  readonly cw: string;
  readonly fire: string;
};

export interface KeyboardCallbacks {
  isFocused(): boolean;
  isPlaying(): boolean;
  onPause(): void;
  onRetry(): void;
  onDebug(): void;
}

const KEYSETS: readonly KeySet[] = [
  {
    left: 'KeyA',
    right: 'KeyD',
    up: 'KeyW',
    down: 'KeyS',
    ccw: 'KeyQ',
    cw: 'KeyE',
    fire: 'KeyF',
  },
  {
    left: 'ArrowLeft',
    right: 'ArrowRight',
    up: 'ArrowUp',
    down: 'ArrowDown',
    ccw: 'Comma',
    cw: 'Period',
    fire: 'Enter',
  },
];

const CONTROL_KEYS = new Set<string>([
  ...KEYSETS.flatMap((keys) => Object.values(keys)),
  'Escape',
  'KeyR',
  'Backquote',
]);

function isButtonTarget(event: KeyboardEvent): boolean {
  return event.target instanceof HTMLElement && event.target.tagName === 'BUTTON';
}

export class KeyboardAdapter {
  readonly held = new Set<string>();

  clear(): void {
    this.held.clear();
  }

  readCommand(index: number): Command {
    const keys = KEYSETS[index];
    if (keys === undefined) {
      return { x: 0, y: 0, turn: 0, fire: false };
    }

    return {
      x: Number(this.held.has(keys.right)) - Number(this.held.has(keys.left)),
      y: Number(this.held.has(keys.down)) - Number(this.held.has(keys.up)),
      turn: Number(this.held.has(keys.cw)) - Number(this.held.has(keys.ccw)),
      fire: this.held.has(keys.fire),
    };
  }

  attach(callbacks: KeyboardCallbacks): () => void {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!callbacks.isFocused() || !CONTROL_KEYS.has(event.code)) {
        return;
      }

      if (isButtonTarget(event) && event.code === 'Enter' && !callbacks.isPlaying()) {
        return;
      }

      event.preventDefault();

      if (event.code === 'Backquote') {
        if (!event.repeat) {
          callbacks.onDebug();
        }
        return;
      }

      if (event.code === 'Escape') {
        if (!event.repeat) {
          callbacks.onPause();
        }
        return;
      }

      if (event.code === 'KeyR') {
        if (!event.repeat) {
          callbacks.onRetry();
        }
        return;
      }

      if (callbacks.isPlaying()) {
        this.held.add(event.code);
      }
    };

    const onKeyUp = (event: KeyboardEvent): void => {
      this.held.delete(event.code);

      if (
        callbacks.isFocused() &&
        CONTROL_KEYS.has(event.code) &&
        !(isButtonTarget(event) && event.code === 'Enter')
      ) {
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }
}
