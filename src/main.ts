import './styles.css';
import './mobile.css';
import { createBrowserPlayback } from './audio/browser';
import { createAudioControls } from './audio/controls';
import { createAudioSession } from './audio/session';
import { CONFIG } from './config';
import { GamepadAdapter, type GamepadSource } from './input/gamepad';
import { KeyboardAdapter } from './input/keyboard';
import { createMobileControls, gamepadMode, gamepadSlot } from './input/mobile';
import { advanceWorld } from './presentation/body-heading';
import { levelSelectMarkup, type MenuScreen } from './presentation/level-select';
import { AssetLoadError } from './render/assets';
import { FLOOR_WOOD_WARM } from './render/floor-data';
import { prepareFloorImage } from './render/floor';
import { createRenderer } from './render/renderer';
import { MAPS } from './sim/maps';
import type { Command, GameState, Mode, World } from './sim/types';
import { activeShells, createEmptyWorld, createWorld } from './sim/world';
import { installTestBridge } from './test-bridge';

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
const tools = menuButton.parentElement;
if (tools === null) {
  throw new Error('Missing game toolbar');
}

const roomName = requireElement('roomName');
const roomInfo = requireElement('roomInfo');
const modeInfo = requireElement('modeInfo');
const hpElements = [requireElement('hp1'), requireElement('hp2')];
const deviceElements = [requireElement('device1'), requireElement('device2')];
const aimElements = [requireElement('aim1'), requireElement('aim2')];

const audio = createAudioSession(createBrowserPlayback());
const renderer = createRenderer(canvas);
const keyboard = new KeyboardAdapter();
const gamepads = new GamepadAdapter();
const gamepadSource: GamepadSource = {
  getGamepads: () => (typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : []),
};

let pauseReason = '';
let lastShownState = '';
let accumulator = 0;
let debugEnabled = false;
let manualClock = false;
let menuScreen: MenuScreen = 'modes';
let selectedMode: Mode = 'coop';
let selectedRoom = 0;

let world: World;
try {
  world = createWorld(0, 'coop');
  world.state = 'menu';
} catch (error) {
  world = createEmptyWorld('coop');
  world.state = 'error';
  pauseReason = error instanceof Error ? error.message : String(error);
}

let reviewPanel:
  | { recordFrame(timestamp: number, world: World, simulationSteps: number): void }
  | undefined;
if (__REVIEW_BUILD__) {
  const { installReviewPanel } = await import('./review/review-panel');
  reviewPanel = installReviewPanel({ canvas });
}

const mobile = createMobileControls({
  app,
  stage,
  tools,
  focusGame,
  onSettingsChange: () => {
    clearInputs();
    pauseGame('Controls changed — resume when ready.');
    lastShownState = '';
    setOverlay();
    updateHUD();
  },
  onGeometryChange: () => {
    clearInputs();
    renderer.resize();
    setOverlay();
  },
});

statusLine.textContent = `Toybox Tanks · ${String(MAPS.length)} tabletop rooms · Keyboard-first · Audio controls below`;

function focusGame(): void {
  stage.focus({ preventScroll: true });
}

function ownsFocus(): boolean {
  return app.contains(document.activeElement);
}

function clearInputs(): void {
  keyboard.clear();
  gamepads.clear();
  mobile.clear();
}

function pollGamepads(): void {
  if (
    document.activeElement instanceof Element &&
    document.activeElement.closest('.audio-controls') !== null
  ) {
    gamepads.clear();
    return;
  }
  const previous = gamepads.assigned.map((pad) => `${String(pad.index)}:${pad.id}`);
  const startRequest = { pending: false };
  gamepads.poll(gamepadMode(world.mode, mobile.enabled), gamepadSource, {
    onPause: () => {
      startRequest.pending = true;
    },
  });
  const next = gamepads.assigned.map((pad) => `${String(pad.index)}:${pad.id}`);
  const changed =
    previous.length !== next.length || previous.some((id, index) => id !== next[index]);
  const lost = previous.some((id) => !next.includes(id));
  if (changed) {
    clearInputs();
  }
  if (lost && mobile.compact && world.mode === 'coop') {
    pauseGame('Controller disconnected — reconnect, release controls, then resume.');
  } else if (startRequest.pending && !(changed && mobile.compact && world.mode === 'coop')) {
    togglePause();
  }
}

