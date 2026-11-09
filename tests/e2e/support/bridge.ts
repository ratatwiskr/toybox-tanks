// Share the canonical test-only contract without importing runtime code.
// src/test-bridge.ts owns the single Window.__TOYBOX_TEST__ declaration.
export type {
  TestSnapshot as BridgeSnapshot,
  ToyboxTestBridge as Bridge,
} from '../../../src/test-bridge';
