import React, { useEffect, useRef } from 'react';
import {
  BIRD_RADIUS,
  BIRD_X,
  EngineSnapshot,
  GAME_HEIGHT,
  GAME_WIDTH,
  GROUND_HEIGHT,
  PIPE_WIDTH,
  PLAYABLE_HEIGHT,
  PlayMode,
} from '../ml/flappyEngine';
import { VisionDetection } from '../ml/visionBot';

export type ArenaTheme = 'daylight' | 'dusk' | 'midnight';

interface FlappyCanvasProps {
  snapshot: EngineSnapshot;
  mode: PlayMode;
  theme: ArenaTheme;
  showSensors: boolean;
  visionDetection: VisionDetection | null;
  showVisionOverlay: boolean;
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
  onHumanFlap: () => void;
  onRestartHuman: () => void;
  labels: {
    score: string;
    clickToFlap: string;
    gameOver: string;
    playAgain: string;
    visionLock: string;
  };
}

const THEME_PALETTES: Record<
  ArenaTheme,
  {
    skyTop: string;
    skyBottom: string;
    cloud: string;
    pipeBody: string;
    pipeRim: string;
    pipeBorder: string;
    groundTop: string;
    groundBody: string;
    groundStripe: string;
    birdBest: string;
    birdWing: string;
    birdGhost: string;
    textMain: string;
  }
> = {
  daylight: {
    skyTop: '#38BDF8',
    skyBottom: '#BAE6FD',
    cloud: 'rgba(255,255,255,0.75)',
    pipeBody: '#16A34A',
    pipeRim: '#22C55E',
    pipeBorder: '#14532D',
    groundTop: '#84CC16',
    groundBody: '#D9B97C',
    groundStripe: '#C29D59',
    birdBest: '#F59E0B',
    birdWing: '#FEF08A',
    birdGhost: 'rgba(245, 158, 11, 0.28)',
    textMain: '#0F172A',
  },
  dusk: {
    skyTop: '#312E81',
    skyBottom: '#F97316',
    cloud: 'rgba(254, 215, 170, 0.35)',
    pipeBody: '#0D9488',
    pipeRim: '#14B8A6',
    pipeBorder: '#134E4A',
    groundTop: '#B45309',
    groundBody: '#451A03',
    groundStripe: '#78350F',
    birdBest: '#FACC15',
    birdWing: '#FEF9C3',
    birdGhost: 'rgba(250, 204, 21, 0.28)',
    textMain: '#FFFFFF',
  },
  midnight: {
    skyTop: '#0F172A',
    skyBottom: '#1E293B',
    cloud: 'rgba(148, 163, 184, 0.16)',
    pipeBody: '#059669',
    pipeRim: '#10B981',
    pipeBorder: '#064E3B',
    groundTop: '#334155',
    groundBody: '#020617',
    groundStripe: '#1E293B',
    birdBest: '#38BDF8',
    birdWing: '#E0F2FE',
    birdGhost: 'rgba(56, 189, 248, 0.26)',
    textMain: '#F8FAFC',
  },
};

