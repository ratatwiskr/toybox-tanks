// Negative guardrail fixture: sim code must not erase types with `any`.
export function acceptsAnything(_value: any): number {
  return 0;
}
