# Toybox Tanks — Technical & Visual Redesign Specification

**Design DNA:** *Wii Play Tanks* (strict active shell caps, bank-shot geometry, shell-vs-shell interception, tile-center pathing) + *Battle City* (destructible cover, lane defense) + *Advance Wars* (clear role silhouettes, indirect mortar deadzones, unit weight) + *Worms / Metal Slug* (volatile Pogo Mines, cartoon blast clouds, permanent floor scorch decals, comedic friendly-fire knockback).

---

## 1. Viewport, Camera & Responsive Mobile Framing

### 1.1 Viewport & DPR Scaling
* **Eliminate Heavy Browser Borders:** Render the game inside a seamless corkboard tabletop background (`#c59563` with subtle grain) and a soft inset tabletop vignette (`box-shadow: inset 0 0 45px rgba(45, 23, 8, 0.45)`).
* **Cap Device Pixel Ratio (DPR):** On desktop Retina/4K displays, clamp canvas backing store resolution to `Math.min(window.devicePixelRatio || 1, 2)` to avoid sub-pixel browser scaling lag while preserving crisp vector/SVG rendering.
* **Mobile Zoom & Arena Aspect:**
  * Desktop Standard Grid: `17 × 11` tiles (outer rim = indestructible birch border blocks, playable interior = `15 × 9`).
  * Mobile Compact Grid (or Zoomed Framing): `15 × 9` tiles (playable interior = `13 × 7`), scaled up to fill ~88% of viewport height so tank silhouettes remain ≥36px tall and readable between touch pads.

---

## 2. Core Combat Pacing & *Wii Play Tanks* Rules

### 2.1 Movement & Projectile Constants (Normalized to `T = tileSize`)
| Parameter | Value | Notes |
| :--- | :--- | :--- |
| **Player Tank Speed** | `3.2 * T / sec` | ~4.5s to cross arena; deliberate & readable |
| **Tank Collision Radius** | `0.38 * T` | Leaves `0.24 * T` clearance in `1.0 * T` corridors |
| **Player Active Shell Cap** | `4` live shells | Hard cap per player; `0.22s` min tap delay |
| **Standard Shell Speed** | `6.5 * T / sec` | `~2.0x` player speed; `1` wall ricochet |
| **Sniper Rocket Speed** | `11.0 * T / sec` | `~3.4x` player speed; `0` bounces, high-contrast trail |
| **Mortar Shell Flight Time** | `1.15s` fixed arc | Ignores walls; unshootable mid-air; `3.0 * T` min range |
| **Shell-vs-Shell Interception** | Enabled | Direct shells & rockets destroy each other on contact with spark burst |

### 2.2 Friendly Fire & Collision Rules
* **Friendly Fire ON:**
  * Direct shell/rocket hits deal full `1 HP` damage to co-op partners.
  * Explosive splash edges (`> 0.65 * blastRadius`) from **Pogo Mines** and **Mortars** deal `0 HP` (or shield chip) + strong **2.2-tile knockback impulse** + `0.35s` dizzy spin, turning accidental friendly blasts into dramatic recovery moments.
* **Tank-to-Tank Collisions (Zero Passive Contact Damage):**
  * Tanks never deal damage simply by touching.
  * **Circle-vs-Circle Impulse:** Resolve overlap smoothly along the collision normal.
  * **Co-Op Rescue Bump:** P1 can physically ram P2 to shove P2 out of a Mortar target reticle or Pogo Mine radius.
  * **Weight Classes (*Advance Wars*):** Heavy hulls push Light hulls (`Mortar` / `Sapper`) backward by `0.35 * T` and reset their aim wind-up by `0.3s`.
  * **Wall-Slam Crunch:** If an explosion blasts a tank at high velocity (`> 8 * T / sec`) directly into a solid wall, apply `1 HP` impact crunch + star particles.

---

## 3. Physics & AI Implementation (Drop-In Reference Code)

### 3.1 Circle-vs-Tile AABB Corner-Sliding Collision
Prevents tanks and AI from snagging on flat wooden block corners in `1-tile` corridors:

```javascript
/**
 * Resolves smooth circle-vs-tile sliding collision against a 2D tile grid.
 * @param {Object} entity - { x, y, radius } in world pixels
 * @param {Array<Array<number>>} grid - 2D array where > 0 is solid block
 * @param {number} tileSize - Width/height of one tile in pixels
 */
export function resolveGridCircleCollision(entity, grid, tileSize) {
  const minCol = Math.max(0, Math.floor((entity.x - entity.radius) / tileSize));
  const maxCol = Math.min(grid[0].length - 1, Math.floor((entity.x + entity.radius) / tileSize));
  const minRow = Math.max(0, Math.floor((entity.y - entity.radius) / tileSize));
  const maxRow = Math.min(grid.length - 1, Math.floor((entity.y + entity.radius) / tileSize));

  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      if (grid[r][c] <= 0) continue; // 0 = empty floor

      const rectLeft = c * tileSize;
      const rectTop = r * tileSize;
      const rectRight = rectLeft + tileSize;
      const rectBottom = rectTop + tileSize;

      // Closest point on tile AABB to circle center
      const closestX = Math.max(rectLeft, Math.min(entity.x, rectRight));
      const closestY = Math.max(rectTop, Math.min(entity.y, rectBottom));

      const dx = entity.x - closestX;
      const dy = entity.y - closestY;
      const distSq = dx * dx + dy * dy;

      if (distSq < entity.radius * entity.radius) {
        const dist = Math.sqrt(distSq);
        if (dist > 0.0001) {
          const overlap = entity.radius - dist;
          entity.x += (dx / dist) * overlap;
          entity.y += (dy / dist) * overlap;
        } else {
          // Fallback if center is inside tile
          entity.y -= entity.radius;
        }
      }
    }
  }
}
```

### 3.2 Tile-Center Waypoint AI Navigation
Eliminates AI corner-wedging by steering between open tile centers:

```javascript
/**
 * Updates AI tank movement using tile-center waypoints so tanks never wedge on corners.
 */
export function updateTankWaypointAI(tank, grid, tileSize, dt) {
  const col = Math.floor(tank.x / tileSize);
  const row = Math.floor(tank.y / tileSize);

  if (!tank.waypoint) {
    tank.waypoint = pickNextOpenTileCenter(col, row, grid, tileSize, tank.lastDir);
  }

  if (tank.waypoint) {
    const dx = tank.waypoint.x - tank.x;
    const dy = tank.waypoint.y - tank.y;
    const dist = Math.hypot(dx, dy);

    if (dist < tileSize * 0.12) {
      // Snap gently & pick next tile center
      tank.waypoint = pickNextOpenTileCenter(col, row, grid, tileSize, tank.lastDir);
    } else {
      const moveAngle = Math.atan2(dy, dx);
      tank.hullAngle = moveAngle;
      tank.x += Math.cos(moveAngle) * tank.speed * dt;
      tank.y += Math.sin(moveAngle) * tank.speed * dt;
    }
  }
}

function pickNextOpenTileCenter(col, row, grid, tileSize, lastDir) {
  const dirs = [
    { dc: 1, dr: 0 }, { dc: -1, dr: 0 },
    { dc: 0, dr: 1 }, { dc: 0, dr: -1 }
  ];
  const valid = dirs.filter(d => {
    const nc = col + d.dc;
    const nr = row + d.dr;
    return grid[nr] && grid[nr][nc] === 0;
  });

  if (valid.length === 0) return null;
  // Prefer continuing forward or perpendicular rather than immediate 180 U-turn
  const nonReverse = valid.filter(d => !lastDir || (d.dc !== -lastDir.dc || d.dr !== -lastDir.dr));
  const pool = nonReverse.length > 0 ? nonReverse : valid;
  const chosen = pool[Math.floor(Math.random() * pool.length)];

  return {
    x: (col + chosen.dc + 0.5) * tileSize,
    y: (row + chosen.dr + 0.5) * tileSize,
    dir: chosen
  };
}
```

---

## 4. Weapon & Trap State Machines

