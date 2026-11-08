import './controls.css';
import type { AudioSession } from './session';

export function createAudioControls(
  parent: HTMLElement,
  audio: AudioSession,
  clearInput: () => void,
): () => void {
  const controls = document.createElement('fieldset');
  controls.className = 'audio-controls';
  const legend = document.createElement('legend');
  legend.textContent = 'Audio';
  controls.append(legend);
  const enable = document.createElement('button');
  enable.type = 'button';
  enable.textContent = 'Enable audio';
  const mute = document.createElement('button');
  mute.type = 'button';
  mute.textContent = 'Mute audio';
  mute.setAttribute('aria-pressed', 'false');
  controls.append(enable, mute);
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
    controls.append(label);
    return input;
  }

  const music = slider('Music volume', '0.2');
  const effects = slider('Effects volume', '0.7');
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
  music.addEventListener('input', update, options);
  effects.addEventListener('input', update, options);
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
  parent.append(controls);
  return () => {
    abort.abort();
    controls.remove();
  };
}
