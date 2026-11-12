import { CONFIG } from '../config';
import { bodyHeading } from '../presentation/body-heading';
import { firstTerrain, isSolidCork, reflect } from '../sim/collision';
import type { Cork, Effect, Shell, Tank, Wall, World } from '../sim/types';

// Rendering only needs this narrow slice of the Canvas API. Keeping the surface
// explicit lets unit tests prove rendering is read-only without a DOM.
export type RenderContext = Pick<
  CanvasRenderingContext2D,
  | 'globalAlpha'
  | 'fillStyle'
  | 'strokeStyle'
  | 'lineWidth'
  | 'font'
  | 'textAlign'
  | 'save'
  | 'restore'
  | 'beginPath'
  | 'closePath'
  | 'fill'
  | 'stroke'
  | 'fillRect'
  | 'strokeRect'
  | 'clearRect'
  | 'moveTo'
  | 'lineTo'
  | 'bezierCurveTo'
  | 'arc'
  | 'ellipse'
  | 'roundRect'
  | 'translate'
  | 'rotate'
  | 'setTransform'
  | 'setLineDash'
  | 'createPattern'
  | 'fillText'
>;

export interface RenderCanvas {
  width: number;
  height: number;
  getContext(contextId: '2d'): RenderContext | null;
  getBoundingClientRect(): { readonly width: number; readonly height: number };
}

export interface Renderer {
  resize(): void;
  render(world: World, debug?: boolean): void;
  /** Creates the world-anchored floor pattern; false keeps the procedural floor. */
  setFloorPattern(image: CanvasImageSource): boolean;
}

