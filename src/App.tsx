import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Brain,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ArenaTheme, FlappyCanvas } from './components/FlappyCanvas';
import { FitnessChart } from './components/FitnessChart';
import { NeuralNetworkViz } from './components/NeuralNetworkViz';
import { WebsiteBotExporter } from './components/WebsiteBotExporter';
import { COPY, Locale } from './i18n/copy';
import { soundFx } from './ml/audioFx';
import {
  EngineSnapshot,
  FlappySimulation,
  GenerationRecord,
  PIPE_GAP,
  PlayMode,
} from './ml/flappyEngine';
import {
  createPreTrainedChampion,
  NeuralNetwork,
  SerializedBrain,
} from './ml/neuralNet';
import { PixelVisionTracker, VisionDetection } from './ml/visionBot';

const STORAGE_BRAIN_KEY = 'flappyml_saved_champion_v1';
const STORAGE_HISTORY_KEY = 'flappyml_saved_history_v1';
const STORAGE_BEST_KEY = 'flappyml_saved_best_score_v1';

interface SavedState {
  brain: SerializedBrain | null;
  history: GenerationRecord[];
  bestScore: number;
}

function loadSavedState(): SavedState {
  try {
    const rawBrain = localStorage.getItem(STORAGE_BRAIN_KEY);
    const rawHistory = localStorage.getItem(STORAGE_HISTORY_KEY);
    const rawBest = localStorage.getItem(STORAGE_BEST_KEY);
    return {
      brain: rawBrain ? (JSON.parse(rawBrain) as SerializedBrain) : null,
      history: rawHistory ? (JSON.parse(rawHistory) as GenerationRecord[]) : [],
      bestScore: rawBest ? Number(rawBest) || 0 : 0,
    };
  } catch {
    return { brain: null, history: [], bestScore: 0 };
  }
}

