// 부스명 생성
import { THREE, registerOnce } from '../core.js';

registerOnce('booth-name-generator', {
  schema: {
    csvUrl: { type: 'string', default: 'BoothName_PosRot.csv' },
    charLimit: { type: 'int', default: 18 },
    maxLines: { type: 'int', default: 3 },
    planeWidth: { type: 'number', default: 3.4 },
    planeHeight: { type: 'number', default: 1.5 },
    fontSizePx: { type: 'number', default: 120 },
  },
  init() {
    const start = () => {
      const scene = this.el.sceneEl;
      const maxAnisotropy = scene.renderer.capabilities.getMaxAnisotropy();
      const DARK_TEXT_COLOR = '#0f172a';
      const LIGHT_TEXT_COLOR = '#ffffff';

      const splitLongToken = (token, limit) => {
        const chunks = [];
        for (let i = 0; i < token.length; i += limit) {
          chunks.push(token.substring(i, i + limit));
        }
        return chunks;
      };

      const truncateWithEllipsis = (text, limit) => {
        if (limit <= 1) return '…';

        const normalizedText = text.trim().replace(/\s+/g, ' ');
        if (!normalizedText) return '…';

        const visibleText = normalizedText.slice(0, limit - 1).trimEnd();
        return `${visibleText || normalizedText[0]}…`;
      };

      const wrapLines = (text, limit, maxLines) => {
        const normalizedText = text.trim().replace(/\s+/g, ' ');
        if (!normalizedText) return [];

        const tokens = normalizedText.split(' ');
        const lines = [];
        let currentLine = '';

        tokens.forEach((token) => {
          if (token.length > limit) {
            if (currentLine) {
              lines.push(currentLine);
              currentLine = '';
            }
            lines.push(...splitLongToken(token, limit));
            return;
          }

          const nextLine = currentLine ? `${currentLine} ${token}` : token;
          if (nextLine.length <= limit) {
            currentLine = nextLine;
            return;
          }

          if (currentLine) {
            lines.push(currentLine);
          }
          currentLine = token;
        });

        if (currentLine) {
          lines.push(currentLine);
        }

        if (lines.length <= maxLines) {
          return lines;
        }

        const keptLines = lines.slice(0, Math.max(maxLines - 1, 0));
        const remainingText = lines.slice(Math.max(maxLines - 1, 0)).join(' ');
        keptLines.push(truncateWithEllipsis(remainingText, limit));
        return keptLines;
      };

      const TARGET_MAX_LINES = 2;
      const MIN_FONT_SIZE = Math.round(this.data.fontSizePx * 0.5);

      const createTextTexture = (text, boothId) => {
        const isSection9 = boothId.startsWith('S9');
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // 2줄 초과 시 폰트 축소
        let fontSize = this.data.fontSizePx;
        let charLimit = this.data.charLimit;
        while (fontSize > MIN_FONT_SIZE) {
          const naturalLines = wrapLines(text, charLimit, 999);
          if (naturalLines.length <= TARGET_MAX_LINES) break;
          fontSize -= 2;
          charLimit = Math.round(this.data.charLimit * (this.data.fontSizePx / fontSize));
        }

        const lines = wrapLines(text, charLimit, TARGET_MAX_LINES);

        ctx.font = `bold ${fontSize}px "Pretendard", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif`;
        ctx.fillStyle = isSection9 ? DARK_TEXT_COLOR : LIGHT_TEXT_COLOR;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = isSection9 ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        const lineHeight = fontSize * 1.3;
        let startY = canvas.height / 2 - (lines.length * lineHeight) / 2 + lineHeight / 2;

        lines.forEach((line) => {
          ctx.fillText(line, canvas.width / 2, startY);
          startY += lineHeight;
        });

        const texture = new THREE.CanvasTexture(canvas);
        texture.anisotropy = maxAnisotropy;
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
      };

      fetch(this.data.csvUrl)
        .then((response) => response.text())
        .then((csvText) => {
          const lines = csvText.split('\n');
          for (let i = 1; i < lines.length; i += 1) {
            const parts = lines[i].trim().split(',');
            if (parts.length < 6) continue;
            if (parts[0].trim().startsWith('S11')) continue;

            const textEl = document.createElement('a-entity');
            textEl.setAttribute('position', {
              x: Number.parseFloat(parts[1]),
              y: Number.parseFloat(parts[2]),
              z: Number.parseFloat(parts[3]),
            });
            textEl.setAttribute('rotation', {
              x: 0,
              y: Number.parseFloat(parts[4]),
              z: 0,
            });

            const geometry = new THREE.PlaneGeometry(this.data.planeWidth, this.data.planeHeight);
            const material = new THREE.MeshBasicMaterial({
              map: createTextTexture(parts[5].trim(), parts[0].trim()),
              transparent: true,
              alphaTest: 0.1,
              side: THREE.DoubleSide,
            });

            textEl.setObject3D('mesh', new THREE.Mesh(geometry, material));
            this.el.appendChild(textEl);
          }
        });
    };

    if (this.el.sceneEl?.renderer) {
      start();
    } else {
      this.el.sceneEl?.addEventListener('renderstart', start, { once: true });
    }
  },
});
