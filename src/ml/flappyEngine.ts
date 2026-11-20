import { NeuralNetwork, NetworkActivation, SerializedBrain } from './neuralNet';

export const GAME_WIDTH = 520;
export const GAME_HEIGHT = 560;
export const GROUND_HEIGHT = 64;
export const PLAYABLE_HEIGHT = GAME_HEIGHT - GROUND_HEIGHT;
export const BIRD_X = 116;
export const BIRD_RADIUS = 14;
export const GRAVITY = 0.42;
export const FLAP_IMPULSE = -7.4;
export const MAX_FALL_SPEED = 10.5;
export const PIPE_WIDTH = 66;
export const PIPE_GAP = 138;
export const PIPE_SPEED = 2.85;
export const PIPE_SPAWN_INTERVAL = 235;

export interface Pipe {
  id: number;
  x: number;
  gapTop: number;
  gapBottom: number;
  gapCenter: number;
  passed: boolean;
}

export interface BirdAgent {
  id: number;
  y: number;
  vy: number;
  rotation: number;
  alive: boolean;
  score: number;
  fitness: number;
  ticksAlive: number;
  flapCooldown: number;
  brain: NeuralNetwork;
  lastActivation: NetworkActivation | null;
}

export interface GenerationRecord {
  generation: number;
  bestScore: number;
  avgScore: number;
  bestFitness: number;
}

export type PlayMode = 'train' | 'champion' | 'human';

export interface EngineSnapshot {
  generation: number;
  aliveCount: number;
  totalCount: number;
  currentScore: number;
  bestScoreAllTime: number;
  lastGenBestScore: number;
  bestBird: BirdAgent | null;
  targetPipe: Pipe | null;
  pipes: Pipe[];
  birds: BirdAgent[];
  history: GenerationRecord[];
  championBrain: SerializedBrain | null;
  humanGameOver: boolean;
}

export interface EvolutionConfig {
  populationSize: number;
  mutationRate: number;
  mutationStrength: number;
  pipeGap: number;
}

export class FlappySimulation {
  birds: BirdAgent[] = [];
  pipes: Pipe[] = [];
  generation = 1;
  bestScoreAllTime = 0;
  lastGenBestScore = 0;
  championBrain: NeuralNetwork | null = null;
  history: GenerationRecord[] = [];
  mode: PlayMode = 'train';
  humanGameOver = false;

  private pipeCounter = 0;
  private distanceSinceLastPipe = 0;
  private config: EvolutionConfig;
  private onScoreCallback?: () => void;
  private onCrashCallback?: () => void;

  constructor(config?: Partial<EvolutionConfig>) {
    this.config = {
      populationSize: config?.populationSize ?? 50,
      mutationRate: config?.mutationRate ?? 0.14,
      mutationStrength: config?.mutationStrength ?? 0.36,
      pipeGap: config?.pipeGap ?? PIPE_GAP,
    };
    this.initPopulation();
  }

  updateConfig(partial: Partial<EvolutionConfig>): void {
    const prevPop = this.config.populationSize;
    this.config = { ...this.config, ...partial };
    if (partial.populationSize && partial.populationSize !== prevPop && this.mode === 'train') {
      this.resetTraining(this.championBrain ?? undefined);
    }
  }

  getConfig(): EvolutionConfig {
    return { ...this.config };
  }

  setAudioHooks(onScore?: () => void, onCrash?: () => void): void {
    this.onScoreCallback = onScore;
    this.onCrashCallback = onCrash;
  }

  setMode(mode: PlayMode): void {
    this.mode = mode;
    if (mode === 'champion') {
      const brain = this.championBrain ? this.championBrain.clone() : new NeuralNetwork(5, 6, 1);
      this.resetArenaWithSingleBird(brain);
    } else if (mode === 'human') {
      this.humanGameOver = false;
      this.resetArenaWithSingleBird(new NeuralNetwork(5, 6, 1));
    } else {
      this.resetArenaForCurrentPopulation();
    }
  }

