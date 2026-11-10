import { CONFIG } from '../config';
import type { Shell } from './types';

// Return the first contact fraction of this step, never a time in seconds.
export function firstShellContact(a: Shell, b: Shell, dt: number): number | null {
  if (!Number.isFinite(dt) || dt <= 0) {
    return null;
  }

  const x = b.x - a.x;
  const y = b.y - a.y;
  const dx = (b.vx - a.vx) * dt;
  const dy = (b.vy - a.vy) * dt;
  const radius = CONFIG.shellRadius * 2;
  const c = x * x + y * y - radius * radius;
  if (c <= 0) {
    return 0;
  }

  const lengthSquared = dx * dx + dy * dy;
  const dot = x * dx + y * dy;
  if (lengthSquared === 0 || dot >= 0) {
    return null;
  }

  const discriminant = dot * dot - lengthSquared * c;
  if (discriminant < 0) {
    return null;
  }

  // This equivalent form avoids cancellation for near-immediate contacts.
  const t = c / (-dot + Math.sqrt(discriminant));
  return t >= 0 && t <= 1 ? t : null;
}
