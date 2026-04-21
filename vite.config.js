import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// models / npc / videos / imgs 는 CDN(itrc-assets 버킷) 에서 서빙하므로 dist 에 복사하지 않는다.
// CDN URL 은 src/services/assetUrl.js 의 cdnAsset() 으로 조립된다.
const staticAssets = [
  'BoothName_PosRot.csv',
  'threejs_objects_export.csv',
  'NPC_PosRot.csv',
  'NPC_Pos.csv',
  'TV_Pos.csv',
  'test-H.png',
  'test-V.png',
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
