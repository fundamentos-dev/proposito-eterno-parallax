import { defineConfig } from 'vite';

// A cena é SVG montado em runtime a partir de src/scene/*.json — não há framework.
export default defineConfig({
  base: './',
  resolve: { alias: { src: '/src' } },
});