function readCommand(index: number): Command {
  if (
    document.activeElement instanceof Element &&
    document.activeElement.closest('.audio-controls') !== null
  ) {
    return { x: 0, y: 0, turn: 0, fire: false };
  }
  const fallback = keyboard.readCommand(index);
  const slot = gamepadSlot(index, world.mode, mobile.enabled);
  const command = slot === null ? fallback : gamepads.readCommand(slot, fallback);
  return index === 0 && mobile.enabled ? mobile.readCommand(command) : command;
}

const LOGO_COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7'] as const;

function logoRow(word: string, offset: number, tilt: number): string {
  return [...word]
    .map((char, index) => {
      const color = LOGO_COLORS[(index + offset) % LOGO_COLORS.length] ?? '#ef4444';
      const angle = index % 2 === 1 ? tilt : -tilt;
      return `<b style="background:${color};transform:rotate(${String(angle)}deg)">${char}</b>`;
    })
    .join('');
}

function toyboxLogoHTML(): string {
  return `<h1 id="dialogTitle" class="logo" aria-label="Toybox Tanks">${logoRow('TOYBOX', 0, 3)}<br>${logoRow('TANKS', 2, -3)}</h1>`;
}

function tipSignHTML(): string {
  const text = mobile.enabled
    ? 'Left thumb drive · Right thumb aim + fire'
    : 'Gamepad or keyboard: P1 WASD + Q/E + F · P2 Arrows + , . + Enter';
  return `<div class="sign">${text}</div>`;
}

function button(label: string, action: string, primary = false): string {
  const classes = primary ? 'wood-btn wood-btn-green' : 'wood-btn';
  return `<button type="button" data-action="${action}" class="${classes}">${label}</button>`;
}

interface OverlayContent {
  readonly head: string;
  readonly text?: string;
  readonly actions: string;
  readonly className?: string;
  readonly legacyLevelSelect?: {
    readonly tag: string;
    readonly title: string;
    readonly text: string;
    readonly body: string;
  };
}

function overlayContent(state: GameState): OverlayContent {
  switch (state) {
    case 'menu':
      if (menuScreen === 'levels') {
        return {
          head: '',
          actions: '',
          className: 'level-select',
          legacyLevelSelect: {
            tag: `Corkboard · ${String(MAPS.length)} campaign rooms`,
            title: 'Select a stage blueprint',
            text: `${selectedMode === 'solo' ? 'Solo practice' : 'Local co-op'} · pick any room, then roll out.`,
            body: levelSelectMarkup({ maps: MAPS, mode: selectedMode, selectedRoom }),
          },
        };
      }
      return {
        head: toyboxLogoHTML() + tipSignHTML(),
        actions: button('Solo', 'solo', true) + button('Co-op 2 players', 'coop', true),
      };
    case 'paused':
      return {
        head: '<h1 id="dialogTitle">Pause</h1><div id="dialogText" class="sign"></div>',
        text: pauseReason || 'No shells move while paused.',
        actions:
          button('Resume', 'resume', true) +
          button('Restart room', 'retry') +
          button('Choose room', 'levels') +
          button('Main menu', 'menu'),
      };
    case 'cleared': {
      const nextMap = MAPS[world.room + 1];
      return {
        head: '<h1 id="dialogTitle">Room cleared!</h1><div id="dialogText" class="sign"></div>',
        text: `${world.mode === 'solo' ? 'Your tank is repaired.' : 'Both tanks are repaired.'} Next up: ${nextMap?.name ?? 'the next room'}`,
        actions:
          button('Next room', 'next', true) +
          button('Replay', 'retry') +
          button('Choose room', 'levels'),
      };
    }
    case 'defeat':
      return {
        head: '<h1 id="dialogTitle">A tiny setback</h1><div id="dialogText" class="sign"></div>',
        text: 'Try a different angle. No lives to lose.',
        actions:
          button('Retry (R)', 'retry', true) +
          button('Choose room', 'levels') +
          button('Menu', 'menu'),
      };
    case 'completed':
      return {
        head: '<h1 id="dialogTitle">A clean toybox sweep!</h1><div id="dialogText" class="sign"></div>',
        text: `All ${String(MAPS.length)} rooms cleared. The tabletop belongs to the team.`,
        actions: button('Replay all rooms', 'replay', true) + button('Choose room', 'levels'),
      };
    case 'error':
      return {
        head: '<h1 id="dialogTitle">This map needs a fix</h1><div id="dialogText" class="sign"></div>',
        text: pauseReason,
        actions: button('Main menu', 'menu', true),
      };
    case 'playing':
      return { head: '', actions: '' };
  }
}

