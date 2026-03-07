import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { readFileSync, existsSync } from 'fs';

// Read machine-local config for library paths (gitignored, created by skill during Phase 0)
const localConfigPath = path.resolve(__dirname, '.local-config.json');
const localConfig = existsSync(localConfigPath)
  ? JSON.parse(readFileSync(localConfigPath, 'utf-8'))
  : {};

// Build Vite aliases dynamically from configured libraries
const aliases = {};
if (localConfig.libraries) {
  for (const lib of localConfig.libraries) {
    if (lib.alias && lib.localPath) {
      aliases[lib.alias] = path.resolve(lib.localPath, 'src');
    }
  }
}

export default defineConfig({
  plugins: [
    react(),
  ],
  build: {
    target: 'esnext',
  },
  server: {
    port: 5180,
    host: true,
  },
  resolve: {
    alias: aliases,
  },
});