export default function App() {
  const [locale, setLocale] = useState<Locale>('en');
  const t = COPY[locale];

  const simRef = useRef<FlappySimulation | null>(null);
  const visionTrackerRef = useRef<PixelVisionTracker | null>(null);
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);

  if (!simRef.current) {
    const saved = loadSavedState();
    const sim = new FlappySimulation({ populationSize: 50, mutationRate: 0.14, pipeGap: PIPE_GAP });
    if (saved.brain) {
      sim.championBrain = NeuralNetwork.deserialize(saved.brain);
      sim.bestScoreAllTime = saved.bestScore;
      sim.history = saved.history;
      if (saved.history.length > 0) {
        sim.generation = saved.history[saved.history.length - 1].generation + 1;
      }
      sim.loadChampion(sim.championBrain, false);
    }
    simRef.current = sim;
  }

  const [snapshot, setSnapshot] = useState<EngineSnapshot>(() => simRef.current!.getSnapshot());
  const [mode, setMode] = useState<PlayMode>('train');
  const [running, setRunning] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(1);
  const [theme, setTheme] = useState<ArenaTheme>('daylight');
  const [showSensors, setShowSensors] = useState<boolean>(true);
  const [muted, setMuted] = useState<boolean>(true);
  const [visionOverlay, setVisionOverlay] = useState<boolean>(false);
  const [visionDetection, setVisionDetection] = useState<VisionDetection | null>(null);

  // Hyperparameter state
  const [popSize, setPopSize] = useState<number>(50);
  const [mutationRate, setMutationRate] = useState<number>(0.14);
  const [pipeGap, setPipeGap] = useState<number>(PIPE_GAP);
  const [usingPretrained, setUsingPretrained] = useState<boolean>(false);

  // Sound hooks
  useEffect(() => {
    soundFx.muted = muted;
    simRef.current?.setAudioHooks(
      () => soundFx.playScore(),
      () => soundFx.playCrash()
    );
  }, [muted]);

  // Persist champion & history when best score or generation updates
  useEffect(() => {
    try {
      if (snapshot.championBrain) {
        localStorage.setItem(STORAGE_BRAIN_KEY, JSON.stringify(snapshot.championBrain));
      }
      if (snapshot.history.length > 0) {
        localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(snapshot.history));
      }
      localStorage.setItem(STORAGE_BEST_KEY, String(snapshot.bestScoreAllTime));
    } catch {
      // Ignore storage quota errors
    }
  }, [snapshot.generation, snapshot.bestScoreAllTime, snapshot.championBrain, snapshot.history]);

  // Keyboard spacebar support for Human play mode
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (mode !== 'human') return;
      if (e.code === 'Space' || e.key === ' ') {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return;
        e.preventDefault();
        simRef.current?.humanFlap();
        soundFx.playFlap();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mode]);

  // Main 60Hz simulation loop
  useEffect(() => {
    if (!running) return;
    let rafId = 0;

    const tick = () => {
      const sim = simRef.current;
      if (sim) {
        const stepsPerFrame = mode === 'train' ? speed : 1;
        for (let s = 0; s < stepsPerFrame; s++) {
          sim.step();
        }
        const nextSnap = sim.getSnapshot();
        setSnapshot(nextSnap);

        // If Vision Overlay test is active, scan the rendered canvas pixels
        if (visionOverlay && canvasElRef.current) {
          if (!visionTrackerRef.current) {
            visionTrackerRef.current = new PixelVisionTracker();
          }
          const activeNet = nextSnap.championBrain
            ? NeuralNetwork.deserialize(nextSnap.championBrain)
            : createPreTrainedChampion();
          const detection = visionTrackerRef.current.analyzeAndPredict(
            canvasElRef.current,
            activeNet
          );
          setVisionDetection(detection);
        } else if (!visionOverlay && visionDetection !== null) {
          setVisionDetection(null);
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [running, speed, mode, visionOverlay]);

  const handleModeChange = (nextMode: PlayMode) => {
    setMode(nextMode);
    if (nextMode !== 'train') {
      setSpeed(1);
    }
    simRef.current?.setMode(nextMode);
    setSnapshot(simRef.current!.getSnapshot());
    setRunning(true);
  };

  const handleLoadPretrained = () => {
    const champ = createPreTrainedChampion();
    setUsingPretrained(true);
    simRef.current?.loadChampion(champ, true);
    setMode('champion');
    setSpeed(1);
    setRunning(true);
    setSnapshot(simRef.current!.getSnapshot());
  };

  const handleResetTraining = () => {
    setUsingPretrained(false);
    localStorage.removeItem(STORAGE_BRAIN_KEY);
    localStorage.removeItem(STORAGE_HISTORY_KEY);
    localStorage.removeItem(STORAGE_BEST_KEY);
    simRef.current?.resetTraining();
    setMode('train');
    setRunning(true);
    setSnapshot(simRef.current!.getSnapshot());
  };

  const handleHumanFlap = useCallback(() => {
    simRef.current?.humanFlap();
    soundFx.playFlap();
  }, []);

  const handleRestartHuman = useCallback(() => {
    simRef.current?.restartHuman();
    setSnapshot(simRef.current!.getSnapshot());
  }, []);

  const activeExportBrain: SerializedBrain = useMemo(() => {
    if (snapshot.championBrain) return snapshot.championBrain;
    if (snapshot.bestBird) return snapshot.bestBird.brain.serialize();
    return createPreTrainedChampion().serialize();
  }, [snapshot.championBrain, snapshot.bestBird]);

  const brainSourceLabel =
    usingPretrained || (!snapshot.championBrain && snapshot.bestScoreAllTime === 0)
      ? t.exporter.pretrainedSource
      : `${t.exporter.evolvedSource} (Best ${snapshot.bestScoreAllTime})`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single text wordmark */}
          <a
            href="#top"
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            {t.brand}
          </a>

          {/* Zone 2: 4 concise single-line nav links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a
              href="#arena"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              {t.nav.arena}
            </a>
            <a
              href="#neural-inspector"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              {t.nav.neural}
            </a>
            <a
              href="#score-curve"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              {t.nav.progress}
            </a>
            <a
              href="#website-bot"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              {t.nav.exportBot}
            </a>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="shrink-0">
            <a
              href="#website-bot"
              className="inline-flex items-center px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              {t.topCta}
            </a>
          </div>
        </div>
      </header>

      <main id="top" className="flex-1 max-w-[1280px] w-full mx-auto px-6 py-8 space-y-8">
        {/* Hero Intro + Workspace Toolbar */}
        <section className="space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="max-w-2xl">
              <h1
                className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight"
                style={{ textWrap: 'balance' }}
              >
                {t.heroTitle}
              </h1>
              <p className="text-slate-600 text-base mt-2 leading-relaxed">{t.heroSubtitle}</p>
            </div>

            {/* Language Switcher in Workspace */}
            <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg self-start lg:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setLocale('en')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  locale === 'en' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLocale('bn')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  locale === 'bn' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                বাংলা
              </button>
            </div>
          </div>

          {/* Workspace Control Toolbar */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
            {/* Play Mode Segmented Tabs */}
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(['train', 'champion', 'human'] as PlayMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleModeChange(m)}
                  className={`px-3.5 py-2 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    mode === m
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.modes[m]}
                </button>
              ))}
            </div>

            {/* Simulation Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Speed selector (Train mode) */}
              {mode === 'train' && (
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                  <span className="px-2 text-xs font-medium text-slate-500">{t.controls.speed}</span>
                  {[1, 3, 10, 25].map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => setSpeed(spd)}
                      className={`px-2.5 py-1.5 rounded-md font-mono text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        speed === spd
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {spd === 25 ? 'MAX' : `${spd}x`}
                    </button>
                  ))}
                </div>
              )}

              {/* Theme selector */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                {(['daylight', 'dusk', 'midnight'] as ArenaTheme[]).map((th) => (
                  <button
                    key={th}
                    type="button"
                    onClick={() => setTheme(th)}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      theme === th
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t.controls.themes[th]}
                  </button>
                ))}
              </div>

              {/* Pause / Resume */}
              <button
                type="button"
                onClick={() => setRunning((r) => !r)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {running ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{running ? t.controls.pause : t.controls.play}</span>
              </button>

              {/* Sound toggle */}
              <button
                type="button"
                onClick={() => setMuted((m) => !m)}
                aria-label={muted ? t.controls.soundOff : t.controls.soundOn}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{muted ? t.controls.soundOff : t.controls.soundOn}</span>
              </button>
            </div>
          </div>
        </section>

        {/* Primary Two-Zone Interactive Sandbox */}
        <section id="arena" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Playable Arena + 4 KPI Strip */}
          <div className="lg:col-span-6 space-y-4">
            <FlappyCanvas
              snapshot={snapshot}
              mode={mode}
              theme={theme}
              showSensors={showSensors}
              visionDetection={visionDetection}
              showVisionOverlay={visionOverlay}
              onCanvasReady={(el) => {
                canvasElRef.current = el;
              }}
              onHumanFlap={handleHumanFlap}
              onRestartHuman={handleRestartHuman}
              labels={t.canvas}
            />

            {/* 4-column KPI strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-[520px] mx-auto">
              <div className="bg-white border border-slate-200 rounded-xl p-3.5">
                <div className="text-xs text-slate-500 font-medium">{t.kpis.generation}</div>
                <div className="font-mono text-2xl font-bold text-slate-900 tabular-nums mt-0.5">
                  {snapshot.generation}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3.5">
                <div className="text-xs text-slate-500 font-medium">{t.kpis.alive}</div>
                <div className="font-mono text-2xl font-bold text-slate-900 tabular-nums mt-0.5">
                  {snapshot.aliveCount}/{snapshot.totalCount}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3.5">
                <div className="text-xs text-slate-500 font-medium">{t.kpis.currentScore}</div>
                <div className="font-mono text-2xl font-bold text-slate-900 tabular-nums mt-0.5">
                  {snapshot.currentScore}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3.5">
                <div className="text-xs text-slate-500 font-medium">{t.kpis.bestAllTime}</div>
                <div className="font-mono text-2xl font-bold text-emerald-700 tabular-nums mt-0.5">
                  {snapshot.bestScoreAllTime}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Neural Inspector, Fitness Curve, Hyperparameters */}
          <div className="lg:col-span-6 space-y-4">
            <div id="neural-inspector">
              <NeuralNetworkViz
                brain={snapshot.bestBird?.brain ?? null}
                activation={snapshot.bestBird?.lastActivation ?? null}
                labels={t.neural}
              />
            </div>

            <div id="score-curve">
              <FitnessChart history={snapshot.history} labels={t.chart} />
            </div>

            {/* Training Hyperparameters & Quick Brain Actions */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1.5">
                    <span>{t.controls.population}</span>
                    <span className="font-mono tabular-nums text-slate-900">{popSize}</span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={100}
                    step={10}
                    value={popSize}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setPopSize(val);
                      simRef.current?.updateConfig({ populationSize: val });
                    }}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1.5">
                    <span>{t.controls.mutationRate}</span>
                    <span className="font-mono tabular-nums text-slate-900">
                      {Math.round(mutationRate * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.04}
                    max={0.35}
                    step={0.02}
                    value={mutationRate}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setMutationRate(val);
                      simRef.current?.updateConfig({ mutationRate: val });
                    }}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1.5">
                    <span>{t.controls.pipeGap}</span>
                    <span className="font-mono tabular-nums text-slate-900">{pipeGap}px</span>
                  </div>
                  <input
                    type="range"
                    min={112}
                    max={172}
                    step={4}
                    value={pipeGap}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setPipeGap(val);
                      simRef.current?.updateConfig({ pipeGap: val });
                    }}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSensors}
                    onChange={(e) => setShowSensors(e.target.checked)}
                    className="rounded accent-emerald-600"
                  />
                  <span>{t.controls.sensors}</span>
                </label>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLoadPretrained}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Brain className="w-3.5 h-3.5" />
                    <span>{t.controls.loadChampion}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetTraining}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t.controls.reset}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Universal Website Bot Exporter */}
        <WebsiteBotExporter
          activeBrain={activeExportBrain}
          brainSourceLabel={brainSourceLabel}
          visionOverlayEnabled={visionOverlay}
          onToggleVisionTest={() => {
            setVisionOverlay((v) => !v);
            if (!visionOverlay && mode === 'train') {
              handleModeChange('champion');
            }
          }}
          labels={t.exporter}
        />
      </main>

      <footer className="border-t border-slate-200 bg-white py-5 mt-8">
        <div className="max-w-[1280px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>{t.storageNote}</span>
          <span className="font-mono">FlappyML Studio · 5-6-1 Neuroevolution</span>
        </div>
      </footer>
    </div>
  );
}
