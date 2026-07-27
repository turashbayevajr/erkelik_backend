import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // В dev бэкенд ходит через прокси — фронт использует относительный /api.
    proxy: { '/api': 'http://localhost:4002' },
  },
});
