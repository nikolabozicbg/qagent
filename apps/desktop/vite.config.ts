import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@screens': resolve(__dirname, './src/screens'),
      '@services': resolve(__dirname, './src/services'),
      '@stores': resolve(__dirname, './src/stores'),
      '@hooks': resolve(__dirname, './src/hooks'),
      '@contexts': resolve(__dirname, './src/contexts'),
      '@/types': resolve(__dirname, './src/types'),
      '@utils': resolve(__dirname, './src/utils')
    }
  },
  server: {
    port: 5178,
    strictPort: true, // Must use port 5178, fail if taken
    host: 'localhost'
  }
});
