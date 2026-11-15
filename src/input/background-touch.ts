interface BackgroundTouchHost {
  readonly app: HTMLElement;
  readonly stage: HTMLElement;
  isActive(): boolean;
  focusGame(): void;
}

export function retainBackgroundTouchFocus(host: BackgroundTouchHost): void {
  host.app.addEventListener(
    'pointerdown',
    (event) => {
      if (event.pointerType !== 'touch' || !host.isActive() || document.hidden) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (
        target.closest(
          'button, a, input, select, textarea, label, summary, [contenteditable], [role=button], .tools, .audio-controls, .overlay, .rotate-hint, .touch-pad',
        ) !== null
      )
        return;
      const focusable = target.closest('[tabindex]');
      if (focusable !== null && focusable !== host.app && focusable !== host.stage) return;
      if (
        target !== host.app &&
        target !== host.stage &&
        target.closest('.stage-wrap, .hud, header') === null
      )
        return;
      event.preventDefault();
      host.focusGame();
    },
    { capture: true, passive: false },
  );
}