export const FlappyCanvas: React.FC<FlappyCanvasProps> = ({
  snapshot,
  mode,
  theme,
  showSensors,
  visionDetection,
  showVisionOverlay,
  onCanvasReady,
  onHumanFlap,
  onRestartHuman,
  labels,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const groundOffsetRef = useRef(0);

  useEffect(() => {
    onCanvasReady?.(canvasRef.current);
    return () => onCanvasReady?.(null);
  }, [onCanvasReady]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const palette = THEME_PALETTES[theme];
    groundOffsetRef.current = (groundOffsetRef.current + 2.85) % 28;

    // 1. Sky backdrop
    const skyGrad = ctx.createLinearGradient(0, 0, 0, PLAYABLE_HEIGHT);
    skyGrad.addColorStop(0, palette.skyTop);
    skyGrad.addColorStop(1, palette.skyBottom);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, GAME_WIDTH, PLAYABLE_HEIGHT);

    // 2. Soft clouds (subtle parallax)
    ctx.fillStyle = palette.cloud;
    const cloudDrift = (snapshot.pipes[0]?.x ?? 0) * 0.15;
    const cloudCoords = [
      [70, 95, 36],
      [230, 68, 44],
      [410, 120, 32],
    ];
    for (const [cx, cy, r] of cloudCoords) {
      const x = ((cx + cloudDrift) % (GAME_WIDTH + 120) + (GAME_WIDTH + 120)) % (GAME_WIDTH + 120) - 60;
      ctx.beginPath();
      ctx.arc(x, cy, r * 0.65, 0, Math.PI * 2);
      ctx.arc(x + r * 0.55, cy - 6, r * 0.8, 0, Math.PI * 2);
      ctx.arc(x + r * 1.15, cy, r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Pipes
    for (const pipe of snapshot.pipes) {
      // Top pipe body
      ctx.fillStyle = palette.pipeBody;
      ctx.strokeStyle = palette.pipeBorder;
      ctx.lineWidth = 2;
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.gapTop);
      ctx.strokeRect(pipe.x, -2, PIPE_WIDTH, pipe.gapTop + 2);

      // Top pipe lip
      ctx.fillStyle = palette.pipeRim;
      ctx.fillRect(pipe.x - 4, pipe.gapTop - 22, PIPE_WIDTH + 8, 22);
      ctx.strokeRect(pipe.x - 4, pipe.gapTop - 22, PIPE_WIDTH + 8, 22);

      // Bottom pipe body
      const botH = PLAYABLE_HEIGHT - pipe.gapBottom;
      ctx.fillStyle = palette.pipeBody;
      ctx.fillRect(pipe.x, pipe.gapBottom, PIPE_WIDTH, botH);
      ctx.strokeRect(pipe.x, pipe.gapBottom, PIPE_WIDTH, botH + 2);

      // Bottom pipe lip
      ctx.fillStyle = palette.pipeRim;
      ctx.fillRect(pipe.x - 4, pipe.gapBottom, PIPE_WIDTH + 8, 22);
      ctx.strokeRect(pipe.x - 4, pipe.gapBottom, PIPE_WIDTH + 8, 22);
    }

    // 4. Neural sensor rays for the best bird
    const best = snapshot.bestBird;
    const pipe = snapshot.targetPipe;
    if (showSensors && best && best.alive && pipe && mode !== 'human') {
      ctx.save();
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1.5;

      // Line to gap center
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
      ctx.beginPath();
      ctx.moveTo(BIRD_X, best.y);
      ctx.lineTo(pipe.x + PIPE_WIDTH / 2, pipe.gapCenter);
      ctx.stroke();

      // Line to top & bottom gap lips
      ctx.strokeStyle = 'rgba(220, 38, 38, 0.65)';
      ctx.beginPath();
      ctx.moveTo(BIRD_X, best.y);
      ctx.lineTo(pipe.x, pipe.gapTop);
      ctx.moveTo(BIRD_X, best.y);
      ctx.lineTo(pipe.x, pipe.gapBottom);
      ctx.stroke();

      // Gap target marker
      ctx.setLineDash([]);
      ctx.fillStyle = '#10B981';
      ctx.beginPath();
      ctx.arc(pipe.x + PIPE_WIDTH / 2, pipe.gapCenter, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 5. Birds (ghost population first, best bird on top)
    const drawBird = (y: number, rotation: number, isBest: boolean, flapUp: boolean) => {
      ctx.save();
      ctx.translate(BIRD_X, y);
      ctx.rotate(rotation);

      // Body
      ctx.fillStyle = isBest ? palette.birdBest : palette.birdGhost;
      ctx.beginPath();
      ctx.ellipse(0, 0, BIRD_RADIUS + 2, BIRD_RADIUS - 1, 0, 0, Math.PI * 2);
      ctx.fill();

      if (isBest) {
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Wing
        ctx.fillStyle = palette.birdWing;
        ctx.beginPath();
        ctx.ellipse(-4, flapUp ? -4 : 3, 8, 5, flapUp ? -0.35 : 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Eye
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(7, -4, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.arc(8.5, -4, 2, 0, Math.PI * 2);
        ctx.fill();

        // Beak
        ctx.fillStyle = '#EA580C';
        ctx.beginPath();
        ctx.moveTo(12, -1);
        ctx.lineTo(20, 2);
        ctx.lineTo(12, 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    };

    for (const bird of snapshot.birds) {
      if (!bird.alive || bird === best) continue;
      drawBird(bird.y, bird.rotation, false, bird.vy < 0);
    }

    if (best && (best.alive || mode === 'human')) {
      drawBird(best.y, best.rotation, true, best.vy < 0);
    }

    // 6. Ground layer
    ctx.fillStyle = palette.groundBody;
    ctx.fillRect(0, PLAYABLE_HEIGHT, GAME_WIDTH, GROUND_HEIGHT);

    ctx.fillStyle = palette.groundTop;
    ctx.fillRect(0, PLAYABLE_HEIGHT, GAME_WIDTH, 12);

    ctx.fillStyle = palette.groundStripe;
    for (let gx = -groundOffsetRef.current; gx < GAME_WIDTH + 28; gx += 28) {
      ctx.beginPath();
      ctx.moveTo(gx, PLAYABLE_HEIGHT + 12);
      ctx.lineTo(gx + 14, PLAYABLE_HEIGHT + 12);
      ctx.lineTo(gx + 6, PLAYABLE_HEIGHT + 24);
      ctx.lineTo(gx - 8, PLAYABLE_HEIGHT + 24);
      ctx.closePath();
      ctx.fill();
    }

    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, PLAYABLE_HEIGHT);
    ctx.lineTo(GAME_WIDTH, PLAYABLE_HEIGHT);
    ctx.stroke();

    // 7. Vision Bot HUD overlay (if enabled, drawn AFTER gameplay or only visually)
    if (showVisionOverlay && visionDetection) {
      ctx.save();
      const bx = visionDetection.birdX * GAME_WIDTH;
      const by = visionDetection.birdY * PLAYABLE_HEIGHT;
      const px = visionDetection.pipeX * GAME_WIDTH;
      const gt = visionDetection.gapTop * PLAYABLE_HEIGHT;
      const gb = visionDetection.gapBottom * PLAYABLE_HEIGHT;

      ctx.strokeStyle = visionDetection.shouldFlap ? '#10B981' : '#F59E0B';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(bx - 18, by - 18, 36, 36);

      ctx.strokeStyle = '#0284C7';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(px, gt, 56, Math.max(20, gb - gt));

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(12, GAME_HEIGHT - 44, 240, 30);
      ctx.fillStyle = '#F8FAFC';
      ctx.font = '600 11px "JetBrains Mono", monospace';
      ctx.fillText(
        `${labels.visionLock}: ${(visionDetection.confidence * 100).toFixed(0)}% ${
          visionDetection.shouldFlap ? 'FLAP' : 'GLIDE'
        }`,
        22,
        GAME_HEIGHT - 25
      );
      ctx.restore();
    }
  }, [snapshot, theme, showSensors, mode, visionDetection, showVisionOverlay, labels.visionLock]);

  return (
    <div className="relative w-full max-w-[520px] mx-auto select-none">
      <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 shadow-sm">
        {/* Top Score HUD */}
        <div className="pointer-events-none absolute top-3 inset-x-0 flex items-center justify-center z-10">
          <div className="px-4 py-1.5 rounded-lg bg-slate-950/75 backdrop-blur-sm border border-white/15 text-white flex items-center gap-3">
            <span className="text-xs font-medium text-slate-300">{labels.score}</span>
            <span className="font-mono text-2xl font-bold tabular-nums leading-none">
              {snapshot.currentScore}
            </span>
          </div>
        </div>

        <canvas
          ref={canvasRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          onClick={() => {
            if (mode === 'human') onHumanFlap();
          }}
          className={`block w-full h-auto aspect-[520/560] ${
            mode === 'human' ? 'cursor-pointer' : 'cursor-default'
          }`}
        />

        {/* Human mode prompt / Game Over overlay */}
        {mode === 'human' && !snapshot.humanGameOver && snapshot.currentScore === 0 && (snapshot.bestBird?.ticksAlive ?? 0) < 12 && (
          <div className="pointer-events-none absolute bottom-20 inset-x-0 flex justify-center">
            <div className="px-3.5 py-1.5 rounded-lg bg-slate-950/75 text-white text-xs font-medium">
              {labels.clickToFlap}
            </div>
          </div>
        )}

        {mode === 'human' && snapshot.humanGameOver && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] flex items-center justify-center p-6">
            <div className="bg-white text-slate-900 rounded-xl p-6 w-full max-w-[280px] text-center border border-slate-200 shadow-lg">
              <h3 className="font-display text-xl font-bold mb-1">{labels.gameOver}</h3>
              <p className="text-sm text-slate-600 mb-4 tabular-nums">
                {labels.score}: <span className="font-mono font-bold text-slate-900">{snapshot.currentScore}</span>
              </p>
              <button
                type="button"
                onClick={onRestartHuman}
                className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {labels.playAgain}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
