import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// SINGLE=1 builds one self-contained index.html (used for the hosted demo).
export default defineConfig({
  plugins: [react(), tailwindcss(), ...(process.env.SINGLE ? [viteSingleFile()] : [])],
  test: { environment: 'jsdom', globals: true, setupFiles: ['./tests/setup.ts'] },
});
