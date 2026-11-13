import type { MapData } from '../sim/maps';
import type { Mode } from '../sim/types';

export type MenuScreen = 'modes' | 'levels';

export interface LevelSelectOptions {
  readonly maps: readonly MapData[];
  readonly mode: Mode;
  readonly selectedRoom: number;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function roomNumber(index: number): string {
  return String(index + 1).padStart(2, '0');
}

function selectedRoomFor(maps: readonly MapData[], requested: number): number {
  if (maps.length === 0) {
    return 0;
  }
  if (!Number.isInteger(requested)) {
    return 0;
  }
  return Math.min(Math.max(requested, 0), maps.length - 1);
}

function mapPreviewSvg(map: MapData): string {
  const rows = map.grid.trim().split(/\r?\n/);
  const columns = rows.reduce((widest, row) => Math.max(widest, row.length), 0);
  const cells: string[] = [];

  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      const cell = row[x];
      if (cell === '#') {
        cells.push(
          `<rect x="${String(x + 0.06)}" y="${String(y + 0.06)}" width="0.88" height="0.88" rx="0.1" fill="#e2c38f" stroke="#8a6232" stroke-width="0.07"/>`,
        );
      } else if (cell === 'C') {
        cells.push(
          `<rect x="${String(x + 0.08)}" y="${String(y + 0.08)}" width="0.84" height="0.84" rx="0.12" fill="#c59563" stroke="#6b4423" stroke-width="0.07"/>`,
        );
      } else if (cell === '1' || cell === '2') {
        cells.push(
          `<circle cx="${String(x + 0.5)}" cy="${String(y + 0.5)}" r="0.34" fill="#4ade80" stroke="#166534" stroke-width="0.08"/>`,
        );
      } else if (cell === 'S') {
        cells.push(
          `<circle cx="${String(x + 0.5)}" cy="${String(y + 0.5)}" r="0.32" fill="#f87171" stroke="#7f1d1d" stroke-width="0.08"/>`,
        );
      }
    }
  });

  return `<svg class="stage-card__map" viewBox="0 0 ${String(columns)} ${String(rows.length)}" aria-hidden="true" focusable="false"><rect width="${String(columns)}" height="${String(rows.length)}" fill="#12314e"/><rect x="0.1" y="0.1" width="${String(columns - 0.2)}" height="${String(rows.length - 0.2)}" rx="0.2" fill="none" stroke="#93c5fd" stroke-width="0.08" stroke-dasharray="0.35 0.25"/>${cells.join('')}</svg>`;
}

export function levelSelectMarkup(options: LevelSelectOptions): string {
  const selected = selectedRoomFor(options.maps, options.selectedRoom);
  const selectedMap = options.maps[selected];
  const modeLabel = options.mode === 'solo' ? '1 PLAYER' : '2 PLAYER CO-OP';

  const cards = options.maps
    .map((map, index) => {
      const stage = roomNumber(index);
      const isSelected = index === selected;
      const enemies = `${String(map.expectedEnemies)} ${map.expectedEnemies === 1 ? 'sentry' : 'sentries'}`;
      return `<button type="button" class="stage-card${isSelected ? ' stage-card--selected' : ''}" data-action="level" data-room="${String(index)}" aria-pressed="${String(isSelected)}" aria-label="Stage ${stage}: ${escapeHtml(map.name)}"><span class="stage-card__pin" aria-hidden="true"></span><span class="stage-card__head"><span>STAGE ${stage}</span><span class="stage-card__enemies">${enemies}</span></span><span class="stage-card__preview">${mapPreviewSvg(map)}</span><span class="stage-card__name">${escapeHtml(map.name)}</span><span class="stage-card__hint">${escapeHtml(map.hint)}</span></button>`;
    })
    .join('');

  const launchName =
    selectedMap === undefined
      ? 'Choose a blueprint'
      : `Mission ${roomNumber(selected)}: ${escapeHtml(selectedMap.name)}`;

  return `<div class="level-select__toolbar"><button type="button" class="wood-btn level-select__back" data-action="back-modes"><span aria-hidden="true">←</span> Modes</button><span class="level-select__mode">${modeLabel}</span><span class="sticky-note">Tip: every shell bounces once. Pick any blueprint.</span></div><div class="level-grid" role="group" aria-label="Campaign stage blueprints">${cards}</div><div class="level-launch"><div class="level-launch__info"><span class="level-launch__eyebrow">Ready on the tabletop</span><strong id="selectedStageTitle">${launchName}</strong></div><button type="button" class="wood-btn wood-btn-green level-launch__button" data-action="launch"${selectedMap === undefined ? ' disabled' : ''}>Roll out! <span aria-hidden="true">▶</span></button></div>`;
}
