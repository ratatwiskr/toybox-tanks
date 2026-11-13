import { describe, expect, it } from 'vitest';

import { levelSelectMarkup, type LevelSelectOptions } from '../../src/presentation/level-select';
import { MAPS, type MapData } from '../../src/sim/maps';

function lastMap(): MapData {
  const map = MAPS[MAPS.length - 1];
  if (map === undefined) {
    throw new Error('Campaign map missing');
  }
  return map;
}

function markup(overrides: Partial<LevelSelectOptions> = {}): string {
  return levelSelectMarkup({
    maps: MAPS,
    mode: 'coop',
    selectedRoom: 0,
    ...overrides,
  });
}

describe('level select markup', () => {
  it('renders one selectable blueprint per campaign room', () => {
    const html = markup();

    expect(html.match(/data-action="level"/g)).toHaveLength(MAPS.length);
    for (const [index, map] of MAPS.entries()) {
      expect(html).toContain(`data-room="${String(index)}"`);
      expect(html).toContain(map.name);
    }
    expect(html).toContain('2 PLAYER CO-OP');
    expect(html).toContain('Mission 01: First Bounce');
    expect(html).toContain('data-action="launch"');
  });

  it('marks only the chosen blueprint selected and clamps an out-of-range room', () => {
    const html = markup({ mode: 'solo', selectedRoom: 4 });

    expect(html).toContain('1 PLAYER');
    expect(html).toContain('Mission 05: Cork Keep');
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(html).toContain('data-room="4" aria-pressed="true"');

    const clamped = markup({ mode: 'solo', selectedRoom: 99 });
    expect(clamped).toContain(`Mission ${String(MAPS.length).padStart(2, '0')}: ${lastMap().name}`);
  });

  it('draws walls, cork, player spawns, and sentries in the blueprint preview', () => {
    const html = markup({ selectedRoom: 4 });

    expect(html).toContain('viewBox="0 0 22 11"');
    expect(html).toContain('fill="#e2c38f"');
    expect(html).toContain('fill="#c59563"');
    expect(html).toContain('fill="#4ade80"');
    expect(html).toContain('fill="#f87171"');
  });

  it('escapes authored names and hints before inserting them into the markup', () => {
    const source = MAPS[0];
    if (source === undefined) {
      throw new Error('Campaign map missing');
    }
    const hostile: MapData = {
      ...source,
      name: '<Cork & Keep>',
      hint: '"bank" <shot>',
    };

    const html = markup({ maps: [hostile] });

    expect(html).toContain('&lt;Cork &amp; Keep&gt;');
    expect(html).toContain('&quot;bank&quot; &lt;shot&gt;');
    expect(html).not.toContain('<Cork & Keep>');
  });
});
