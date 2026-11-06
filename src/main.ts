import './styles.css';
import { CONFIG } from './config';
import { KeyboardAdapter } from './input/keyboard';
import { createRenderer } from './render/renderer';
import { MAPS } from './sim/maps';
import type { GameState, Mode, World } from './sim/types';
import { activeShells, createEmptyWorld, createWorld, stepWorld } from './sim/world';

function requireElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (element === null) {
    throw new Error(`Missing required element #${id}`);
  }
  return element;
}

function requireCanvas(id: string): HTMLCanvasElement {
  const element = requireElement(id);
  if (!(element instanceof HTMLCanvasElement)) {
    throw new Error(`Required element #${id} is not a canvas`);
  }
  return element;
}

const app = requireElement('app');
const stage = requireElement('stage');
const canvas = requireCanvas('game');
const overlay = requireElement('overlay');
const dialog = requireElement('dialog');
const pauseButton = requireElement('pauseBtn');
const debugButton = requireElement('debugBtn');
const menuButton = requireElement('menuBtn');
const statusLine = requireElement('status');
const debugOutput = requireElement('debug');

const roomName = requireElement('roomName');
const roomInfo = requireElement('roomInfo');
const modeInfo = requireElement('modeInfo');
const hpElements = [requireElement('hp1'), requireElement('hp2')];
const deviceElements = [requireElement('device1'), requireElement('device2')];
const aimElements = [requireElement('aim1'), requireElement('aim2')];

const renderer = createRenderer(canvas);
const keyboard = new KeyboardAdapter();

let pauseReason = '';
let lastShownState = '';
let accumulator = 0;
let debugEnabled = false;

let world: World;
try {
  world = createWorld(0, 'coop');
  world.state = 'menu';
} catch (error) {
  world = createEmptyWorld('coop');
  world.state = 'error';
  pauseReason = error instanceof Error ? error.message : String(error);
}

statusLine.textContent =
  'Toybox Tanks · Gate B skeleton · Keyboard-first · No audio · Full simulation lands in Gate C';

function focusGame(): void {
  stage.focus({ preventScroll: true });
}

function ownsFocus(): boolean {
  return app.contains(document.activeElement);
}

function button(label: string, action: string, primary = false): string {
  return `<button type="button" data-action="${action}" class="${primary ? 'primary' : ''}">${label}</button>`;
}

const controlHTML =
  '<div class="keys"><div><b>● BLUE / P1</b><kbd>W A S D</kbd> move<br><kbd>Q</kbd> / <kbd>E</kbd> turn turret · <kbd>F</kbd> fire</div><div><b>■ ORANGE / P2</b><kbd>↑ ← ↓ →</kbd> move<br><kbd>,</kbd> / <kbd>.</kbd> turn turret · <kbd>Enter</kbd> fire</div></div>';

interface OverlayContent {
  readonly title: string;
  readonly tag: string;
  readonly text: string;
  readonly actions: string;
  readonly extra: string;
}

function overlayContent(state: GameState): OverlayContent {
  switch (state) {
    case 'menu':
      return {
        title: 'Small tanks.<br>Big teamwork.',
        tag: 'Toybox Tanks · 3 tabletop rooms',
        text: 'Move freely. Aim separately. Bounce once.<br>Clear the room together — only one of you needs to survive.',
        actions: button('Start two-player co-op', 'coop', true) + button('Solo practice', 'solo'),
        extra:
          controlHTML +
          '<p class="tiny">Two hits per player · three active shells each · no friendly fire.<br>This Gate B skeleton proves the toolchain and rendering pipeline; full combat parity arrives in Gate C.</p>',
      };
    case 'paused':
      return {
        title: 'Tabletop timeout',
        tag: 'Paused',
        text: pauseReason || 'Take a breath. No shells move while paused.',
        actions:
          button('Resume', 'resume', true) +
          button('Restart this room', 'retry') +
          button('Main menu', 'menu'),
        extra: controlHTML,
      };
    case 'cleared': {
      const nextMap = MAPS[world.room + 1];
      return {
        title: 'Room cleared!',
        tag: `Room ${String(world.room + 1)} / 3`,
        text: `Both tanks are repaired for the next room.<br>Next up: ${nextMap?.name ?? 'the next room'}`,
        actions: button('Next room →', 'next', true) + button('Replay this room', 'retry'),
        extra: '',
      };
    }
    case 'defeat':
      return {
        title: 'A tiny setback',
        tag: 'Both tanks disabled',
        text: 'The whole team gets a fresh start in this room.<br>No lives to lose. Try a different angle.',
        actions: button('Retry room · R', 'retry', true) + button('Main menu', 'menu'),
        extra: '',
      };
    case 'completed':
      return {
        title: 'A clean toybox sweep!',
        tag: 'All 3 rooms complete',
        text: 'You cleared First Bounce, Block Party, and Together Through.<br>The tabletop belongs to the team.',
        actions: button('Replay all rooms', 'replay', true) + button('Main menu', 'menu'),
        extra: '',
      };
    case 'error':
      return {
        title: 'This map needs a fix',
        tag: 'Map validation',
        text: '',
        actions: button('Recheck / main menu', 'menu'),
        extra: '',
      };
    case 'playing':
      return { title: '', tag: '', text: '', actions: '', extra: '' };
  }
}

