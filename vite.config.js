import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const staticAssets = [
  'models',
  'imgs',
  'npc',
  'BoothName_PosRot.csv',
  'threejs_objects_export.csv',
  'NPC_PosRot.csv',
  'NPC_Pos.csv',
  'TV_Pos.csv',
  'NPC_men.vrm',
  'test-H.png',
  'test-V.png',
  'videos',
];

function copyStaticAssets() {
  return {
    name: 'copy-static-assets',
    apply: 'build',
    async closeBundle() {
      const rootDir = process.cwd();
      const distDir = path.join(rootDir, 'dist');

      for (const asset of staticAssets) {
        const source = path.join(rootDir, asset);
        const destination = path.join(distDir, asset);
        try {
          await mkdir(path.dirname(destination), { recursive: true });
          await cp(source, destination, { recursive: true });
        } catch (error) {
          if (error?.code !== 'ENOENT') {
            throw error;
          }
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), copyStaticAssets()],
  server: {
    host: true,
    proxy: {
      '/api': 'http://168.131.154.198:3001',
    },
  },
});