export function createRenderer(canvas: RenderCanvas): Renderer {
  const context = canvas.getContext('2d');
  if (context === null) {
    throw new Error('Canvas 2D context is unavailable');
  }

  const ctx = context;
  let scaleX = 1;
  let scaleY = 1;
  let floorPattern: CanvasPattern | null = null;

  const rounded = (
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    fill?: string,
    stroke?: string,
  ): void => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    if (fill !== undefined) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke !== undefined) {
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
  };

  const drawFloor = (world: World): void => {
    if (floorPattern !== null) {
      ctx.save();
      ctx.fillStyle = floorPattern;
      ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
      ctx.restore();
    } else {
      ctx.fillStyle = '#e6d3ac';
      ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

      for (let y = 0; y < CONFIG.height; y += 45) {
        ctx.fillStyle = (y / 45) % 2 ? '#e4cea5' : '#ead8b6';
        ctx.fillRect(0, y, CONFIG.width, 44);
        ctx.strokeStyle = '#c3a16d25';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(CONFIG.width, y + 0.5);
        ctx.stroke();
      }

      ctx.strokeStyle = '#ab89552c';
      ctx.lineWidth = 0.7;
      for (let i = 0; i < 38; i += 1) {
        const x = (i * 151 + 37) % CONFIG.width;
        const y = (i * 83 + 19) % CONFIG.height;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(x + 20, y - 3, x + 50, y + 4, x + 85, y);
        ctx.stroke();
      }
    }

    for (const player of world.players) {
      ctx.strokeStyle = player.id === 'p1' ? '#297fa43b' : '#be6b303b';
      ctx.setLineDash([3, 5]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(player.spawnX, player.spawnY, 23, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  };

  const drawWall = (wall: Wall): void => {
    rounded(wall.x + 2, wall.y + 5, 37, 37, 5, '#6548262a');
    rounded(wall.x + 1, wall.y + 1, 38, 37, 5, '#b88650', '#9a6d3c');
    rounded(wall.x + 3, wall.y + 2, 34, 31, 4, '#d4aa70');
    ctx.strokeStyle = '#eccb92';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(wall.x + 7, wall.y + 5);
    ctx.lineTo(wall.x + 32, wall.y + 5);
    ctx.stroke();

    ctx.strokeStyle = '#b4864e66';
    ctx.lineWidth = 0.8;
    for (let j = 0; j < 3; j += 1) {
      const y = wall.y + 12 + j * 7;
      ctx.beginPath();
      ctx.moveTo(wall.x + 6, y);
      ctx.bezierCurveTo(wall.x + 15, y - 3, wall.x + 23, y + 3, wall.x + 33, y - 1);
      ctx.stroke();
    }

    ctx.fillStyle = '#aa7b4955';
    ctx.beginPath();
    ctx.ellipse(wall.x + 25, wall.y + 22, 4, 2, 0, 0, 7);
    ctx.fill();
  };

  const drawCork = (cork: Cork): void => {
    const damage = cork.hitsRemaining >= 3 ? 0 : cork.hitsRemaining === 2 ? 1 : 2;

    // Cork outlines must not inherit the previous tile's crack stroke width.
    ctx.lineWidth = 1;
    rounded(cork.x + 2, cork.y + 5, 37, 37, 5, '#826c472a');
    rounded(cork.x + 1, cork.y + 1, 38, 37, 5, '#bea374', '#826c47');
    rounded(cork.x + 3, cork.y + 2, 34, 31, 4, undefined, '#e2cca0');

    ctx.strokeStyle = '#a8845580';
    ctx.lineWidth = 1.3;
    for (let index = 0; index < 3; index += 1) {
      const y = cork.y + 12 + index * 7;
      ctx.beginPath();
      ctx.moveTo(cork.x + 8, y);
      ctx.lineTo(cork.x + 32, y);
      ctx.stroke();
    }

    // Damage paths use tile-local 0..1 coordinates so they scale with the cork
    // cell. Values stay at least half the crack stroke inside the 38x37 face.
    const tilePoint = (x: number, y: number): readonly [number, number] => [
      cork.x + x * cork.w,
      cork.y + y * cork.h,
    ];

    const trace = (points: readonly (readonly [number, number])[]): void => {
      const first = points[0];
      if (first === undefined) {
        return;
      }
      ctx.beginPath();
      const start = tilePoint(first[0], first[1]);
      ctx.moveTo(start[0], start[1]);
      for (let index = 1; index < points.length; index += 1) {
        const point = points[index];
        if (point === undefined) {
          continue;
        }
        const [x, y] = tilePoint(point[0], point[1]);
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    const fillChip = (points: readonly (readonly [number, number])[]): void => {
      const first = points[0];
      if (first === undefined) {
        return;
      }
      ctx.beginPath();
      const start = tilePoint(first[0], first[1]);
      ctx.moveTo(start[0], start[1]);
      for (let index = 1; index < points.length; index += 1) {
        const point = points[index];
        if (point === undefined) {
          continue;
        }
        const [x, y] = tilePoint(point[0], point[1]);
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    };

    if (damage >= 1) {
      ctx.strokeStyle = '#705a40';
      ctx.lineWidth = 3;
      trace([
        [0.74, 0.28],
        [0.86, 0.54],
        [0.68, 0.68],
        [0.8, 0.84],
        [0.72, 0.88],
      ]);
      trace([
        [0.86, 0.54],
        [0.92, 0.34],
      ]);
      trace([
        [0.68, 0.68],
        [0.42, 0.74],
      ]);
    }

    if (damage >= 2) {
      trace([
        [0.9, 0.26],
        [0.82, 0.52],
        [0.9, 0.68],
        [0.78, 0.82],
        [0.88, 0.88],
      ]);
      trace([
        [0.22, 0.64],
        [0.44, 0.76],
        [0.34, 0.86],
      ]);
      trace([
        [0.9, 0.24],
        [0.86, 0.4],
        [0.92, 0.48],
      ]);

      ctx.fillStyle = '#a2875e';
      fillChip([
        [0.4, 0.74],
        [0.54, 0.8],
        [0.44, 0.86],
      ]);
      fillChip([
        [0.74, 0.58],
        [0.86, 0.62],
        [0.78, 0.72],
      ]);
    }
  };

  const drawAim = (world: World, player: Tank): void => {
    if (!player.alive) {
      return;
    }

    const dx = Math.cos(player.angle);
    const dy = Math.sin(player.angle);
    const hit = firstTerrain(world, player.x, player.y, dx * 350, dy * 350);
    const length = hit === null ? 110 : 350 * hit.t;

    ctx.strokeStyle = player.id === 'p1' ? '#17688980' : '#ae572980';
    ctx.lineWidth = 1.25;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(player.x + dx * 27, player.y + dy * 27);
    ctx.lineTo(player.x + dx * length, player.y + dy * length);
    ctx.stroke();

    if (hit !== null && hit.kind === 'wall' && !hit.ambiguous) {
      const reflected = reflect(dx, dy, hit.nx, hit.ny);
      const x = player.x + dx * length + hit.nx * 0.05;
      const y = player.y + dy * length + hit.ny * 0.05;
      const second = firstTerrain(world, x, y, reflected.x * 130, reflected.y * 130);
      const secondLength = second === null ? 130 : 130 * second.t;

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + reflected.x * secondLength, y + reflected.y * secondLength);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.setLineDash([]);
  };

  const drawTank = (tank: Tank, world: World): void => {
    if (!tank.alive && tank.faction === 'enemy') {
      return;
    }

    const isPlayer = tank.faction === 'player';
    const blue = tank.id === 'p1';
    const main = isPlayer ? (blue ? '#378ebb' : '#ed9c40') : '#b86280';
    const dark = isPlayer ? (blue ? '#226080' : '#9d5e27') : '#78384e';
    const light = isPlayer ? (blue ? '#8bd5ec' : '#ffd18b') : '#e4a2b9';

    // The body art points up, while the heading is a direction angle (0 = east).
    // Body and turret use separate absolute angles around the same pivot.
    const bodyAngle = bodyHeading(tank) + Math.PI / 2;

    ctx.save();
    ctx.translate(tank.x, tank.y);

    if (!tank.alive) {
      ctx.globalAlpha = 0.8;
      ctx.save();
      ctx.rotate(bodyAngle);
      rounded(-17, -13, 34, 30, 7, '#9a8e79');
      rounded(-12, -12, 24, 24, 5, '#b1a38b', '#7e7769');
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#665f50';
      ctx.beginPath();
      ctx.moveTo(-6, -6);
      ctx.lineTo(6, 6);
      ctx.moveTo(6, -6);
      ctx.lineTo(-6, 6);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = '#514e46';
      ctx.font = 'bold 9px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`${tank.id.toUpperCase()} OUT`, 0, 29);
      ctx.restore();
      return;
    }

    if (tank.invuln > 0) {
      ctx.globalAlpha = 0.58 + 0.42 * Math.abs(Math.sin(world.time * 20));
      ctx.strokeStyle = '#fff9dd';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.arc(0, 0, 21, 0, 7);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // The shadow keeps its world-space offset while its footprint turns.
    ctx.save();
    ctx.translate(0, 6);
    ctx.rotate(bodyAngle);
    rounded(-17, -13, 34, 27, 7, '#53422830');
    ctx.restore();

    ctx.save();
    ctx.rotate(bodyAngle);
    rounded(-17, -13, 9, 27, 4, '#454e50');
    rounded(8, -13, 9, 27, 4, '#454e50');
    ctx.strokeStyle = '#87918a';
    ctx.lineWidth = 1.5;
    for (let j = -9; j < 12; j += 5) {
      const offset = tank.track % 5;
      ctx.beginPath();
      ctx.moveTo(-15, j + offset - 2);
      ctx.lineTo(-10, j + offset - 2);
      ctx.moveTo(10, j + offset - 2);
      ctx.lineTo(15, j + offset - 2);
      ctx.stroke();
    }

    if (isPlayer) {
      rounded(-12, -14, 24, 28, 6, main, dark);
    } else {
      ctx.fillStyle = main;
      ctx.strokeStyle = dark;
      ctx.beginPath();
      ctx.moveTo(0, -17);
      ctx.lineTo(14, -5);
      ctx.lineTo(12, 13);
      ctx.lineTo(-12, 13);
      ctx.lineTo(-14, -5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.strokeStyle = light;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-7, -10);
    ctx.lineTo(7, -10);
    ctx.stroke();

    ctx.fillStyle = dark;
    if (isPlayer && blue) {
      ctx.beginPath();
      ctx.arc(-7, 8, 2.5, 0, 7);
      ctx.fill();
    } else {
      ctx.fillRect(-9, 6, 5, 5);
    }
    ctx.restore();

    ctx.save();
    ctx.rotate(tank.angle);
    rounded(2, -4.5, 21, 9, 3, dark);
    rounded(7, -3, 17, 6, 2, main);
    rounded(20, -5, 5, 10, 2, dark);
    ctx.fillStyle = '#fff4c4';
    ctx.fillRect(23, -2, 2, 4);

    if (tank.charge > 0) {
      const charge = tank.charge / CONFIG.enemyTelegraph;
      ctx.fillStyle = `rgba(255, 238, 138, ${String(0.35 + charge * 0.65)})`;
      ctx.beginPath();
      ctx.arc(25, 0, 5 + charge * 7, 0, 7);
      ctx.fill();
      ctx.strokeStyle = '#fff0ad';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 19 + charge * 3, 0, 7);
      ctx.stroke();
    }

    ctx.restore();

    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, 7);
    ctx.fill();
    ctx.fillStyle = main;
    ctx.beginPath();
    ctx.arc(0, -1, 8, 0, 7);
    ctx.fill();

    ctx.save();
    ctx.rotate(tank.angle);
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(2, -3);
    ctx.lineTo(2, 3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = isPlayer ? '#263d46' : '#633748';
    ctx.font = '800 9px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(isPlayer ? tank.id.toUpperCase() : 'S', 0, -23);
    ctx.restore();
  };

  const drawShell = (shell: Shell): void => {
    ctx.save();
    ctx.translate(shell.x, shell.y);
    ctx.rotate(Math.atan2(shell.vy, shell.vx));
    ctx.strokeStyle = shell.faction === 'enemy' ? '#7a274e' : '#6d5c2d';
    ctx.lineWidth = 1;
    ctx.fillStyle = shell.faction === 'enemy' ? '#f589ac' : '#fff5b1';
    rounded(-5, -3, 10, 6, 3, ctx.fillStyle, ctx.strokeStyle);
    ctx.fillStyle = '#ffffffb0';
    ctx.fillRect(-1, -1, 3, 1.5);
    if (shell.bounces > 0) {
      ctx.strokeStyle = '#fff';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, 7);
      ctx.stroke();
    }
    ctx.restore();
  };

  const drawEffect = (effect: Effect): void => {
    const progress = effect.age / effect.life;
    ctx.save();
    ctx.globalAlpha = 1 - progress;

    if (effect.type === 'spark') {
      ctx.strokeStyle = '#fff6b7';
      ctx.lineWidth = 2;
      for (let index = 0; index < 5; index += 1) {
        const angle = index * 1.256 + effect.seed;
        const radius = 3 + progress * 12;
        ctx.beginPath();
        ctx.moveTo(
          effect.x + Math.cos(angle) * radius * 0.4,
          effect.y + Math.sin(angle) * radius * 0.4,
        );
        ctx.lineTo(effect.x + Math.cos(angle) * radius, effect.y + Math.sin(angle) * radius);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = '#fff6df';
      for (let index = 0; index < 6; index += 1) {
        const angle = (index * Math.PI) / 3 + effect.seed;
        ctx.beginPath();
        ctx.arc(
          effect.x + Math.cos(angle) * progress * 22,
          effect.y + Math.sin(angle) * progress * 22,
          3 + (1 - progress) * 5,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }

    ctx.restore();
  };

  const drawGeometry = (world: World): void => {
    ctx.save();
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = '#00eac177';
    for (const wall of world.walls) {
      ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);
    }
    for (const cork of world.corks) {
      if (isSolidCork(cork)) {
        ctx.strokeRect(cork.x, cork.y, cork.w, cork.h);
      }
    }
    for (const tank of [...world.players, ...world.enemies]) {
      ctx.strokeStyle = tank.alive ? '#003eff' : '#777';
      ctx.beginPath();
      ctx.arc(tank.x, tank.y, tank.r, 0, 7);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(tank.x, tank.y);
      ctx.lineTo(tank.x + Math.cos(tank.angle) * 27, tank.y + Math.sin(tank.angle) * 27);
      ctx.stroke();
    }
    ctx.strokeStyle = '#f000ee';
    for (const shell of world.shells) {
      ctx.beginPath();
      ctx.arc(shell.x, shell.y, CONFIG.shellRadius, 0, 7);
      ctx.stroke();
    }
    ctx.restore();
  };

  return {
    resize(): void {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      scaleX = width / CONFIG.width;
      scaleY = height / CONFIG.height;
    },

    setFloorPattern(image: CanvasImageSource): boolean {
      const pattern = ctx.createPattern(image, 'repeat');
      if (pattern === null) {
        return false;
      }
      floorPattern = pattern;
      return true;
    },

    render(world: World, debug = false): void {
      ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
      ctx.clearRect(0, 0, CONFIG.width, CONFIG.height);
      drawFloor(world);

      for (const player of world.players) {
        drawAim(world, player);
      }
      for (const wall of world.walls) {
        drawWall(wall);
      }
      for (const cork of world.corks) {
        if (isSolidCork(cork)) {
          drawCork(cork);
        }
      }
      for (const enemy of world.enemies) {
        drawTank(enemy, world);
      }
      for (const player of world.players) {
        drawTank(player, world);
      }
      for (const shell of world.shells) {
        drawShell(shell);
      }
      for (const effect of world.effects) {
        drawEffect(effect);
      }
      if (debug) {
        drawGeometry(world);
      }
    },
  };
}