function setOverlay(): void {
  audio.setState(world.state);
  mobile.sync(world.mode, world.state);
  if (world.state === 'playing' && !mobile.canPlay) {
    pauseGame('Rotate to landscape, then resume.');
    return;
  }
  const overlayKey = world.state === 'menu' ? `menu:${menuScreen}` : world.state;
  if (lastShownState === overlayKey) {
    return;
  }

  lastShownState = overlayKey;
  clearInputs();
  accumulator = 0;
  overlay.hidden = world.state === 'playing';
  pauseButton.textContent = world.state === 'paused' ? 'Resume · Esc' : 'Pause · Esc';

  if (world.state === 'playing') {
    focusGame();
    return;
  }

  const content = overlayContent(world.state);
  dialog.className = content.className === undefined ? 'dialog' : `dialog ${content.className}`;

  if (content.legacyLevelSelect !== undefined) {
    const legacy = content.legacyLevelSelect;
    dialog.innerHTML = `<div class="tag">${legacy.tag}</div><h1 id="dialogTitle">${legacy.title}</h1><p id="dialogText">${legacy.text}</p>${legacy.body}`;
  } else {
    const actions = content.actions === '' ? '' : `<div class="buttons">${content.actions}</div>`;
    dialog.innerHTML = `<div class="head">${content.head}</div>${actions}`;
    if (content.text !== undefined) {
      const dialogText = requireElement('dialogText');
      dialogText.textContent = content.text;
      if (world.state === 'error') {
        dialogText.style.whiteSpace = 'pre-wrap';
        dialogText.style.textAlign = 'left';
      }
    }
  }

  const first =
    world.state === 'menu' && menuScreen === 'levels'
      ? (dialog.querySelector('.stage-card--selected') ?? dialog.querySelector('button'))
      : (dialog.querySelector('.wood-btn-green') ?? dialog.querySelector('button'));
  if (first instanceof HTMLButtonElement) {
    first.focus({ preventScroll: true });
  }
}

