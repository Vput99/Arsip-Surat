import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Agar process.env.API_KEY bisa terbaca dari file .env atau system environment
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      // Polyfill object process.env kosong agar library lain tidak error
      'process.env': {}
    }
  };
});