import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ElizaSDK',
      formats: ['es', 'cjs'],
      fileName: (format) => format === 'cjs' ? 'index.cjs' : 'index.js',
    },
    rollupOptions: {
      external: ['zod'],
      output: {
        globals: {
          zod: 'z',
        },
      },
    },
    sourcemap: true,
    minify: 'esbuild',
    target: 'es2022',
  },
});
