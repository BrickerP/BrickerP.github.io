import { defineConfig } from 'vite';

// Relative base ('./') makes the built site work from ANY path — a user's
// GitHub Pages project subpath (https://user.github.io/repo/) or a root
// domain — without hard-coding the repository name. Runtime data fetches
// are prefixed with import.meta.env.BASE_URL so they resolve the same way.
export default defineConfig({
  base: process.env.VITE_BASE ?? './',
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
  },
  server: {
    host: true,
    port: 5173,
  },
});
