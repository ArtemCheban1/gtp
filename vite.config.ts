import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

const api = 'http://localhost:3001';

export default defineConfig({
  root: 'portal',
  publicDir: '../public',
  plugins: [react()],
  server: {
    port: 5173,
    // trailing slashes matter: '/api' alone would also swallow portal/api.ts
    proxy: {'/api/': api, '/uploads/': api, '/out/': api},
  },
});
