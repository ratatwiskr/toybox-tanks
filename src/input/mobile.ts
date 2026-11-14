import type { Command, GameState, Mode } from '../sim/types';
import { TouchAdapter, type TouchControl } from './touch';

export function gamepadMode(mode: Mode, touchP1: boolean): Mode {
  return mode === 'coop' && touchP1 ? 'solo' : mode;
}

export function gamepadSlot(index: number, mode: Mode, touchP1: boolean): number | null {
  return mode === 'coop' && touchP1 ? (index === 0 ? null : index - 1) : index;
}

interface MobileHost {
  readonly app: HTMLElement;
  readonly stage: HTMLElement;
  readonly tools: HTMLElement;
  focusGame(): void;
  onSettingsChange(): void;
  onGeometryChange(): void;
}

interface Surface {
  readonly element: HTMLDivElement;
  readonly thumb: HTMLSpanElement;
  readonly control: TouchControl;
  pointer: number | null;
  cx: number;
  cy: number;
  radius: number;
}

export interface MobileControls {
  readonly enabled: boolean;
  readonly compact: boolean;
  readonly canPlay: boolean;
  clear(): void;
  sync(mode: Mode, state: GameState): void;
  readCommand(fallback: Command): Command;
}

export function createMobileControls(host: MobileHost): MobileControls {
  const adapter = new TouchAdapter();
  const capable = navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches;
  const landscape = matchMedia('(orientation: landscape)');
  const toggle = document.createElement('input');
  toggle.type = 'checkbox';
  toggle.id = 'touchToggle';
  toggle.checked = capable;
  const label = document.createElement('label');
  label.className = 'touch-setting';
  label.append(toggle, 'Touch P1');
  label.title =
    'Enable touch P1; in co-op the first gamepad controls P2. Turn off for two gamepads.';
  const fullscreen = document.createElement('button');
  fullscreen.type = 'button';
  fullscreen.id = 'fullscreenBtn';
  fullscreen.textContent = 'Fullscreen';
  host.tools.append(label, fullscreen);

  const layer = document.createElement('div');
  layer.id = 'touchControls';
  layer.className = 'touch-controls';
  layer.setAttribute('role', 'group');
  layer.setAttribute('aria-label', 'P1 touch controls');
  layer.hidden = true;
  const rotate = document.createElement('div');
  rotate.id = 'rotateHint';
  rotate.className = 'rotate-hint';
  rotate.textContent = 'Rotate to landscape to play. Resume when you are ready.';
  rotate.hidden = true;
  host.app.append(layer, rotate);

  let active = false;
  let fullscreenFailed = false;
  let immersive = false;
  const surfaces: Surface[] = [];

  function compact(): boolean {
    return capable || toggle.checked || immersive || document.fullscreenElement === host.app;
  }

  function canPlay(): boolean {
    return !compact() || landscape.matches;
  }

  function supportsElementFullscreen(): boolean {
    return typeof host.app.requestFullscreen === 'function';
  }

  function resetVisual(surface: Surface): void {
    surface.element.classList.remove('engaged');
    surface.thumb.style.transform = 'translate(-50%, -50%)';
  }

  function releaseCapture(surface: Surface, id: number): void {
    if (surface.element.hasPointerCapture(id)) {
      surface.element.releasePointerCapture(id);
    }
  }

  function clear(): void {
    const held = surfaces.map((surface) => ({ surface, id: surface.pointer }));
    adapter.clear();
    for (const surface of surfaces) {
      surface.pointer = null;
      resetVisual(surface);
    }
    for (const { surface, id } of held) {
      if (id !== null) {
        releaseCapture(surface, id);
      }
    }
  }

  function showThumb(surface: Surface, event: PointerEvent): void {
    const x = event.clientX - surface.cx;
    const y = event.clientY - surface.cy;
    const length = Math.hypot(x, y);
    const scale = length > surface.radius ? surface.radius / length : 1;
    surface.thumb.style.transform = `translate(calc(-50% + ${String(x * scale)}px), calc(-50% + ${String(y * scale)}px)`;
  }

  function finish(surface: Surface, event: PointerEvent, cancelled: boolean): void {
    if (surface.pointer !== event.pointerId) {
      return;
    }
    surface.pointer = null;
    if (cancelled) {
      adapter.cancel(event.pointerId);
    } else {
      adapter.end(
        event.pointerId,
        event.clientX - surface.cx,
        event.clientY - surface.cy,
        event.timeStamp,
      );
    }
    resetVisual(surface);
    releaseCapture(surface, event.pointerId);
  }

  function addSurface(control: TouchControl, text: string): void {
    const element = document.createElement('div');
    element.id = control === 'move' ? 'movePad' : 'aimPad';
    element.className = `touch-pad touch-${control}`;
    element.setAttribute('role', 'group');
    element.setAttribute('aria-label', text);
    const caption = document.createElement('span');
    caption.className = 'touch-caption';
    caption.textContent = text;
    const thumb = document.createElement('span');
    thumb.className = 'touch-thumb';
    element.append(caption, thumb);
    layer.append(element);
    const surface: Surface = { element, thumb, control, pointer: null, cx: 0, cy: 0, radius: 0 };
    surfaces.push(surface);

    element.addEventListener('pointerdown', (event) => {
      if (!active || !toggle.checked || !canPlay() || event.button !== 0) {
        return;
      }
      const rect = element.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const radius = Math.min(rect.width, rect.height) / 2;
      if (
        !adapter.begin(
          control,
          event.pointerId,
          event.clientX - cx,
          event.clientY - cy,
          radius,
          event.timeStamp,
        )
      ) {
        return;
      }
      surface.pointer = event.pointerId;
      surface.cx = cx;
      surface.cy = cy;
      surface.radius = radius;
      try {
        element.setPointerCapture(event.pointerId);
      } catch {
        adapter.cancel(event.pointerId);
        surface.pointer = null;
        return;
      }
      event.preventDefault();
      host.focusGame();
      element.classList.add('engaged');
      showThumb(surface, event);
    });
    element.addEventListener('pointermove', (event) => {
      if (surface.pointer === event.pointerId) {
        adapter.move(event.pointerId, event.clientX - surface.cx, event.clientY - surface.cy);
        showThumb(surface, event);
      }
    });
    element.addEventListener('pointerup', (event) => {
      finish(surface, event, false);
    });
    element.addEventListener('pointercancel', (event) => {
      finish(surface, event, true);
    });
    element.addEventListener('lostpointercapture', (event) => {
      finish(surface, event, true);
    });
    element.addEventListener('contextmenu', (event) => {
      event.preventDefault();
    });
  }

  addSurface('move', 'Move');
  addSurface('aim', 'Drag aim / tap fire');

  toggle.addEventListener('change', () => {
    clear();
    host.onSettingsChange();
  });

  async function toggleFullscreen(): Promise<void> {
    fullscreenFailed = false;

    if (supportsElementFullscreen()) {
      try {
        if (document.fullscreenElement === host.app) {
          await document.exitFullscreen();
        } else if (document.fullscreenEnabled) {
          await host.app.requestFullscreen();
        } else {
          immersive = !immersive;
        }
      } catch {
        if (document.fullscreenElement !== host.app) {
          immersive = !immersive;
        } else {
          fullscreenFailed = true;
        }
      }
    } else {
      immersive = !immersive;
    }

    fullscreen.title = fullscreenFailed
      ? 'Fullscreen unavailable; play in the browser viewport.'
      : '';
    host.onGeometryChange();
  }

  fullscreen.addEventListener('click', () => {
    void toggleFullscreen();
  });

  function geometryChanged(): void {
    clear();
    host.onGeometryChange();
  }

  window.addEventListener('resize', geometryChanged);
  landscape.addEventListener('change', geometryChanged);
  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement !== host.app) {
      immersive = false;
    }
    geometryChanged();
  });
  window.addEventListener('pagehide', () => {
    immersive = false;
  });

  return {
    get enabled() {
      return toggle.checked;
    },
    get compact() {
      return compact();
    },
    get canPlay() {
      return canPlay();
    },
    clear,
    sync(mode, state) {
      const nextActive = toggle.checked && state === 'playing' && canPlay();
      if (active && !nextActive) {
        clear();
      }
      active = nextActive;
      layer.hidden = !active;
      host.app.classList.toggle('compact', compact());
      host.app.classList.toggle('immersive', immersive);
      host.app.classList.toggle('mobile-solo', mode === 'solo');
      host.app.classList.toggle('touch-enabled', toggle.checked);
      rotate.hidden = canPlay();
      fullscreen.disabled = false;
      fullscreen.textContent =
        document.fullscreenElement === host.app || immersive
          ? 'Exit fullscreen'
          : fullscreenFailed
            ? 'Fullscreen unavailable'
            : 'Fullscreen';
    },
    readCommand(fallback) {
      return active ? adapter.readCommand(fallback) : fallback;
    },
  };
}
