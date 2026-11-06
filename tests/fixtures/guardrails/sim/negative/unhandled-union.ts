// Negative guardrail fixture: a union switch must handle every variant, even with
// a default branch.
export type Light = 'red' | 'green';

export function next(light: Light): Light {
  switch (light) {
    case 'red':
      return 'green';
    default:
      return 'red';
  }
}
