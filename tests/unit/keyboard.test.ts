import { describe, expect, it } from 'vitest';

import { KeyboardAdapter } from '../../src/input/keyboard';

describe('keyboard adapter', () => {
  it('maps P1 G and P2 Slash to the alt command', () => {
    const adapter = new KeyboardAdapter();

    adapter.held.add('KeyG');
    expect(adapter.readCommand(0).alt).toBe(true);
    expect(adapter.readCommand(1).alt).toBe(false);

    adapter.held.clear();
    adapter.held.add('Slash');
    expect(adapter.readCommand(0).alt).toBe(false);
    expect(adapter.readCommand(1).alt).toBe(true);
  });
});
