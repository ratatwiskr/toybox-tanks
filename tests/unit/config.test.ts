import { describe, expect, it } from 'vitest';

import { CONFIG } from '../../src/config';

describe('gameplay configuration', () => {
  it('preserves the prototype logical arena and fixed-step defaults', () => {
    expect(CONFIG.width).toBe(960);
    expect(CONFIG.height).toBe(540);
    expect(CONFIG.tile).toBe(40);
    expect(CONFIG.gridY).toBe(10);
    expect(CONFIG.columns).toBe(24);
    expect(CONFIG.rows).toBe(13);
    expect(CONFIG.fixedStep).toBeCloseTo(1 / 120, 12);
    expect(CONFIG.maxFrameTime).toBe(0.1);
    expect(CONFIG.maxSteps).toBe(16);
  });

  it('preserves the prototype combat and movement defaults', () => {
    expect(CONFIG.playerSpeed).toBe(185);
    expect(CONFIG.turretRotationSpeed).toBe(2.8);
    expect(CONFIG.shellSpeed).toBe(330);
    expect(CONFIG.firingCooldown).toBe(0.28);
    expect(CONFIG.activeShellLimit).toBe(3);
    expect(CONFIG.enemyFiringInterval).toBe(2.7);
    expect(CONFIG.playerHealth).toBe(2);
    expect(CONFIG.postHitInvulnerability).toBe(1.25);
    expect(CONFIG.tankRadius).toBe(15);
    expect(CONFIG.shellRadius).toBe(3);
    expect(CONFIG.enemyShellSpeedFactor).toBe(0.72);
    expect(CONFIG.enemyTurnSpeed).toBe(1.9);
    expect(CONFIG.enemyTelegraph).toBe(0.5);
    expect(CONFIG.stickDeadzone).toBe(0.22);
    expect(CONFIG.maxProjectileContacts).toBe(4);
    expect(CONFIG.separationEpsilon).toBe(0.025);
  });
});
