import { THREE } from '../core.js';

function wrapHintLines(text, maxChars = 12) {
  const lines = [];
  const paragraphs = String(text ?? '')
    .trim()
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (!paragraphs.length) return lines;

  paragraphs.forEach((paragraph) => {
    const normalizedText = paragraph.replace(/\s+/g, ' ');
    const tokens = normalizedText.split(' ');
    let currentLine = '';

    tokens.forEach((token) => {
      const nextLine = currentLine ? `${currentLine} ${token}` : token;
      if (nextLine.length <= maxChars) {
        currentLine = nextLine;
        return;
      }

      if (currentLine) {
        lines.push(currentLine);
        currentLine = token;
        return;
      }

      for (let index = 0; index < token.length; index += maxChars) {
        lines.push(token.slice(index, index + maxChars));
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }
  });

  return lines;
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export function createHintBubbleSprite(text, options = {}) {
  const {
    maxChars = 12,
    maxLines = 2,
    fontSize = 30,
    lineHeight = fontSize + 6,
    scale = [0.6, 0.3, 1],
    position = [0.4, 1.7, 0],
  } = options;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const bubbleX = 28;
  const bubbleY = 18;
  const bubbleWidth = canvas.width - bubbleX * 2;
  const bubbleHeight = 164;
  const lines = wrapHintLines(text, maxChars).slice(0, maxLines);
  const totalTextHeight = lines.length * lineHeight;
  let lineY = bubbleY + bubbleHeight / 2 - totalTextHeight / 2 + lineHeight / 2;

  drawRoundedRect(ctx, bubbleX, bubbleY, bubbleWidth, bubbleHeight, 32);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 6;
  ctx.fill();
  ctx.stroke();

  ctx.font = `bold ${fontSize}px "Pretendard", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  lines.forEach((line) => {
    ctx.fillText(line, canvas.width / 2, lineY);
    lineY += lineHeight;
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(...scale);
  sprite.position.set(...position);
  sprite.visible = false;
  sprite.userData.dispose = () => {
    texture.dispose();
    material.dispose();
  };

  return sprite;
}
