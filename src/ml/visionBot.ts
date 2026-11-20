import { NeuralNetwork } from './neuralNet';

export interface VisionDetection {
  birdY: number; // normalized 0..1
  birdX: number; // normalized 0..1
  birdVy: number; // normalized velocity
  pipeX: number; // normalized 0..1
  gapTop: number; // normalized 0..1
  gapBottom: number; // normalized 0..1
  gapCenter: number; // normalized 0..1
  shouldFlap: boolean;
  confidence: number;
  skyRgb: [number, number, number];
}

/**
 * Pure pixel-vision Flappy Bird analyzer.
 * Reads downsampled RGB pixels from any game <canvas> without accessing
 * internal game state, mirroring the exact algorithm shipped inside the
 * universal website bot script.
 */
export class PixelVisionTracker {
  private offscreen: HTMLCanvasElement;
  private offCtx: CanvasRenderingContext2D;
  private prevBirdY = 0.45;
  private smoothVy = 0;
  private lastPipeGapCenter = 0.5;
  private lastPipeGapBottom = 0.62;
  private lastPipeX = 0.85;

  private readonly scanW = 104;
  private readonly scanH = 112;

  constructor() {
    this.offscreen = document.createElement('canvas');
    this.offscreen.width = this.scanW;
    this.offscreen.height = this.scanH;
    const ctx = this.offscreen.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('Could not initialize offscreen 2D context');
    }
    this.offCtx = ctx;
  }

  analyzeAndPredict(
    sourceCanvas: HTMLCanvasElement,
    brain: NeuralNetwork,
    biasOffset = 0
  ): VisionDetection | null {
    const w = this.scanW;
    const h = this.scanH;

    try {
      this.offCtx.drawImage(sourceCanvas, 0, 0, w, h);
    } catch {
      return null;
    }

    const img = this.offCtx.getImageData(0, 0, w, h).data;

    // 1. Estimate sky color from top rows (y = 2..6)
    let rSum = 0;
    let gSum = 0;
    let bSum = 0;
    let samples = 0;
    for (let y = 3; y <= 6; y++) {
      for (let x = 8; x < w - 8; x += 6) {
        const idx = (y * w + x) * 4;
        rSum += img[idx];
        gSum += img[idx + 1];
        bSum += img[idx + 2];
        samples++;
      }
    }
    const skyR = Math.round(rSum / samples);
    const skyG = Math.round(gSum / samples);
    const skyB = Math.round(bSum / samples);

    const isObstacle = (x: number, y: number): boolean => {
      const idx = (y * w + x) * 4;
      const dr = Math.abs(img[idx] - skyR);
      const dg = Math.abs(img[idx + 1] - skyG);
      const db = Math.abs(img[idx + 2] - skyB);
      return dr + dg + db > 68;
    };

    const playableBottom = Math.floor(h * 0.87);

    // 2. Detect Bird centroid in bird corridor (x: 16%..30%)
    const birdMinX = Math.floor(w * 0.16);
    const birdMaxX = Math.floor(w * 0.30);
    let birdSumY = 0;
    let birdSumX = 0;
    let birdPixels = 0;

    for (let x = birdMinX; x <= birdMaxX; x++) {
      for (let y = 6; y < playableBottom; y++) {
        if (isObstacle(x, y)) {
          birdSumY += y;
          birdSumX += x;
          birdPixels++;
        }
      }
    }

    let birdY = this.prevBirdY;
    let birdX = 0.22;
    if (birdPixels > 4 && birdPixels < 220) {
      birdY = birdSumY / birdPixels / playableBottom;
      birdX = birdSumX / birdPixels / w;
    }

    const rawVy = (birdY - this.prevBirdY) * 18;
    this.smoothVy = this.smoothVy * 0.45 + rawVy * 0.55;
    this.prevBirdY = birdY;

    // 3. Scan ahead for upcoming Pipe Gap (x: 24%..96%)
    let detectedPipeX = -1;
    let detectedGapTop = this.lastPipeGapCenter - 0.12;
    let detectedGapBottom = this.lastPipeGapCenter + 0.12;

    for (let x = Math.floor(w * 0.24); x < w - 4; x++) {
      // Find longest continuous sky-gap in this column that has obstacle pixels above OR below
      let nonSkyCount = 0;
      for (let y = 4; y < playableBottom; y++) {
        if (isObstacle(x, y)) nonSkyCount++;
      }
      // A pipe column occupies a substantial vertical fraction (> 38% of height)
      if (nonSkyCount > playableBottom * 0.38) {
        let bestGapStart = -1;
        let bestGapLen = 0;
        let curStart = -1;
        let curLen = 0;

        for (let y = 4; y < playableBottom; y++) {
          if (!isObstacle(x, y)) {
            if (curStart === -1) curStart = y;
            curLen++;
          } else {
            if (curLen > bestGapLen) {
              bestGapLen = curLen;
              bestGapStart = curStart;
            }
            curStart = -1;
            curLen = 0;
          }
        }
        if (curLen > bestGapLen) {
          bestGapLen = curLen;
          bestGapStart = curStart;
        }

        // Valid pipe gap spans ~14% to 42% of playable height
        if (bestGapLen >= playableBottom * 0.14 && bestGapLen <= playableBottom * 0.45) {
          detectedPipeX = x / w;
          detectedGapTop = bestGapStart / playableBottom;
          detectedGapBottom = (bestGapStart + bestGapLen) / playableBottom;
          break;
        }
      }
    }

    if (detectedPipeX !== -1) {
      this.lastPipeX = detectedPipeX;
      this.lastPipeGapCenter = (detectedGapTop + detectedGapBottom) / 2;
      this.lastPipeGapBottom = detectedGapBottom;
    } else {
      detectedPipeX = this.lastPipeX;
      detectedGapTop = this.lastPipeGapCenter - 0.12;
      detectedGapBottom = this.lastPipeGapBottom;
    }

    const gapCenter = (detectedGapTop + detectedGapBottom) / 2;
    const distToPipe = Math.max(0, detectedPipeX + 0.08 - birdX);

    const inputs = [
      birdY,
      Math.max(-1, Math.min(1, this.smoothVy)),
      Math.max(0, Math.min(1, distToPipe)),
      birdY - gapCenter + biasOffset,
      detectedGapBottom - birdY - biasOffset,
    ];

    const confidence = brain.predict(inputs);
    return {
      birdY,
      birdX,
      birdVy: this.smoothVy,
      pipeX: detectedPipeX,
      gapTop: detectedGapTop,
      gapBottom: detectedGapBottom,
      gapCenter,
      shouldFlap: confidence > 0.5,
      confidence,
      skyRgb: [skyR, skyG, skyB],
    };
  }
}
