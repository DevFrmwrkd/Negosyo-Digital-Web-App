import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'static',
  vite: {
    plugins: [tailwindcss()],
    build: {
      cssMinify: true,
    },
  },
  build: {
    inlineStylesheets: 'always',
  },
});
