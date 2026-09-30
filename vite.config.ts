import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  css: {
    // Inline (empty) PostCSS config: stops Vite from searching parent
    // directories and picking up an unrelated postcss.config.js.
    postcss: {},
  },
});