function setOverlay(): void {
  if (lastShownState === world.state) {
    return;
  }

  lastShownState = world.state;
  keyboard.clear();
  accumulator = 0;
  overlay.hidden = world.state === 'playing';
  pauseButton.textContent = world.state === 'paused' ? 'Resume · Esc' : 'Pause · Esc';

  if (world.state === 'playing') {
    focusGame();
    return;
  }

  const content = overlayContent(world.state);
  dialog.innerHTML = `<div class="tag">${content.tag}</div><h1 id="dialogTitle">${content.title}</h1><p id="dialogText">${content.text}</p><div class="buttons">${content.actions}</div>${content.extra}`;

  if (world.state === 'error') {
    const dialogText = requireElement('dialogText');
    dialogText.textContent = pauseReason;
    dialogText.style.whiteSpace = 'pre-wrap';
  }

  const first = dialog.querySelector('button');
  if (first instanceof HTMLButtonElement) {
    first.focus({ preventScroll: true });
  }
}

function loadRoom(index: number, mode: Mode = world.mode): void {
  try {
    world = createWorld(index, mode);
    keyboard.clear();
    accumulator = 0;
    lastShownState = '';
    pauseReason = '';
    setOverlay();
    updateHUD();
  } catch (error) {
    pauseReason = error instanceof Error ? error.message : String(error);
    world = createEmptyWorld(world.mode);
    world.state = 'error';
    lastShownState = '';
    setOverlay();
    updateHUD();
  }
}

function restartRoom(): void {
  loadRoom(world.room, world.mode);
}

function isPlaying(world: World): boolean {
  return world.state === 'playing';
}

function pauseGame(reason = ''): void {
  if (world.state === 'playing') {
    pauseReason = reason;
    world.state = 'paused';
    keyboard.clear();
    accumulator = 0;
    setOverlay();
  }
}

function resumeGame(): void {
  if (world.state === 'paused') {
    world.state = 'playing';
    pauseReason = '';
    keyboard.clear();
    accumulator = 0;
    setOverlay();
  }
}

function togglePause(): void {
  if (world.state === 'playing') {
    pauseGame();
  } else if (world.state === 'paused') {
    resumeGame();
  }
}

function showMenu(): void {
  try {
    world = createWorld(0, 'coop');
    world.state = 'menu';
    pauseReason = '';
  } catch (error) {
    world = createEmptyWorld('coop');
    world.state = 'error';
    pauseReason = error instanceof Error ? error.message : String(error);
  }

  lastShownState = '';
  keyboard.clear();
  setOverlay();
  updateHUD();
}

function toggleDebug(): void {
  debugEnabled = !debugEnabled;
  debugOutput.hidden = !debugEnabled;
  debugButton.setAttribute('aria-pressed', String(debugEnabled));
  updateHUD();
}

function act(action: string): void {
  if (action === 'coop' || action === 'solo') {
    loadRoom(0, action);
  } else if (action === 'resume') {
    resumeGame();
  } else if (action === 'retry') {
    restartRoom();
  } else if (action === 'next' && world.state === 'cleared') {
    loadRoom(world.room + 1);
  } else if (action === 'replay') {
    loadRoom(0);
  } else if (action === 'menu') {
    showMenu();
  }
}

function directionLabel(angle: number): string {
  const degrees = ((angle * 180) / Math.PI) % 360;
  const normalized = ((degrees % 360) + 360) % 360;
  const arrows = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'];
  const arrow = arrows[Math.round(normalized / 45) % 8] ?? '→';
  return `${arrow} · ${String(Math.round(normalized) % 360)}°`;
}