### 4.1 Pogo Mine (Volatile Spring-Loaded Trap)
* **States:**
  1. `ARMED`: Sits on floorboards with a subtle pulsing red ring (`radius = 1.15 * T`).
  2. `TRIGGERED_HOP`: Activated when a tank enters `1.15 * T` OR when hit by any shell.
     * If shot by a shell, applies a sliding velocity (`5.5 * T / sec`) away from the bullet direction so players can **punt mines** into enemies!
     * Compresses for `0.10s`, then launches vertically (`zOffset` arc up to `1.4 * T`, sprite scales to `1.55x`) for **`0.45s`** with rapid red/white strobe flash and whistling fuse SFX.
  3. `DETONATE`:
     * Blast radius: `1.85 * T`.
     * Destroys adjacent soft cork/crate blocks (`tileType === 2`).
     * Chain-triggers any other `ARMED` Pogo Mines within `2.0 * T`.
     * Deals `1 HP` within `0.9 * T`; deals `0 HP` + heavy knockback (`2.4 * T` impulse) between `0.9 * T` and `1.85 * T`.
     * Stamps a permanent dark charcoal blast decal on the floor layer.

### 4.2 Mortar / Indirect Artillery (*Advance Wars* Style)
* **Enemy Unit Rules:**
  * Minimum range (deadzone): `3.0 * T`. Maximum range: `9.5 * T`.
  * Fires max `1` active lobbed shell at a time (`2.8s` reload).
* **Projectile & Telegraph:**
  * Projects a bold `1.6 * T` pulsing floor crosshair at the target point with a radial countdown ring.
  * Shell cannot be shot down mid-air.
  * Visual arc: `scale = 1.0 + 0.85 * Math.sin(Math.PI * t)` while ground shadow stays anchored along linear `(start → target)` path.
  * On impact (`t >= 1.0`): `1-frame` pure white flash → `3-frame` cartoon orange/cream smoke cloud → `1.4 * T` blast radius + permanent floor scorch mark.

---

## 5. Enemy Roster (*Wii Play Tanks* + *Advance Wars* Silhouettes)

1. **Brown Scout:** Slow patrol, pauses `0.4s` before firing. `1` standard shell (`1` bounce).
2. **Grey Skirmisher:** Active tile-center flanker. `2` standard shells (`1` bounce).
3. **Teal Sniper:** Holds corridors, sweeps turret slowly, fires `1` high-speed red-tipped rocket (`0` bounces, `1.7x` speed).
4. **Yellow Sapper:** Fast light unit (`4.2 * T / sec`). Drops up to `2` live **Pogo Mines** at intersections; `1` standard shell.
5. **Olive Mortar:** Heavy stubby turret. Hangs behind cover, lobs **Mortar Shells** over blocks; helpless inside `3.0 * T` deadzone.

---

## 6. Scalable SVG Asset Library (Inline Vector Definitions)

All sprites below use crisp `viewBox="0 0 128 128"` coordinates with bold outlines (`stroke-width="4"`) so they remain razor-sharp at any desktop 4K or mobile zoom scale.

### 6.1 Player Tank (Blue Co-Op Hull + Wind-Up Reload Key)
```svg
<svg id="svg-tank-player-blue" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <!-- Drop Shadow -->
  <ellipse cx="66" cy="70" rx="42" ry="38" fill="rgba(35,20,8,0.28)"/>
  <!-- Wooden Treads -->
  <rect x="20" y="24" width="16" height="80" rx="6" fill="#4a3520" stroke="#24170b" stroke-width="4"/>
  <rect x="92" y="24" width="16" height="80" rx="6" fill="#4a3520" stroke="#24170b" stroke-width="4"/>
  <!-- Tread Grooves -->
  <path d="M22 40h12M22 56h12M22 72h12M22 88h12M94 40h12M94 56h12M94 72h12M94 88h12" stroke="#24170b" stroke-width="3"/>
  <!-- Painted Blue Wooden Hull -->
  <rect x="32" y="30" width="64" height="68" rx="12" fill="#2563eb" stroke="#172554" stroke-width="4"/>
  <rect x="39" y="37" width="50" height="54" rx="8" fill="#3b82f6"/>
  <!-- Diegetic Brass Wind-Up Key (Rotate/Scale X dynamically for reload state) -->
  <g id="windup-key">
    <rect x="59" y="98" width="10" height="12" fill="#d97706" stroke="#451a03" stroke-width="3"/>
    <ellipse cx="64" cy="113" rx="16" ry="5" fill="#fbbf24" stroke="#451a03" stroke-width="3"/>
  </g>
  <!-- Turret Group (Rotate independently around 64,64) -->
  <g id="turret">
    <rect x="57" y="8" width="14" height="44" rx="5" fill="#1d4ed8" stroke="#172554" stroke-width="4"/>
    <rect x="55" y="6" width="18" height="8" rx="3" fill="#60a5fa" stroke="#172554" stroke-width="3"/>
    <circle cx="64" cy="64" r="20" fill="#60a5fa" stroke="#172554" stroke-width="4"/>
    <circle cx="64" cy="64" r="7" fill="#fbbf24" stroke="#451a03" stroke-width="3"/>
  </g>
</svg>
```

