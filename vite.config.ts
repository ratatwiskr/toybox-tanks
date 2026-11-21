import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig(({ mode }) => {
  const context = mode === 'context';
  const single = mode === 'single' || context;

  return {
    base: './',
    resolve: {
      alias: context
        ? [
            {
              find: /^\.\/audio\/browser$/,
              replacement: fileURLToPath(new URL('./src/audio/silent.ts', import.meta.url)),
            },
          ]
        : [],
    },
    define: {
      __TEST_BUILD__: JSON.stringify(mode === 'test'),
      __REVIEW_BUILD__: JSON.stringify(context),
    },
    build: {
      outDir: context
        ? 'dist-context'
        : single
          ? 'dist-single'
          : mode === 'test'
            ? 'dist-test'
            : 'dist',
      emptyOutDir: true,
      target: 'es2022',
      sourcemap: false,
      ...(context ? { minify: false, cssMinify: false } : {}),
      assetsInlineLimit: single ? 100_000_000 : 4096,
    },
    plugins: single ? [viteSingleFile()] : [],
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
    },
    preview: {
      host: '127.0.0.1',
      port: 4173,
      strictPort: true,
    },
  };
});
