// Shared narrow browser-side types for the test-only bridge. The runtime API
// lives in src/test-bridge.ts; tests keep their own structural view.
export interface BridgeSnapshot {
  readonly room: number;
  readonly mode: string;
  readonly state: string;
  readonly time: number;
  readonly ticks: number;
  readonly shots: number;
  readonly players: readonly {
    readonly id: string;
    readonly x: number;
    readonly y: number;
    readonly angle: number;
    readonly alive: boolean;
    readonly hp: number;
  }[];
  readonly enemies: readonly { readonly id: string; readonly alive: boolean }[];
  readonly shells: readonly { readonly owner: string }[];
  readonly effects: readonly { readonly type: string }[];
  readonly events: readonly string[];
}

export interface Bridge {
  loadScenario(name: string, options?: { room?: number; mode?: string }): BridgeSnapshot;
  advanceTicks(
    count: number,
    options?: {
      commands?: readonly {
        readonly x: number;
        readonly y: number;
        readonly turn: number;
        readonly fire: boolean;
        readonly aim?: number;
      }[];
      sampleInput?: boolean;
    },
  ): BridgeSnapshot;
  snapshot(): BridgeSnapshot;
  events(): readonly string[];
  render(): void;
  clearInput(): void;
}

declare global {
  interface Window {
    __TOYBOX_TEST__?: Bridge;
  }
}
