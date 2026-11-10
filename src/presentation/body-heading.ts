import { CONFIG } from '../config';
import type { Command, SimulationEvent, Tank, World } from '../sim/types';
import { stepWorld } from '../sim/world';

// Body heading is presentation state. It is never read by the simulation and is
// keyed by tank object, so every new World starts facing up even when tank IDs
// such as "p1" are reused. Stationary sentries are never updated and keep it.
export const INITIAL_BODY_HEADING = -Math.PI / 2;

// A fixed step moves a full-speed tank by playerSpeed * fixedStep (about 1.5 px).
// Anything below a tenth of that is contact jitter (separation pushes are far
// smaller) or a fully blocked move, not a deliberate change of direction.
export const MIN_BODY_TURN_DISTANCE = CONFIG.playerSpeed * CONFIG.fixedStep * 0.1;

const headings = new WeakMap<Tank, number>();

export function bodyHeading(tank: Tank): number {
  return headings.get(tank) ?? INITIAL_BODY_HEADING;
}

export function updateBodyHeading(tank: Tank, dx: number, dy: number): void {
  if (Math.hypot(dx, dy) >= MIN_BODY_TURN_DISTANCE) {
    headings.set(tank, Math.atan2(dy, dx));
  }
}

// Single path for real-time play and manual test stepping: advance the
// simulation, derive each player's heading from the distance actually
// travelled during that fixed step, and return that step's structured events.
export function advanceWorld(
  world: World,
  dt: number,
  commands: readonly Command[] = [],
): SimulationEvent[] {
  const before = world.players.map((player) => ({ x: player.x, y: player.y }));

  const events = stepWorld(world, dt, commands);

  for (const [index, player] of world.players.entries()) {
    const start = before[index];
    if (start !== undefined) {
      updateBodyHeading(player, player.x - start.x, player.y - start.y);
    }
  }

  return events;
}
