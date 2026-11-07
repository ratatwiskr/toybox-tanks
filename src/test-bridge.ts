import { CONFIG } from './config';
import { MAPS } from './sim/maps';
import type { Command, Effect, Mode, Shell, Tank, Wall, World } from './sim/types';
import { createEmptyWorld, createWorld, evaluateOutcome, stepWorld } from './sim/world';

// The typed automation surface exists only in the dedicated test build. It
// exposes curated scenarios and stable snapshots, never the mutable world.
export type ScenarioName =
  | 'menu'
  | 'coop'
  | 'solo'
  | 'room'
  | 'active-shot'
  | 'disabled-player'
  | 'paused'
  | 'cleared'
  | 'defeat'
  | 'completed'
  | 'error';

export interface ScenarioOptions {
  readonly room?: number;
  readonly mode?: Mode;
}

export interface AdvanceOptions {
  readonly commands?: readonly Command[];
  readonly sampleInput?: boolean;
}

export interface TankSnapshot {
  readonly id: string;
  readonly faction: Tank['faction'];
  readonly x: number;
  readonly y: number;
  readonly spawnX: number;
  readonly spawnY: number;
  readonly r: number;
  readonly angle: number;
  readonly hp: number;
  readonly alive: boolean;
  readonly invuln: number;
  readonly cooldown: number;
  readonly charge: number;
  readonly targetId: string | null;
  readonly track: number;
}

export interface ShellSnapshot {
  readonly id: number;
  readonly owner: string;
  readonly faction: Shell['faction'];
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly bounces: number;
  readonly dead: boolean;
}

export interface EffectSnapshot {
  readonly x: number;
  readonly y: number;
  readonly type: Effect['type'];
  readonly age: number;
  readonly life: number;
  readonly seed: number;
}

export interface TestSnapshot {
  readonly room: number;
  readonly mode: Mode;
  readonly state: World['state'];
  readonly time: number;
  readonly ticks: number;
  readonly nextShell: number;
  readonly shots: number;
  readonly bounces: number;
  readonly walls: readonly Wall[];
  readonly players: readonly TankSnapshot[];
  readonly enemies: readonly TankSnapshot[];
  readonly shells: readonly ShellSnapshot[];
  readonly effects: readonly EffectSnapshot[];
  readonly events: readonly string[];
}

export interface TestBridgeHost {
  getWorld(): World;
  replaceWorld(world: World): void;
  readCommands(): readonly Command[];
  takeClock(): void;
  sync(): void;
  render(): void;
  clearInput(): void;
  showError(message: string): void;
}

export interface ToyboxTestBridge {
  loadScenario(name: ScenarioName, options?: ScenarioOptions): TestSnapshot;
  advanceTicks(count: number, options?: AdvanceOptions): TestSnapshot;
  snapshot(): TestSnapshot;
  events(): readonly string[];
  render(): void;
  clearInput(): void;
}

declare global {
  interface Window {
    __TOYBOX_TEST__?: ToyboxTestBridge;
  }
}

const ERROR_MESSAGE = 'Test scenario: invalid room configuration.';
const MODES: readonly Mode[] = ['coop', 'solo'];

function snapshotTank(tank: Tank): TankSnapshot {
  return {
    id: tank.id,
    faction: tank.faction,
    x: tank.x,
    y: tank.y,
    spawnX: tank.spawnX,
    spawnY: tank.spawnY,
    r: tank.r,
    angle: tank.angle,
    hp: tank.hp,
    alive: tank.alive,
    invuln: tank.invuln,
    cooldown: tank.cooldown,
    charge: tank.charge,
    targetId: tank.targetId,
    track: tank.track,
  };
}

function snapshotShell(shell: Shell): ShellSnapshot {
  return {
    id: shell.id,
    owner: shell.owner,
    faction: shell.faction,
    x: shell.x,
    y: shell.y,
    vx: shell.vx,
    vy: shell.vy,
    bounces: shell.bounces,
    dead: shell.dead,
  };
}

function snapshotEffect(effect: Effect): EffectSnapshot {
  return {
    x: effect.x,
    y: effect.y,
    type: effect.type,
    age: effect.age,
    life: effect.life,
    seed: effect.seed,
  };
}

export function snapshotWorld(world: World): TestSnapshot {
  return {
    room: world.room,
    mode: world.mode,
    state: world.state,
    time: world.time,
    ticks: Math.round(world.time / CONFIG.fixedStep),
    nextShell: world.nextShell,
    shots: world.shots,
    bounces: world.bounces,
    walls: world.walls.map((wall) => ({ ...wall })),
    players: world.players.map(snapshotTank),
    enemies: world.enemies.map(snapshotTank),
    shells: world.shells.map(snapshotShell),
    effects: world.effects.map(snapshotEffect),
    events: [...world.events],
  };
}

