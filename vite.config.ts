import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// Keep local builds relocatable by default. The Pages workflow overrides this
// with `/` because the production site is published at the user-domain root.
// Two HTML entries: the static landing page at `/` and the film at `/beijing-loop/`.
export default defineConfig({
  base: process.env.VITE_BASE ?? './',
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        home: fileURLToPath(new URL('./index.html', import.meta.url)),
        film: fileURLToPath(new URL('./beijing-loop/index.html', import.meta.url)),
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
});
