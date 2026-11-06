// Negative guardrail fixture: sim code must not import environment-specific modules.
import { readFileSync } from 'node:fs';

export function readConfig(): string {
  return readFileSync('config.json', 'utf8');
}
