import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const normalizeBasePath = (raw?: string) => {
  if (!raw) return '/';
  let basePath = raw.trim();
  if (!basePath) return '/';
  if (!basePath.startsWith('/')) basePath = `/${basePath}`;
  if (!basePath.endsWith('/')) basePath = `${basePath}/`;
  return basePath;
};

export default defineConfig({
  base: normalizeBasePath(process.env.BASE_PATH),
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
