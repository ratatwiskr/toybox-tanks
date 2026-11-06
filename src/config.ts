// Immutable gameplay defaults carried over from the supplied prototype.
// Speeds are logical pixels per second; angles are radians.
export const CONFIG = {
  width: 960,
  height: 540,
  tile: 40,
  gridY: 10,
  columns: 24,
  rows: 13,
  fixedStep: 1 / 120,
  maxFrameTime: 0.1,
  maxSteps: 16,
  playerSpeed: 185,
  turretRotationSpeed: 2.8,
  shellSpeed: 330,
  firingCooldown: 0.28,
  activeShellLimit: 3,
  enemyFiringInterval: 2.7,
  playerHealth: 2,
  postHitInvulnerability: 1.25,
  tankRadius: 15,
  shellRadius: 3,
  enemyShellSpeedFactor: 0.72,
  enemyTurnSpeed: 1.9,
  enemyTelegraph: 0.5,
  stickDeadzone: 0.22,
  maxProjectileContacts: 4,
  separationEpsilon: 0.025,
} as const;

export type GameConfig = typeof CONFIG;
