interface ViteImportMeta {
  glob(
    patterns: readonly string[],
    options: { query: '?raw'; import: 'default'; eager: true },
  ): Record<string, string>;
}

const viteImportMeta = import.meta as ImportMeta & ViteImportMeta;

const rawSources = viteImportMeta.glob(
  [
    '/src/main.ts',
    '/src/config.ts',
    '/src/sim/**/*.ts',
    '/src/render/**/*.ts',
    '/src/input/**/*.ts',
    '/src/audio/session.ts',
    '/src/audio/silent.ts',
    '/src/presentation/**/*.ts',
    '/tests/**/*.ts',
  ],
  { query: '?raw', import: 'default', eager: true },
);

export interface EmbeddedSource {
  readonly path: string;
  readonly content: string;
  readonly lines: number;
}

const sources: EmbeddedSource[] = Object.entries(rawSources)
  .map(([path, content]) => ({
    path,
    content,
    lines: content.split('\n').length,
  }))
  .sort((left, right) => left.path.localeCompare(right.path));

export function getSourceFiles(): EmbeddedSource[] {
  return sources;
}

export function findSource(path: string): EmbeddedSource | undefined {
  return sources.find((source) => source.path === path);
}