### 6.2 Enemy Sniper Tank (Teal High-Velocity Rocket Silhouette)
```svg
<svg id="svg-tank-sniper-teal" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="66" cy="70" rx="42" ry="38" fill="rgba(35,20,8,0.28)"/>
  <rect x="20" y="24" width="16" height="80" rx="6" fill="#3f2e1d" stroke="#1f140a" stroke-width="4"/>
  <rect x="92" y="24" width="16" height="80" rx="6" fill="#3f2e1d" stroke="#1f140a" stroke-width="4"/>
  <!-- Angular Teal Hull -->
  <polygon points="40,28 88,28 96,42 96,86 88,100 40,100 32,86 32,42" fill="#0d9488" stroke="#134e4a" stroke-width="4"/>
  <polygon points="44,35 84,35 89,45 89,83 84,93 44,93 39,83 39,45" fill="#14b8a6"/>
  <!-- Long Sniper Barrel -->
  <g id="turret">
    <rect x="59" y="2" width="10" height="52" rx="3" fill="#0f766e" stroke="#134e4a" stroke-width="4"/>
    <rect x="57" y="2" width="14" height="10" rx="2" fill="#ef4444" stroke="#7f1d1d" stroke-width="3"/>
    <circle cx="64" cy="64" r="18" fill="#2dd4bf" stroke="#134e4a" stroke-width="4"/>
    <circle cx="64" cy="64" r="6" fill="#ef4444" stroke="#7f1d1d" stroke-width="2.5"/>
  </g>
</svg>
```

### 6.3 Enemy Mortar Unit (Olive Indirect Artillery with Stubby Tube)
```svg
<svg id="svg-tank-mortar-olive" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="66" cy="70" rx="44" ry="40" fill="rgba(35,20,8,0.3)"/>
  <rect x="18" y="22" width="18" height="84" rx="6" fill="#3f2e1d" stroke="#1f140a" stroke-width="4"/>
  <rect x="92" y="22" width="18" height="84" rx="6" fill="#3f2e1d" stroke="#1f140a" stroke-width="4"/>
  <!-- Heavy Olive Chassis -->
  <rect x="30" y="28" width="68" height="72" rx="14" fill="#4d7c0f" stroke="#1a2e05" stroke-width="4"/>
  <rect x="38" y="36" width="52" height="56" rx="9" fill="#65a30d"/>
  <!-- Hazard Stripes on Rear -->
  <path d="M42 84h44" stroke="#facc15" stroke-width="6" stroke-dasharray="8 6"/>
  <!-- Wide Mortar Cup Turret -->
  <g id="turret">
    <rect x="51" y="22" width="26" height="34" rx="6" fill="#365314" stroke="#1a2e05" stroke-width="4"/>
    <ellipse cx="64" cy="24" rx="13" ry="6" fill="#1a2e05"/>
    <circle cx="64" cy="66" r="22" fill="#84cc16" stroke="#1a2e05" stroke-width="4"/>
    <circle cx="64" cy="66" r="9" fill="#facc15" stroke="#422006" stroke-width="3"/>
  </g>
</svg>
```