function updateHUD(): void {
  const map = MAPS[world.room];
  roomName.textContent = map?.name ?? 'Unknown room';

  const remaining = world.enemies.filter((enemy) => enemy.alive).length;
  roomInfo.textContent = `Room ${String(world.room + 1)} / ${String(MAPS.length)} · ${String(remaining)} ${remaining === 1 ? 'sentry' : 'sentries'} left`;
  modeInfo.textContent =
    world.state === 'menu'
      ? 'Choose co-op or solo practice'
      : world.mode === 'solo'
        ? 'Solo practice · P1 only'
        : 'Local co-op · one survivor is enough';

  for (let index = 0; index < 2; index += 1) {
    const player = world.players[index];
    const hpElement = hpElements[index];
    const deviceElement = deviceElements[index];
    const aimElement = aimElements[index];

    if (hpElement === undefined || deviceElement === undefined || aimElement === undefined) {
      continue;
    }

    if (player === undefined) {
      hpElement.textContent = '— SOLO';
      deviceElement.textContent = 'No second tank spawned';
      aimElement.textContent = 'Solo team size: 1';
      continue;
    }

    hpElement.textContent = !player.alive
      ? 'DISABLED'
      : Array.from({ length: CONFIG.playerHealth }, (_, heart) =>
          heart < player.hp ? '♥' : '♡',
        ).join(' ');

    const keyboardHint = index === 0 ? 'WASD · Q/E · F' : 'Arrows · ,/. · Enter';
    deviceElement.textContent = `${keyboardHint} · keyboard`;
    deviceElement.title = 'Keyboard';
    aimElement.textContent = player.alive
      ? `Turret ${directionLabel(player.angle)} · shells ${String(activeShells(world, player.id))}/${String(CONFIG.activeShellLimit)}`
      : 'Repairs on room completion';
  }

  if (debugEnabled) {
    const tankLines = [...world.players, ...world.enemies]
      .map(
        (tank) =>
          `${tank.id.toUpperCase()} (${tank.x.toFixed(1)}, ${tank.y.toFixed(1)}) HP ${String(tank.hp)}${tank.alive ? '' : ' OUT'}`,
      )
      .join('\n');
    debugOutput.textContent = `ROOM ${String(world.room + 1)} · ${world.state.toUpperCase()} · t ${world.time.toFixed(2)}\nSHELLS ${String(world.shells.length)} · shots ${String(world.shots)} · bounces ${String(world.bounces)}\n${tankLines}`;
  }
}

dialog.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }

  const actionButton = target.closest('button[data-action]');
  if (!(actionButton instanceof HTMLButtonElement)) {
    return;
  }

  const action = actionButton.dataset.action;
  if (action !== undefined) {
    act(action);
  }
});

pauseButton.addEventListener('click', togglePause);
debugButton.addEventListener('click', () => {
  toggleDebug();
  if (world.state === 'playing') {
    focusGame();
  }
});
menuButton.addEventListener('click', showMenu);

stage.addEventListener('pointerdown', (event) => {
  if (event.target === canvas || event.target === stage) {
    focusGame();
  }
});

window.addEventListener('blur', () => {
  keyboard.clear();
  pauseGame('Focus lost — resume when you are ready.');
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    keyboard.clear();
    pauseGame('Tab hidden — the tabletop is waiting.');
  }
});

app.addEventListener('focusout', () => {
  queueMicrotask(() => {
    if (!ownsFocus()) {
      keyboard.clear();
      pauseGame('Game focus lost — resume when ready.');
    }
  });
});

keyboard.attach({
  isFocused: ownsFocus,
  isPlaying: () => world.state === 'playing',
  onPause: togglePause,
  onRetry: () => {
    if (world.state === 'defeat') {
      restartRoom();
    }
  },
  onDebug: toggleDebug,
});

const resizeObserver = new ResizeObserver(() => {
  renderer.resize();
});
resizeObserver.observe(canvas);
window.addEventListener('resize', () => {
  renderer.resize();
});

let previousTime: number | null = null;

function frame(timestamp: number): void {
  const now = timestamp / 1000;
  const raw = previousTime === null ? 0 : now - previousTime;
  previousTime = now;

  if (world.state === 'playing') {
    accumulator += Math.min(CONFIG.maxFrameTime, Math.max(0, raw));
    let count = 0;

    while (accumulator >= CONFIG.fixedStep && count < CONFIG.maxSteps && isPlaying(world)) {
      stepWorld(
        world,
        CONFIG.fixedStep,
        world.players.map((_, index) => keyboard.readCommand(index)),
      );
      accumulator -= CONFIG.fixedStep;
      count += 1;
    }

    if (count === CONFIG.maxSteps) {
      accumulator = 0;
    }
  } else {
    accumulator = 0;
  }

  setOverlay();
  renderer.render(world, debugEnabled);
  updateHUD();
  requestAnimationFrame(frame);
}

renderer.resize();
setOverlay();
updateHUD();
renderer.render(world);
requestAnimationFrame(frame);
