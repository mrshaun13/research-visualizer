import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Read machine-local config for library paths (same file vite.config.js uses)
const localConfigPath = resolve(import.meta.dirname || '.', '.local-config.json');
const localConfig = existsSync(localConfigPath)
  ? JSON.parse(readFileSync(localConfigPath, 'utf-8'))
  : {};

// Build content paths from configured libraries
const libraryContentPaths = (localConfig.libraries || [])
  .filter(lib => lib.localPath)
  .map(lib => `${lib.localPath}/src/**/*.{js,ts,jsx,tsx}`);

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    ...libraryContentPaths,
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