### 6.4 Pogo Mine (Dormant vs. Popped Spring State)
```svg
<svg id="svg-pogo-mine" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <!-- Outer Trigger Zone Ring -->
  <circle cx="64" cy="64" r="56" fill="rgba(239,68,68,0.12)" stroke="#dc2626" stroke-width="3" stroke-dasharray="10 8"/>
  <!-- Coiled Brass Spring Base -->
  <path d="M46 96 L82 88 L46 80 L82 72 L46 64" fill="none" stroke="#d97706" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Canister Body -->
  <rect x="40" y="34" width="48" height="34" rx="8" fill="#facc15" stroke="#451a03" stroke-width="4"/>
  <!-- Hazard Stripes -->
  <path d="M46 51h36" stroke="#dc2626" stroke-width="8" stroke-dasharray="9 7"/>
  <!-- Pop-Top Red Lid -->
  <rect x="36" y="24" width="56" height="12" rx="5" fill="#ef4444" stroke="#451a03" stroke-width="4"/>
  <circle cx="64" cy="20" r="6" fill="#ffffff" stroke="#451a03" stroke-width="3"/>
</svg>
```

### 6.5 Mortar Shell & Target Floor Reticle
```svg
<svg id="svg-mortar-reticle" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <circle cx="64" cy="64" r="52" fill="rgba(220,38,38,0.16)" stroke="#dc2626" stroke-width="4" stroke-dasharray="14 10"/>
  <circle cx="64" cy="64" r="28" fill="none" stroke="#f97316" stroke-width="3"/>
  <path d="M64 6v22M64 100v22M6 64h22M100 64h22" stroke="#dc2626" stroke-width="4" stroke-linecap="round"/>
  <circle cx="64" cy="64" r="6" fill="#dc2626"/>
</svg>

<svg id="svg-mortar-shell" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <!-- Cartoon Metal Slug / Worms Style Stubby Bomb -->
  <polygon points="22,48 42,48 46,58 18,58" fill="#dc2626" stroke="#1f140a" stroke-width="3"/>
  <ellipse cx="32" cy="30" rx="14" ry="20" fill="#374151" stroke="#111827" stroke-width="3.5"/>
  <ellipse cx="32" cy="14" rx="9" ry="7" fill="#f59e0b" stroke="#111827" stroke-width="3"/>
  <circle cx="27" cy="26" r="3" fill="rgba(255,255,255,0.45)"/>
</svg>
```

### 6.6 Cartoon Impact Explosion & Permanent Floor Scorch Decal
```svg
<svg id="svg-cartoon-explosion" viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg">
  <!-- Outer Charcoal Smoke Puffs -->
  <circle cx="48" cy="52" r="28" fill="#4b5563" stroke="#1f2937" stroke-width="4"/>
  <circle cx="112" cy="54" r="26" fill="#4b5563" stroke="#1f2937" stroke-width="4"/>
  <circle cx="52" cy="110" r="26" fill="#4b5563" stroke="#1f2937" stroke-width="4"/>
  <circle cx="110" cy="108" r="28" fill="#4b5563" stroke="#1f2937" stroke-width="4"/>
  <!-- Mid Orange Blast Cloud -->
  <circle cx="80" cy="80" r="46" fill="#f97316" stroke="#7c2d12" stroke-width="4"/>
  <circle cx="58" cy="68" r="24" fill="#fb923c"/>
  <circle cx="102" cy="72" r="22" fill="#fb923c"/>
  <!-- Inner Yellow/White Star Core -->
  <polygon points="80,26 92,62 130,62 99,84 111,120 80,98 49,120 61,84 30,62 68,62" fill="#fef08a" stroke="#ca8a04" stroke-width="3"/>
  <circle cx="80" cy="80" r="18" fill="#ffffff"/>
</svg>

<svg id="svg-floor-scorch" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <g opacity="0.42">
    <circle cx="64" cy="64" r="38" fill="#291d12"/>
    <path d="M64 12 L70 32 M64 116 L58 96 M12 64 L32 58 M116 64 L96 70 M26 26 L42 42 M102 102 L86 86 M102 26 L86 42 M26 102 L42 86" stroke="#291d12" stroke-width="5" stroke-linecap="round"/>
  </g>
</svg>
```