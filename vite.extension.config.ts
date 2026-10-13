// Build config for the ApplyFlow browser extension (Manifest V3).
// Usage: GEMINI_API_KEY=... npm run build:extension
// Output: dist-extension/ — load it unpacked via chrome://extensions (Developer mode).
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { copyFileSync } from 'fs';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'copy-extension-manifest',
        writeBundle() {
          copyFileSync(
            path.resolve(__dirname, 'extension/manifest.json'),
            path.resolve(__dirname, 'dist-extension/manifest.json')
          );
        },
      },
    ],
    define: {
      // Same env fallback as the web app's vite.config.ts: Netlify/build env
      // first, then the ambient process environment.
      'process.env.GEMINI_API_KEY': JSON.stringify(
        env.GEMINI_API_KEY || process.env.GEMINI_API_KEY
      ),
    },
    // Relative URLs: the popup HTML lives in extension/ and references ../popup.js etc.
    base: './',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      outDir: 'dist-extension',
      emptyOutDir: true,
      // Keep built assets flat at the output root.
      assetsDir: '.',
      rollupOptions: {
        input: {
          popup: path.resolve(__dirname, 'extension/popup.html'),
          content: path.resolve(__dirname, 'src/extension/content.ts'),
          background: path.resolve(__dirname, 'src/extension/background.ts'),
        },
        output: {
          // Flat output: manifest.json references these exact file names.
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js',
          assetFileNames: '[name].[ext]',
        },
      },
    },
  };
});