  loadChampion(brain: NeuralNetwork, switchToChampion = false): void {
    this.championBrain = brain.clone();
    if (switchToChampion) {
      this.mode = 'champion';
      this.resetArenaWithSingleBird(brain.clone());
    } else if (this.mode === 'train') {
      this.resetTraining(brain);
    } else if (this.mode === 'champion') {
      this.resetArenaWithSingleBird(brain.clone());
    }
  }

  resetTraining(seedBrain?: NeuralNetwork): void {
    this.generation = 1;
    this.bestScoreAllTime = 0;
    this.lastGenBestScore = 0;
    this.history = [];
    this.championBrain = seedBrain ? seedBrain.clone() : null;
    this.initPopulation(seedBrain);
  }

  restartHuman(): void {
    this.humanGameOver = false;
    this.resetArenaWithSingleBird(new NeuralNetwork(5, 6, 1));
  }

  humanFlap(): void {
    if (this.mode !== 'human') return;
    if (this.humanGameOver) {
      this.restartHuman();
      return;
    }
    const bird = this.birds[0];
    if (bird && bird.alive) {
      bird.vy = FLAP_IMPULSE;
    }
  }

  private createBird(id: number, brain: NeuralNetwork): BirdAgent {
    return {
      id,
      y: PLAYABLE_HEIGHT * 0.45,
      vy: 0,
      rotation: 0,
      alive: true,
      score: 0,
      fitness: 0,
      ticksAlive: 0,
      flapCooldown: 0,
      brain,
      lastActivation: null,
    };
  }

  private initPopulation(seedBrain?: NeuralNetwork): void {
    this.birds = [];
    for (let i = 0; i < this.config.populationSize; i++) {
      let brain: NeuralNetwork;
      if (seedBrain && i === 0) {
        brain = seedBrain.clone();
      } else if (seedBrain && i < Math.floor(this.config.populationSize * 0.6)) {
        brain = seedBrain.clone();
        brain.mutate(this.config.mutationRate, this.config.mutationStrength * 0.6);
      } else {
        brain = new NeuralNetwork(5, 6, 1);
      }
      this.birds.push(this.createBird(i, brain));
    }
    this.resetPipes();
  }

  private resetArenaWithSingleBird(brain: NeuralNetwork): void {
    this.birds = [this.createBird(0, brain)];
    this.resetPipes();
  }

  private resetArenaForCurrentPopulation(): void {
    for (let i = 0; i < this.birds.length; i++) {
      this.birds[i] = this.createBird(i, this.birds[i].brain);
    }
    this.resetPipes();
  }

  private resetPipes(): void {
    this.pipes = [];
    this.pipeCounter = 0;
    this.distanceSinceLastPipe = PIPE_SPAWN_INTERVAL - 40;
    this.spawnPipe(GAME_WIDTH + 30);
  }

  private spawnPipe(xPos = GAME_WIDTH + 20): void {
    const gap = this.config.pipeGap;
    const minMargin = 58;
    const maxGapTop = PLAYABLE_HEIGHT - gap - minMargin;
    const gapTop = minMargin + Math.random() * Math.max(20, maxGapTop - minMargin);
    const gapBottom = gapTop + gap;

    this.pipes.push({
      id: ++this.pipeCounter,
      x: xPos,
      gapTop,
      gapBottom,
      gapCenter: (gapTop + gapBottom) / 2,
      passed: false,
    });
  }

  getNextPipe(): Pipe | null {
    for (const pipe of this.pipes) {
      if (pipe.x + PIPE_WIDTH >= BIRD_X - BIRD_RADIUS) {
        return pipe;
      }
    }
    return this.pipes[0] ?? null;
  }

