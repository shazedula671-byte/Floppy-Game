import React from 'react';
import { GenerationRecord } from '../ml/flappyEngine';

interface FitnessChartProps {
  history: GenerationRecord[];
  labels: {
    title: string;
    bestScore: string;
    avgScore: string;
    emptyState: string;
    generationPrefix: string;
  };
}

export const FitnessChart: React.FC<FitnessChartProps> = ({ history, labels }) => {
  const width = 420;
  const height = 165;
  const padL = 36;
  const padR = 14;
  const padT = 16;
  const padB = 26;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const maxScore = Math.max(5, ...history.map((d) => d.bestScore));

  const toX = (idx: number) => {
    if (history.length <= 1) return padL + plotW / 2;
    return padL + (idx / (history.length - 1)) * plotW;
  };
  const toY = (val: number) => padT + plotH - (val / maxScore) * plotH;

  const bestPath = history
    .map((d, idx) => `${idx === 0 ? 'M' : 'L'} ${toX(idx).toFixed(1)} ${toY(d.bestScore).toFixed(1)}`)
    .join(' ');

  const avgPath = history
    .map((d, idx) => `${idx === 0 ? 'M' : 'L'} ${toX(idx).toFixed(1)} ${toY(d.avgScore).toFixed(1)}`)
    .join(' ');

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between gap-4 mb-3">
        <h3 className="font-display text-sm font-semibold text-slate-900">{labels.title}</h3>
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-emerald-600 inline-block" />
            {labels.bestScore}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-amber-500 inline-block" />
            {labels.avgScore}
          </span>
        </div>
      </div>

      {history.length < 2 ? (
        <div className="h-[165px] rounded-lg border border-dashed border-slate-200 bg-slate-50/70 flex items-center justify-center px-4 text-center text-xs text-slate-500">
          {labels.emptyState}
        </div>
      ) : (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto block">
          {/* Horizontal grid lines */}
          {[0, 0.5, 1].map((ratio) => {
            const y = padT + plotH * (1 - ratio);
            const val = Math.round(maxScore * ratio);
            return (
              <g key={ratio}>
                <line
                  x1={padL}
                  y1={y}
                  x2={width - padR}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeDasharray={ratio === 0 ? undefined : '3 3'}
                />
                <text
                  x={padL - 6}
                  y={y + 3.5}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] font-mono tabular-nums"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Average line */}
          <path d={avgPath} fill="none" stroke="#F59E0B" strokeWidth={1.75} strokeLinejoin="round" />

          {/* Best line */}
          <path d={bestPath} fill="none" stroke="#059669" strokeWidth={2.25} strokeLinejoin="round" />

          {/* Latest generation label */}
          <text
            x={padL}
            y={height - 6}
            className="fill-slate-400 text-[10px] font-mono tabular-nums"
          >
            {labels.generationPrefix} {history[0].generation}
          </text>
          <text
            x={width - padR}
            y={height - 6}
            textAnchor="end"
            className="fill-slate-500 text-[10px] font-mono tabular-nums"
          >
            {labels.generationPrefix} {history[history.length - 1].generation}
          </text>
        </svg>
      )}
    </div>
  );
};
