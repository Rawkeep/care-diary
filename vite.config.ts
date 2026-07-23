import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Lokal-first PWA — keine externen Requests zur Laufzeit, relative Pfade
// damit das Build-Ergebnis auch aus Unterordnern heraus funktioniert.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5180 },
});