  computeInputs(bird: BirdAgent, pipe: Pipe | null): number[] {
    const targetGapCenter = pipe ? pipe.gapCenter : PLAYABLE_HEIGHT * 0.5;
    const targetGapBottom = pipe ? pipe.gapBottom : PLAYABLE_HEIGHT * 0.5 + this.config.pipeGap / 2;
    const distToPipe = pipe ? Math.max(0, pipe.x + PIPE_WIDTH - BIRD_X) : GAME_WIDTH;

    return [
      bird.y / PLAYABLE_HEIGHT,
      Math.max(-1, Math.min(1, bird.vy / MAX_FALL_SPEED)),
      Math.max(0, Math.min(1, distToPipe / GAME_WIDTH)),
      (bird.y - targetGapCenter) / PLAYABLE_HEIGHT,
      (targetGapBottom - bird.y) / PLAYABLE_HEIGHT,
    ];
  }

  step(): void {
    if (this.mode === 'human' && this.humanGameOver) {
      return;
    }

    // Move pipes
    this.distanceSinceLastPipe += PIPE_SPEED;
    if (this.distanceSinceLastPipe >= PIPE_SPAWN_INTERVAL) {
      this.spawnPipe();
      this.distanceSinceLastPipe = 0;
    }

    let scoredThisTick = false;
    for (const pipe of this.pipes) {
      pipe.x -= PIPE_SPEED;
      if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X) {
        pipe.passed = true;
        scoredThisTick = true;
      }
    }
    this.pipes = this.pipes.filter((p) => p.x + PIPE_WIDTH > -30);

    const nextPipe = this.getNextPipe();
    let anyAlive = false;

    for (const bird of this.birds) {
      if (!bird.alive) continue;

      if (this.mode !== 'human') {
        const inputs = this.computeInputs(bird, nextPipe);
        const activation = bird.brain.predictDetailed(inputs);
        bird.lastActivation = activation;
        if (activation.shouldFlap && bird.flapCooldown <= 0) {
          bird.vy = FLAP_IMPULSE;
          bird.flapCooldown = 6;
        }
      }

      if (bird.flapCooldown > 0) {
        bird.flapCooldown--;
      }

      // Apply physics
      bird.vy = Math.min(MAX_FALL_SPEED, bird.vy + GRAVITY);
      bird.y += bird.vy;
      bird.rotation = Math.max(-0.48, Math.min(1.2, bird.vy * 0.095));
      bird.ticksAlive += 1;

      if (scoredThisTick) {
        bird.score += 1;
        if (bird.score > this.bestScoreAllTime) {
          this.bestScoreAllTime = bird.score;
          this.championBrain = bird.brain.clone();
        }
      }

      // Fitness rewards survival + alignment with gap center + pipes passed
      let gapBonus = 0;
      if (nextPipe) {
        const distFromCenter = Math.abs(bird.y - nextPipe.gapCenter) / PLAYABLE_HEIGHT;
        gapBonus = Math.max(0, 0.35 - distFromCenter);
      }
      bird.fitness += 1 + gapBonus + (scoredThisTick ? 120 : 0);

      // Collision checks
      const hitCeiling = bird.y - BIRD_RADIUS <= 0;
      const hitGround = bird.y + BIRD_RADIUS >= PLAYABLE_HEIGHT;
      let hitPipe = false;

      for (const pipe of this.pipes) {
        const inPipeX =
          BIRD_X + BIRD_RADIUS - 3 > pipe.x && BIRD_X - BIRD_RADIUS + 3 < pipe.x + PIPE_WIDTH;
        if (inPipeX) {
          const inGap =
            bird.y - BIRD_RADIUS + 3 > pipe.gapTop && bird.y + BIRD_RADIUS - 3 < pipe.gapBottom;
          if (!inGap) {
            hitPipe = true;
            break;
          }
        }
      }

      if (hitCeiling || hitGround || hitPipe) {
        bird.alive = false;
        if (hitCeiling) bird.y = BIRD_RADIUS;
        if (hitGround) bird.y = PLAYABLE_HEIGHT - BIRD_RADIUS;
      } else {
        anyAlive = true;
      }
    }

    if (scoredThisTick && anyAlive && (this.mode === 'human' || this.mode === 'champion')) {
      this.onScoreCallback?.();
    }