function loadRoom(index: number, mode: Mode = world.mode): void {
  audio.reset();
  selectedMode = mode;
  selectedRoom = index;
  menuScreen = 'modes';
  try {
    world = createWorld(index, mode);
    clearInputs();
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

// The test bridge is the only caller that replaces a world wholesale. Keep the
// same input/reset discipline as a normal room load.
function replaceWorld(next: World): void {
  audio.reset();
  world = next;
  selectedMode = next.mode;
  selectedRoom = next.room;
  menuScreen = 'modes';
  clearInputs();
  accumulator = 0;
  lastShownState = '';
  pauseReason = '';
  setOverlay();
  updateHUD();
}

function showError(message: string): void {
  audio.reset();
  pauseReason = message;
  world = createEmptyWorld(world.mode);
  world.state = 'error';
  menuScreen = 'modes';
  lastShownState = '';
  clearInputs();
  setOverlay();
  updateHUD();
}

function isPlaying(world: World): boolean {
  return world.state === 'playing';
}

function pauseGame(reason = ''): void {
  if (world.state === 'playing') {
    pauseReason = reason;
    world.state = 'paused';
    clearInputs();
    accumulator = 0;
    setOverlay();
  }
}

function resumeGame(): void {
  if (world.state === 'paused' && mobile.canPlay) {
    world.state = 'playing';
    pauseReason = '';
    clearInputs();
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
  audio.reset();
  menuScreen = 'modes';
  selectedMode = 'coop';
  selectedRoom = 0;
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
  clearInputs();
  accumulator = 0;
  setOverlay();
  updateHUD();
}

function toggleDebug(): void {
  debugEnabled = !debugEnabled;
  debugOutput.hidden = !debugEnabled;
  debugButton.setAttribute('aria-pressed', String(debugEnabled));
  updateHUD();
}

function openLevelSelect(mode: Mode): void {
  audio.reset();
  const room =
    Number.isInteger(world.room) && world.room >= 0 && world.room < MAPS.length ? world.room : 0;
  selectedMode = mode;
  selectedRoom = room;
  menuScreen = 'levels';
  try {
    world = createWorld(room, mode);
    world.state = 'menu';
    pauseReason = '';
  } catch (error) {
    world = createEmptyWorld(mode);
    world.state = 'error';
    pauseReason = error instanceof Error ? error.message : String(error);
  }
  lastShownState = '';
  clearInputs();
  accumulator = 0;
  setOverlay();
  updateHUD();
}

function selectLevel(index: number): void {
  if (!Number.isInteger(index) || index < 0 || index >= MAPS.length) {
    return;
  }
  selectedRoom = index;
  for (const card of dialog.querySelectorAll('.stage-card')) {
    if (!(card instanceof HTMLButtonElement)) {
      continue;
    }
    const isSelected = card.dataset.room === String(index);
    card.classList.toggle('stage-card--selected', isSelected);
    card.setAttribute('aria-pressed', String(isSelected));
  }
  const title = document.getElementById('selectedStageTitle');
  const map = MAPS[index];
  if (title !== null && map !== undefined) {
    title.textContent = `Mission ${String(index + 1).padStart(2, '0')}: ${map.name}`;
  }
  updateHUD();
}

function launchSelectedLevel(): void {
  if (world.state !== 'menu' || menuScreen !== 'levels') {
    return;
  }
  loadRoom(selectedRoom, selectedMode);
}

function act(action: string, actionButton?: HTMLButtonElement): void {
  if (action === 'coop' || action === 'solo') {
    openLevelSelect(action);
  } else if (action === 'level') {
    selectLevel(Number(actionButton?.dataset.room));
  } else if (action === 'launch') {
    launchSelectedLevel();
  } else if (action === 'back-modes') {
    menuScreen = 'modes';
    lastShownState = '';
    setOverlay();
    updateHUD();
  } else if (action === 'levels') {
    openLevelSelect(world.mode);
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
  const choosingLevel = world.state === 'menu' && menuScreen === 'levels';
  const shownRoom = choosingLevel ? selectedRoom : world.room;
  const map = MAPS[shownRoom];
  roomName.textContent = map?.name ?? 'Unknown room';

  if (choosingLevel) {
    const enemies = map?.expectedEnemies ?? 0;
    roomInfo.textContent = `Stage ${String(shownRoom + 1)} / ${String(MAPS.length)} · ${String(enemies)} ${enemies === 1 ? 'enemy' : 'enemies'}`;
  } else {
    const remaining = world.enemies.filter((enemy) => enemy.alive).length;
    roomInfo.textContent = `Room ${String(world.room + 1)} / ${String(MAPS.length)} · ${String(remaining)} ${remaining === 1 ? 'enemy' : 'enemies'} left`;
  }
  modeInfo.textContent = choosingLevel
    ? `${selectedMode === 'solo' ? 'Solo practice' : 'Local co-op'} · choose any room`
    : world.state === 'menu'
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
    const slot = gamepadSlot(index, world.mode, mobile.enabled);
    const pad = slot === null ? undefined : gamepads.assigned[slot];
    deviceElement.textContent =
      index === 0 && mobile.enabled
        ? 'Touch P1 + keyboard'
        : pad === undefined
          ? `${keyboardHint} · keyboard · no gamepad`
          : `${keyboardHint} + Pad ${String(pad.index + 1)}`;
    deviceElement.title = pad?.id ?? 'Keyboard';
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

const removeAudioControls = createAudioControls(app, audio, clearInputs);
const audioActivation = new AbortController();
function activateAudio(event: Event): void {
  if (event.isTrusted) void audio.unlock();
}
app.addEventListener('pointerdown', activateAudio, {
  capture: true,
  signal: audioActivation.signal,
});
app.addEventListener('keydown', activateAudio, { capture: true, signal: audioActivation.signal });
window.addEventListener('pagehide', (event) => {
  clearInputs();
  pauseGame('Page hidden — resume when ready.');
  if (!event.persisted) {
    removeAudioControls();
    audioActivation.abort();
    audio.dispose();
  }
});

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
    act(action, actionButton);
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
  clearInputs();
  pauseGame('Focus lost — resume when you are ready.');
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    clearInputs();
    pauseGame('Tab hidden — the tabletop is waiting.');
  }
});

app.addEventListener('focusout', (event) => {
  // Moving focus between the arena and the app's own controls (Pause, Menu,
  // audio settings) does not lose the game: those controls handle their own
  // actions. Only focus leaving the app should pause.
  const next = event.relatedTarget;
  if (next instanceof Node && app.contains(next)) {
    return;
  }
  queueMicrotask(() => {
    if (!ownsFocus()) {
      clearInputs();
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
  mobile.clear();
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

  pollGamepads();
  setOverlay();

  let simulationSteps = 0;
  if (!manualClock && world.state === 'playing') {
    accumulator += Math.min(CONFIG.maxFrameTime, Math.max(0, raw));
    let count = 0;

    while (accumulator >= CONFIG.fixedStep && count < CONFIG.maxSteps && isPlaying(world)) {
      audio.consume(
        advanceWorld(
          world,
          CONFIG.fixedStep,
          world.players.map((_, index) => readCommand(index)),
        ),
      );
      accumulator -= CONFIG.fixedStep;
      count += 1;
    }

    if (count === CONFIG.maxSteps) {
      accumulator = 0;
    }
    simulationSteps = count;
  } else {
    accumulator = 0;
  }

  setOverlay();
  renderer.render(world, debugEnabled);
  reviewPanel?.recordFrame(timestamp, world, simulationSteps);
  updateHUD();
  requestAnimationFrame(frame);
}

function showAssetWarning(message: string): void {
  console.error(message);
  statusLine.textContent = message;
  statusLine.classList.add('warning');
}

async function preloadFloorArtwork(): Promise<void> {
  try {
    const image = await prepareFloorImage(FLOOR_WOOD_WARM);
    if (!renderer.setFloorPattern(image)) {
      throw new AssetLoadError(
        'canvas-unavailable',
        FLOOR_WOOD_WARM.id,
        'Could not create the floor pattern',
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showAssetWarning(`Floor artwork unavailable — using the simple floor. ${message}`);
  }
}

// Preload before the first frame so captures and gameplay never race the decode.
// A failure keeps the procedural floor and shows the reason in the status line.
await preloadFloorArtwork();

if (__TEST_BUILD__) {
  installTestBridge({
    afterStep: (events) => {
      audio.consume(events);
    },
    getWorld: () => world,
    replaceWorld,
    readCommands: () => {
      pollGamepads();
      return world.players.map((_, index) => readCommand(index));
    },
    takeClock: () => {
      manualClock = true;
      accumulator = 0;
    },
    sync: () => {
      setOverlay();
      updateHUD();
    },
    render: () => {
      renderer.render(world, debugEnabled);
    },
    clearInput: clearInputs,
    showError,
    showLevelSelect: (mode) => {
      openLevelSelect(mode);
    },
  });
}

renderer.resize();
setOverlay();
updateHUD();
renderer.render(world);
requestAnimationFrame(frame);
