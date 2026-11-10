export type AssetLayer = {
  role: string;
  color: string;
  path: string;
};

export type AssetDefinition = {
  name: string;
  layers: AssetLayer[];
};

export const TANK_BLUE: AssetDefinition = {
  name: 'tank-blue',
  layers: [
    { role: 'body', color: '#4a90d9', path: 'M20 10h24v44H20z' },
    { role: 'turret', color: '#2f6fb3', path: 'M28 22h8v20h-8z' },
  ],
};

export const TANK_ORANGE: AssetDefinition = {
  name: 'tank-orange',
  layers: [
    { role: 'body', color: '#e58a3a', path: 'M20 10h24v44H20z' },
    { role: 'turret', color: '#b8662a', path: 'M28 22h8v20h-8z' },
  ],
};

export const SENTRY: AssetDefinition = {
  name: 'sentry',
  layers: [
    { role: 'body', color: '#7a7a7a', path: 'M18 14h28v36H18z' },
    { role: 'turret', color: '#5a5a5a', path: 'M28 24h8v16h-8z' },
  ],
};