    if (!anyAlive) {
      if (this.mode === 'train') {
        this.evolveNextGeneration();
      } else if (this.mode === 'champion') {
        // Auto-restart champion cleanly
        this.onCrashCallback?.();
        const bestBrain = this.championBrain
          ? this.championBrain.clone()
          : this.birds[0]?.brain.clone() ?? new NeuralNetwork(5, 6, 1);
        this.resetArenaWithSingleBird(bestBrain);
      } else if (this.mode === 'human') {
        this.humanGameOver = true;
        this.onCrashCallback?.();
      }
    }
  }

  private evolveNextGeneration(): void {
    const sorted = [...this.birds].sort((a, b) => b.fitness - a.fitness);
    const bestBird = sorted[0];

    const totalScore = sorted.reduce((acc, b) => acc + b.score, 0);
    const avgScore = sorted.length > 0 ? totalScore / sorted.length : 0;
    this.lastGenBestScore = bestBird?.score ?? 0;

    if (bestBird && (!this.championBrain || bestBird.score >= this.bestScoreAllTime)) {
      this.championBrain = bestBird.brain.clone();
    }

    this.history = [
      ...this.history.slice(-79),
      {
        generation: this.generation,
        bestScore: bestBird?.score ?? 0,
        avgScore: Number(avgScore.toFixed(2)),
        bestFitness: Math.round(bestBird?.fitness ?? 0),
      },
    ];

    const popSize = this.config.populationSize;
    const nextBirds: BirdAgent[] = [];

    // Elitism: keep top performers untouched
    const eliteCount = Math.max(2, Math.floor(popSize * 0.1));
    for (let i = 0; i < eliteCount && i < sorted.length; i++) {
      nextBirds.push(this.createBird(i, sorted[i].brain.clone()));
    }

    // Also keep a mutated copy of the all-time champion so knowledge never regresses
    if (this.championBrain && nextBirds.length < popSize) {
      const champClone = this.championBrain.clone();
      nextBirds.push(this.createBird(nextBirds.length, champClone));
    }

    // Fitness-weighted selection pool from top 40%
    const poolSize = Math.max(2, Math.floor(sorted.length * 0.4));
    const pool = sorted.slice(0, poolSize);
    const totalFitness = pool.reduce((sum, b) => sum + Math.max(1, b.fitness), 0);

    const pickParent = (): BirdAgent => {
      let r = Math.random() * totalFitness;
      for (const candidate of pool) {
        r -= Math.max(1, candidate.fitness);
        if (r <= 0) return candidate;
      }
      return pool[0];
    };

    while (nextBirds.length < popSize) {
      const p1 = pickParent();
      const p2 = pickParent();
      const childBrain =
        Math.random() < 0.72
          ? NeuralNetwork.crossover(p1.brain, p2.brain)
          : p1.brain.clone();
      childBrain.mutate(this.config.mutationRate, this.config.mutationStrength);
      nextBirds.push(this.createBird(nextBirds.length, childBrain));
    }

    this.birds = nextBirds;
    this.generation += 1;
    this.resetPipes();
  }

  getSnapshot(): EngineSnapshot {
    const aliveBirds = this.birds.filter((b) => b.alive);
    let bestBird: BirdAgent | null = null;
    for (const b of aliveBirds) {
      if (!bestBird || b.fitness > bestBird.fitness) {
        bestBird = b;
      }
    }
    if (!bestBird) {
      bestBird = this.birds[0] ?? null;
    }

    return {
      generation: this.generation,
      aliveCount: aliveBirds.length,
      totalCount: this.birds.length,
      currentScore: bestBird?.score ?? 0,
      bestScoreAllTime: this.bestScoreAllTime,
      lastGenBestScore: this.lastGenBestScore,
      bestBird,
      targetPipe: this.getNextPipe(),
      pipes: this.pipes,
      birds: this.birds,
      history: this.history,
      championBrain: this.championBrain ? this.championBrain.serialize() : null,
      humanGameOver: this.humanGameOver,
    };
  }
}