function resolveRoom(options: ScenarioOptions): number {
  const room = options.room ?? 0;
  if (!Number.isInteger(room) || room < 0 || room >= MAPS.length) {
    throw new Error(`Room must be an integer from 0 to ${String(MAPS.length - 1)}.`);
  }
  return room;
}

function resolveMode(options: ScenarioOptions): Mode {
  const mode = options.mode ?? 'coop';
  if (!MODES.includes(mode)) {
    throw new Error('Mode must be "coop" or "solo".');
  }
  return mode;
}

function scenarioWorld(name: ScenarioName, options: ScenarioOptions): World {
  switch (name) {
    case 'menu': {
      const world = createWorld(0, 'coop');
      world.state = 'menu';
      return world;
    }
    case 'coop':
      return createWorld(resolveRoom(options), 'coop');
    case 'solo':
      return createWorld(resolveRoom(options), 'solo');
    case 'room':
      return createWorld(resolveRoom(options), resolveMode(options));
    case 'active-shot': {
      const world = createWorld(resolveRoom(options), resolveMode(options));
      const player = world.players[0];
      if (player !== undefined) {
        player.angle = 0;
        stepWorld(world, CONFIG.fixedStep, [
          { x: 0, y: 0, turn: 0, fire: true },
          { x: 0, y: 0, turn: 0, fire: false },
        ]);
      }
      return world;
    }
    case 'disabled-player': {
      const world = createWorld(resolveRoom(options), 'coop');
      const player = world.players[1];
      if (player !== undefined) {
        player.alive = false;
        player.hp = 0;
      }
      return world;
    }
    case 'paused': {
      const world = createWorld(resolveRoom(options), resolveMode(options));
      world.state = 'paused';
      return world;
    }
    case 'cleared': {
      const world = createWorld(0, resolveMode(options));
      for (const enemy of world.enemies) {
        enemy.alive = false;
      }
      evaluateOutcome(world);
      return world;
    }
    case 'defeat': {
      const world = createWorld(0, resolveMode(options));
      for (const player of world.players) {
        player.alive = false;
        player.hp = 0;
      }
      evaluateOutcome(world);
      return world;
    }
    case 'completed': {
      const world = createWorld(MAPS.length - 1, 'coop');
      for (const enemy of world.enemies) {
        enemy.alive = false;
      }
      evaluateOutcome(world);
      return world;
    }
    case 'error':
      return createEmptyWorld('coop');
  }
}

function neutralCommand(): Command {
  return { x: 0, y: 0, turn: 0, fire: false };
}

function normalizeCommand(command: Command | undefined): Command {
  if (command === undefined) {
    return neutralCommand();
  }

  const { x, y, turn, fire, aim } = command;
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(turn)) {
    throw new Error('Command x, y, and turn must be finite numbers.');
  }
  if (typeof fire !== 'boolean') {
    throw new Error('Command fire must be a boolean.');
  }
  if (aim !== undefined && !Number.isFinite(aim)) {
    throw new Error('Command aim must be a finite number when present.');
  }

  return aim === undefined ? { x, y, turn, fire } : { x, y, turn, fire, aim };
}

export function createTestBridge(host: TestBridgeHost): ToyboxTestBridge {
  const bridge: ToyboxTestBridge = {
    loadScenario(name, options = {}): TestSnapshot {
      if (name === 'error') {
        host.showError(ERROR_MESSAGE);
        host.takeClock();
        return snapshotWorld(host.getWorld());
      }

      const world = scenarioWorld(name, options);
      host.replaceWorld(world);
      host.takeClock();
      return snapshotWorld(host.getWorld());
    },

    advanceTicks(count, options = {}): TestSnapshot {
      if (!Number.isInteger(count) || count < 0 || count > 100_000) {
        throw new Error('advanceTicks count must be an integer from 0 to 100000.');
      }
      if (options.commands !== undefined && options.sampleInput === true) {
        throw new Error('advanceTicks accepts either commands or sampleInput, not both.');
      }

      host.takeClock();
      const world = host.getWorld();

      for (let tick = 0; tick < count; tick += 1) {
        const source =
          options.sampleInput === true ? host.readCommands() : (options.commands ?? []);
        const commands = Array.from({ length: world.players.length }, (_, index) =>
          normalizeCommand(source[index]),
        );
        stepWorld(world, CONFIG.fixedStep, commands);
      }

      host.sync();
      return snapshotWorld(world);
    },

    snapshot(): TestSnapshot {
      return snapshotWorld(host.getWorld());
    },

    events(): readonly string[] {
      return [...host.getWorld().events];
    },

    render(): void {
      host.render();
    },

    clearInput(): void {
      host.clearInput();
    },
  };

  return bridge;
}

export function installTestBridge(host: TestBridgeHost): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.__TOYBOX_TEST__ = createTestBridge(host);
}
