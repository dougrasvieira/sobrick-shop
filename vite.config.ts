import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  server: {
    port: 5194,
    headers: {
      'Content-Security-Policy': "font-src 'self' data:; default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://scbzrbcijeytmrycxsbw.supabase.co wss://scbzrbcijeytmrycxsbw.supabase.co;"
    }
  },
  plugins: [react(), tailwindcss()],
});
