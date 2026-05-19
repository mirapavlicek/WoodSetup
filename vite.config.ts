import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relativní base, aby Electron uměl naservírovat soubory přes file://.
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
});
