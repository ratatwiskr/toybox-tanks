// Negative guardrail fixture: sim code must not read browser globals.
export function viewportWidth(): number {
  return window.innerWidth;
}
