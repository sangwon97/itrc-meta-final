import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App.jsx';
import './styles/base.css';
import './styles/hud.css';
import './styles/entryGate.css';
import './styles/search.css';
import './styles/infoPanel.css';
import './styles/posterViewer.css';
import './styles/mobileControls.css';
import './styles/npcViewer.css';
import './styles/videoViewer.css';

const externalScripts = [
  'https://aframe.io/releases/1.4.0/aframe.min.js',
  'https://unpkg.com/@pixiv/three-vrm@2.0.0/lib/three-vrm.min.js',
];

// React 마운트 전 외부 런타임 스크립트 보장
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
        return;
      }
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.addEventListener(
      'load',
      () => {
        script.dataset.loaded = 'true';
        resolve();
      },
      { once: true },
    );
    script.addEventListener('error', () => reject(new Error(`Failed to load script: ${src}`)), {
      once: true,
    });
    document.head.appendChild(script);
  });
}

// A-Frame 컴포넌트 등록 후 React 앱 시작
async function bootstrap() {
  await Promise.all(externalScripts.map(loadScript));
  await import('./aframe/registerComponents.js');

  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
}

bootstrap().catch((error) => {
  console.error(error);
});
