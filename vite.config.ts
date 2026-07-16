import { defineConfig } from 'vite';

// Keep local builds relocatable by default. The Pages workflow overrides this
// with `/` because the production site is published at the user-domain root.
export default defineConfig({
  base: process.env.VITE_BASE ?? './',
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
});
