import { MUDRAS } from './mudras';

export const MUDRA_CHART_URL = '/assets/aistudio/IMG_4978_103a6d1d.jpeg';

export interface MudraSpriteAsset {
  readonly id: number;
  readonly name: string;
  readonly canvas: HTMLCanvasElement;
  readonly dataUrl: string;
}

interface NormalizedCropRect {
  /** Normalized [0..1] crop box covering ONLY the hand illustration (excluding printed caption below). */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * Exact normalized bounding boxes on /assets/aistudio/IMG_4978_103a6d1d.jpeg (1179 x 1916)
 * for the 11 Mudras in the 5-column x 6-row "Asamyuta Hastas" chart.
 * Each box tightly encloses the hand gesture while stopping strictly above the printed label.
 */
const MUDRA_CROP_RECTS: Record<string, NormalizedCropRect> = {
  // Row 0 (top)
  Pataka: { x0: 0.035, y0: 0.088, x1: 0.215, y1: 0.220 },
  Tripataka: { x0: 0.235, y0: 0.090, x1: 0.405, y1: 0.223 },
  Kartharimukha: { x0: 0.610, y0: 0.094, x1: 0.785, y1: 0.227 },

  // Row 1
  Ardhachandra: { x0: 0.030, y0: 0.248, x1: 0.226, y1: 0.378 },
  Mushti: { x0: 0.612, y0: 0.268, x1: 0.782, y1: 0.376 },
  Shikhara: { x0: 0.798, y0: 0.252, x1: 0.968, y1: 0.376 },

  // Row 2
  Kapitha: { x0: 0.035, y0: 0.408, x1: 0.215, y1: 0.535 },
  Suchi: { x0: 0.800, y0: 0.403, x1: 0.968, y1: 0.535 },

  // Row 3
  Chandrakala: { x0: 0.030, y0: 0.558, x1: 0.220, y1: 0.688 },
  Sarpashirsha: { x0: 0.415, y0: 0.560, x1: 0.595, y1: 0.687 },

  // Row 5 (bottom)
  Mukula: { x0: 0.420, y0: 0.866, x1: 0.590, y1: 0.969 },
};

/**
 * Extracts a single Mudra hand illustration from the loaded chart image:
 * 1. Crops the exact hand region.
 * 2. Runs a perimeter BFS flood-fill to smoothly key out the warm parchment background
 *    outside the hand's dark ink contour (never punching holes inside the palm).
 * 3. Auto-centers and scales the hand cleanly into a crisp square transparent canvas.
 */
function extractCleanHandSprite(
  img: HTMLImageElement,
  rect: NormalizedCropRect,
  outputSize = 360,
): HTMLCanvasElement {
  const sx = Math.max(0, Math.floor(rect.x0 * img.naturalWidth));
  const sy = Math.max(0, Math.floor(rect.y0 * img.naturalHeight));
  const sw = Math.max(1, Math.min(img.naturalWidth - sx, Math.ceil((rect.x1 - rect.x0) * img.naturalWidth)));
  const sh = Math.max(1, Math.min(img.naturalHeight - sy, Math.ceil((rect.y1 - rect.y0) * img.naturalHeight)));

  const work = document.createElement('canvas');
  work.width = sw;
  work.height = sh;
  const wctx = work.getContext('2d', { willReadFrequently: true });
  if (!wctx) return work;

  wctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  const imageData = wctx.getImageData(0, 0, sw, sh);
  const data = imageData.data;

  // Estimate local parchment background RGB from the 4 corners of the crop
  const sampleCoords = [
    [2, 2],
    [sw - 3, 2],
    [2, sh - 3],
    [sw - 3, sh - 3],
    [Math.floor(sw / 2), 2],
  ];
  let bgR = 0;
  let bgG = 0;
  let bgB = 0;
  let sampleCount = 0;
  for (const [px, py] of sampleCoords) {
    const idx = (py * sw + px) * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    if (r > 195 && g > 180 && b > 155) {
      bgR += r;
      bgG += g;
      bgB += b;
      sampleCount++;
    }
  }
  if (sampleCount > 0) {
    bgR /= sampleCount;
    bgG /= sampleCount;
    bgB /= sampleCount;
  } else {
    bgR = 244;
    bgG = 236;
    bgB = 220;
  }

  const totalPixels = sw * sh;
  const visited = new Uint8Array(totalPixels);
  const isBg = new Uint8Array(totalPixels);
  const queue = new Int32Array(totalPixels);
  let head = 0;
  let tail = 0;

  const isParchmentColor = (pixelIdx: number): boolean => {
    const i = pixelIdx * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const dr = r - bgR;
    const dg = g - bgG;
    const db = b - bgB;
    const distSq = dr * dr + dg * dg + db * db;
    // Match light warm parchment while stopping cleanly at dark brown outlines or red/orange skin tones
    return distSq < 46 * 46 && r > 188 && g > 172 && b > 142 && r - b < 56;
  };

  const enqueueIfBg = (x: number, y: number) => {
    const idx = y * sw + x;
    if (visited[idx]) return;
    visited[idx] = 1;
    if (isParchmentColor(idx)) {
      isBg[idx] = 1;
      queue[tail++] = idx;
    }
  };

  // Seed BFS from all 4 outer edges of the crop box
  for (let x = 0; x < sw; x++) {
    enqueueIfBg(x, 0);
    enqueueIfBg(x, sh - 1);
  }
  for (let y = 0; y < sh; y++) {
    enqueueIfBg(0, y);
    enqueueIfBg(sw - 1, y);
  }

  while (head < tail) {
    const cur = queue[head++];
    const cx = cur % sw;
    const cy = (cur - cx) / sw;

    if (cx > 0) enqueueIfBg(cx - 1, cy);
    if (cx < sw - 1) enqueueIfBg(cx + 1, cy);
    if (cy > 0) enqueueIfBg(cx, cy - 1);
    if (cy < sh - 1) enqueueIfBg(cx, cy + 1);
  }

  // Apply smooth anti-aliased alpha along the silhouette boundary & find tight non-bg bounding box
  let minX = sw;
  let minY = sh;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const idx = y * sw + x;
      const i = idx * 4;
      if (isBg[idx]) {
        data[i + 3] = 0;
      } else {
        // Gentle 1px edge feathering if adjacent to removed parchment
        let bgNeighbors = 0;
        if (x > 0 && isBg[idx - 1]) bgNeighbors++;
        if (x < sw - 1 && isBg[idx + 1]) bgNeighbors++;
        if (y > 0 && isBg[idx - sw]) bgNeighbors++;
        if (y < sh - 1 && isBg[idx + sw]) bgNeighbors++;

        if (bgNeighbors > 0) {
          const dr = data[i] - bgR;
          const dg = data[i + 1] - bgG;
          const db = data[i + 2] - bgB;
          const dist = Math.sqrt(dr * dr + dg * dg + db * db);
          if (dist < 62) {
            data[i + 3] = Math.round(Math.min(255, Math.max(0, ((dist - 24) / 38) * 255)));
          }
        }

        if (data[i + 3] > 35) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
  }

  wctx.putImageData(imageData, 0, 0);

  // Fallback bounds if crop somehow found nothing
  if (maxX <= minX || maxY <= minY) {
    minX = 0;
    minY = 0;
    maxX = sw - 1;
    maxY = sh - 1;
  }

  const tightW = maxX - minX + 1;
  const tightH = maxY - minY + 1;

  // Render centered & uniformly padded onto final crisp square sprite canvas
  const out = document.createElement('canvas');
  out.width = outputSize;
  out.height = outputSize;
  const octx = out.getContext('2d');
  if (!octx) return out;

  const pad = outputSize * 0.07;
  const avail = outputSize - pad * 2;
  const scale = Math.min(avail / tightW, avail / tightH);
  const drawW = tightW * scale;
  const drawH = tightH * scale;
  const dx = (outputSize - drawW) / 2;
  const dy = (outputSize - drawH) / 2;

  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(work, minX, minY, tightW, tightH, dx, dy, drawW, drawH);

  return out;
}

let cachedSpritesPromise: Promise<Record<number, MudraSpriteAsset>> | null = null;

/**
 * Loads the user's Asamyuta Hastas chart once and returns clean transparent sprites
 * indexed by Mudra ID (0..11).
 */
export function loadMudraSprites(): Promise<Record<number, MudraSpriteAsset>> {
  if (cachedSpritesPromise) return cachedSpritesPromise;

  cachedSpritesPromise = new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const result: Record<number, MudraSpriteAsset> = {};
      for (const mudra of MUDRAS) {
        const rect = MUDRA_CROP_RECTS[mudra.name];
        if (!rect) continue;
        const spriteCanvas = extractCleanHandSprite(img, rect, 360);
        result[mudra.id] = {
          id: mudra.id,
          name: mudra.name,
          canvas: spriteCanvas,
          dataUrl: spriteCanvas.toDataURL('image/png'),
        };
      }
      resolve(result);
    };
    img.onerror = () => {
      // Gracefully resolve empty if image fails so wheel still works with names
      resolve({});
    };
    img.src = MUDRA_CHART_URL;
  });

  return cachedSpritesPromise;
}
