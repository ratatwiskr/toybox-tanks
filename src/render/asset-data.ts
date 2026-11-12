export type AssetPartRole = 'body' | 'aim' | 'fixed' | 'loaded';

export type AssetPart = {
  role: AssetPartRole;
  svg: string;
};

export type AssetDefinition = {
  label: string;
  viewBox: readonly [number, number, number, number];
  anchor: readonly [number, number];
  parts: readonly AssetPart[];
  muzzle?: readonly [number, number];
  shadow?: readonly [number, number] | null;
};

const TANK_VIEW_BOX = [-64, -64, 128, 128] as const;
const TANK_ANCHOR = [0, 0] as const;
const TANK_MUZZLE = [54, 0] as const;
const TANK_SHADOW = [37, 29] as const;

export const TANK_BLUE: AssetDefinition = {
  label: 'Panzer · Blau',
  viewBox: TANK_VIEW_BOX,
  anchor: TANK_ANCHOR,
  parts: [
    {
      role: 'body',
      svg: '<g stroke="#28333b" stroke-width="2.5" stroke-linejoin="round"><rect x="-38" y="-33" width="72" height="18" rx="6" fill="#303840"/><rect x="-38" y="15" width="72" height="18" rx="6" fill="#303840"/><path d="M-30 -30v12 M-30 18v12" stroke="#69737b" stroke-width="3"/><path d="M-20 -30v12 M-20 18v12" stroke="#69737b" stroke-width="3"/><path d="M-10 -30v12 M-10 18v12" stroke="#69737b" stroke-width="3"/><path d="M0 -30v12 M0 18v12" stroke="#69737b" stroke-width="3"/><path d="M10 -30v12 M10 18v12" stroke="#69737b" stroke-width="3"/><path d="M20 -30v12 M20 18v12" stroke="#69737b" stroke-width="3"/><path d="M30 -30v12 M30 18v12" stroke="#69737b" stroke-width="3"/><rect x="-35" y="-24" width="72" height="48" rx="10" fill="#458fc5"/><path d="M-24 -18H22" stroke="#a1d5ef" stroke-width="4" stroke-linecap="round"/><path d="M-24 18H22" stroke="#2b628d" stroke-width="4" stroke-linecap="round"/><path d="M27 -15v30" stroke="#e0f0f7" stroke-width="6"/><rect x="-26" y="-9" width="12" height="18" rx="2" fill="#2b628d" stroke="none"/><path d="M-23 -5h6 M-23 0h6 M-23 5h6" stroke="#a1d5ef" stroke-width="1.5"/></g>',
    },
    {
      role: 'aim',
      svg: '<g stroke="#28333b" stroke-width="2.5" stroke-linejoin="round"><rect x="10" y="-6" width="40" height="12" rx="3" fill="#2b628d"/><rect x="44" y="-8" width="10" height="16" rx="3" fill="#e0f0f7"/><rect x="-17" y="-17" width="39" height="34" rx="12" fill="#458fc5"/><path d="M-8 -11H9" stroke="#a1d5ef" stroke-width="3.5" stroke-linecap="round"/><circle cx="-4" cy="1" r="7" fill="#2b628d"/><path d="M-7 1h6" stroke="#a1d5ef" stroke-width="2"/></g>',
    },
  ],
  muzzle: TANK_MUZZLE,
  shadow: TANK_SHADOW,
};

export const TANK_ORANGE: AssetDefinition = {
  label: 'Panzer · Orange',
  viewBox: TANK_VIEW_BOX,
  anchor: TANK_ANCHOR,
  parts: [
    {
      role: 'body',
      svg: '<g stroke="#28333b" stroke-width="2.5" stroke-linejoin="round"><rect x="-38" y="-33" width="72" height="18" rx="6" fill="#303840"/><rect x="-38" y="15" width="72" height="18" rx="6" fill="#303840"/><path d="M-30 -30v12 M-30 18v12" stroke="#69737b" stroke-width="3"/><path d="M-20 -30v12 M-20 18v12" stroke="#69737b" stroke-width="3"/><path d="M-10 -30v12 M-10 18v12" stroke="#69737b" stroke-width="3"/><path d="M0 -30v12 M0 18v12" stroke="#69737b" stroke-width="3"/><path d="M10 -30v12 M10 18v12" stroke="#69737b" stroke-width="3"/><path d="M20 -30v12 M20 18v12" stroke="#69737b" stroke-width="3"/><path d="M30 -30v12 M30 18v12" stroke="#69737b" stroke-width="3"/><rect x="-35" y="-24" width="72" height="48" rx="10" fill="#e39b48"/><path d="M-24 -18H22" stroke="#ffe1a0" stroke-width="4" stroke-linecap="round"/><path d="M-24 18H22" stroke="#a6642e" stroke-width="4" stroke-linecap="round"/><path d="M27 -15v30" stroke="#fff0ca" stroke-width="6"/><rect x="-26" y="-9" width="12" height="18" rx="2" fill="#a6642e" stroke="none"/><path d="M-23 -5h6 M-23 0h6 M-23 5h6" stroke="#ffe1a0" stroke-width="1.5"/></g>',
    },
    {
      role: 'aim',
      svg: '<g stroke="#28333b" stroke-width="2.5" stroke-linejoin="round"><rect x="10" y="-6" width="40" height="12" rx="3" fill="#a6642e"/><rect x="44" y="-8" width="10" height="16" rx="3" fill="#fff0ca"/><rect x="-17" y="-17" width="39" height="34" rx="12" fill="#e39b48"/><path d="M-8 -11H9" stroke="#ffe1a0" stroke-width="3.5" stroke-linecap="round"/><circle cx="-4" cy="1" r="7" fill="#a6642e"/><path d="M-7 1h6" stroke="#ffe1a0" stroke-width="2"/></g>',
    },
  ],
  muzzle: TANK_MUZZLE,
  shadow: TANK_SHADOW,
};

export const TURRET_ENEMY: AssetDefinition = {
  label: 'Geschützturm',
  viewBox: TANK_VIEW_BOX,
  anchor: TANK_ANCHOR,
  parts: [
    {
      role: 'fixed',
      svg: '<g stroke="#252c33" stroke-width="2.5"><rect x="-33" y="-33" width="66" height="66" rx="12" fill="#49505a"/><rect x="-25" y="-25" width="50" height="50" rx="8" fill="#30373f"/><circle cx="-26" cy="-26" r="3" fill="#919ba4"/><circle cx="-26" cy="26" r="3" fill="#919ba4"/><circle cx="26" cy="-26" r="3" fill="#919ba4"/><circle cx="26" cy="26" r="3" fill="#919ba4"/></g>',
    },
    {
      role: 'aim',
      svg: '<g stroke="#28333b" stroke-width="2.5" stroke-linejoin="round"><rect x="10" y="-6" width="40" height="12" rx="3" fill="#252c34"/><rect x="44" y="-8" width="10" height="16" rx="3" fill="#ef6055"/><rect x="-17" y="-17" width="39" height="34" rx="12" fill="#444c57"/><path d="M-8 -11H9" stroke="#7d8792" stroke-width="3.5" stroke-linecap="round"/><circle cx="-4" cy="1" r="7" fill="#252c34"/><path d="M-7 1h6" stroke="#7d8792" stroke-width="2"/><path d="M9 -5l7 5-7 5" fill="none" stroke="#ef6055" stroke-width="3"/></g>',
    },
  ],
  muzzle: TANK_MUZZLE,
  shadow: [36, 33] as const,
};
