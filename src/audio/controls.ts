import './controls.css';
import type { AudioSession } from './session';

export function createAudioControls(
  parent: HTMLElement,
  audio: AudioSession,
  clearInput: () => void,
): () => void {
  const tools = parent.querySelector<HTMLElement>('.tools');
  if (tools === null) {
    throw new Error('Missing toolbar for audio controls');
  }
  const controls = document.createElement('details');
  controls.className = 'audio-controls';
  const summary = document.createElement('summary');
  summary.textContent = 'Audio';
  const panel = document.createElement('fieldset');
  panel.className = 'audio-panel';
  const legend = document.createElement('legend');
  legend.textContent = 'Audio settings';
  panel.append(legend);
  controls.append(summary, panel);
  const enable = document.createElement('button');
  enable.type = 'button';
  enable.textContent = 'Enable audio';
  const mute = document.createElement('button');
  mute.type = 'button';
  mute.textContent = 'Mute audio';
  mute.setAttribute('aria-pressed', 'false');
  panel.append(enable, mute);
  let muted = false;

  function slider(labelText: string, value: string): HTMLInputElement {
    const label = document.createElement('label');
    label.textContent = labelText;
    const input = document.createElement('input');
    input.type = 'range';
    input.min = '0';
    input.max = '1';
    input.step = '0.05';
    input.value = value;
    label.append(input);
    panel.append(label);
    return input;
  }

  const music = slider('Music volume', '0.2');
  const effects = slider('Effects volume', '0.7');
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = 'Close audio settings';
  panel.append(close);

  function update(): void {
    audio.setLevels({ muted, music: music.valueAsNumber, effects: effects.valueAsNumber });
    mute.setAttribute('aria-pressed', String(muted));
    mute.textContent = muted ? 'Unmute audio' : 'Mute audio';
  }
  const abort = new AbortController();
  const options = { signal: abort.signal };
  enable.addEventListener(
    'click',
    () => {
      void audio.unlock().then((ready) => {
        enable.textContent = ready ? 'Audio enabled · retry' : 'Enable audio · retry';
      });
    },
    options,
  );
  mute.addEventListener(
    'click',
    () => {
      muted = !muted;
      update();
    },
    options,
  );
  close.addEventListener(
    'click',
    () => {
      controls.open = false;
      summary.focus({ preventScroll: true });
    },
    options,
  );
  music.addEventListener('input', update, options);
  effects.addEventListener('input', update, options);
  controls.addEventListener(
    'keydown',
    (event) => {
      if (event.code === 'Escape') {
        controls.open = false;
        summary.focus({ preventScroll: true });
        event.preventDefault();
      }
    },
    options,
  );
  for (const type of ['keydown', 'keyup', 'pointerdown']) {
    controls.addEventListener(
      type,
      (event) => {
        clearInput();
        event.stopPropagation();
      },
      options,
    );
  }
  tools.append(controls);
  return () => {
    abort.abort();
    controls.remove();
  };
}
