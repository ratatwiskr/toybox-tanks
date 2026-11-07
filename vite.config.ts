import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig(({ mode }) => {
  const single = mode === 'single';

  return {
    base: './',
    define: {
      __TEST_BUILD__: JSON.stringify(mode === 'test'),
    },
    build: {
      outDir: single ? 'dist-single' : mode === 'test' ? 'dist-test' : 'dist',
      emptyOutDir: true,
      target: 'es2022',
      sourcemap: false,
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
