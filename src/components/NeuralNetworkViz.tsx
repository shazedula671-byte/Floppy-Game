import React from 'react';
import { NeuralNetwork, NetworkActivation } from '../ml/neuralNet';

interface NeuralNetworkVizProps {
  brain: NeuralNetwork | null;
  activation: NetworkActivation | null;
  labels: {
    title: string;
    inputs: readonly string[];
    hiddenLayer: string;
    outputLabel: string;
    flapState: string;
    glideState: string;
  };
}

export const NeuralNetworkViz: React.FC<NeuralNetworkVizProps> = ({
  brain,
  activation,
  labels,
}) => {
  const width = 420;
  const height = 240;

  const inputCount = brain?.inputSize ?? 5;
  const hiddenCount = brain?.hiddenSize ?? 6;

  const inputX = 86;
  const hiddenX = 228;
  const outputX = 352;

  const getY = (index: number, total: number) => {
    const pad = 28;
    const usable = height - pad * 2;
    if (total <= 1) return height / 2;
    return pad + (index / (total - 1)) * usable;
  };

  const inputs = activation?.inputs ?? [0, 0, 0, 0, 0];
  const hidden = activation?.hidden ?? new Array(hiddenCount).fill(0);
  const output = activation?.output ?? 0.5;
  const shouldFlap = activation?.shouldFlap ?? false;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between gap-4 mb-3">
        <h3 className="font-display text-sm font-semibold text-slate-900">{labels.title}</h3>
        <div className="flex items-center gap-2 text-xs font-mono tabular-nums">
          <span className="text-slate-500">5-6-1 MLP</span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span className={shouldFlap ? 'font-semibold text-emerald-700' : 'font-semibold text-amber-700'}>
            {shouldFlap ? labels.flapState : labels.glideState} ({(output * 100).toFixed(0)}%)
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto block bg-slate-50/70 rounded-lg border border-slate-100"
        role="img"
        aria-label={labels.title}
      >
        {/* Input -> Hidden edges */}
        {brain &&
          Array.from({ length: hiddenCount }).map((_, h) =>
            Array.from({ length: inputCount }).map((__, i) => {
              const w = brain.weightsIH[h * inputCount + i] ?? 0;
              const y1 = getY(i, inputCount);
              const y2 = getY(h, hiddenCount);
              const stroke = w >= 0 ? '#059669' : '#DC2626';
              const opacity = Math.min(0.85, 0.14 + Math.abs(w) * 0.25);
              const strokeWidth = Math.min(3.2, 0.6 + Math.abs(w) * 0.8);
              return (
                <line
                  key={`ih-${i}-${h}`}
                  x1={inputX}
                  y1={y1}
                  x2={hiddenX}
                  y2={y2}
                  stroke={stroke}
                  strokeOpacity={opacity}
                  strokeWidth={strokeWidth}
                />
              );
            })
          )}

        {/* Hidden -> Output edges */}
        {brain &&
          Array.from({ length: hiddenCount }).map((_, h) => {
            const w = brain.weightsHO[h] ?? 0;
            const y1 = getY(h, hiddenCount);
            const y2 = getY(0, 1);
            const stroke = w >= 0 ? '#059669' : '#DC2626';
            const opacity = Math.min(0.9, 0.18 + Math.abs(w) * 0.28);
            const strokeWidth = Math.min(3.6, 0.8 + Math.abs(w) * 0.9);
            return (
              <line
                key={`ho-${h}`}
                x1={hiddenX}
                y1={y1}
                x2={outputX}
                y2={y2}
                stroke={stroke}
                strokeOpacity={opacity}
                strokeWidth={strokeWidth}
              />
            );
          })}

        {/* Input Nodes */}
        {Array.from({ length: inputCount }).map((_, i) => {
          const cy = getY(i, inputCount);
          const val = inputs[i] ?? 0;
          const intensity = Math.min(1, Math.abs(val));
          return (
            <g key={`in-${i}`}>
              <text
                x={inputX - 14}
                y={cy + 3.5}
                textAnchor="end"
                className="fill-slate-600 text-[10px] font-medium"
              >
                {labels.inputs[i] ?? `x${i}`}
              </text>
              <circle
                cx={inputX}
                cy={cy}
                r={9}
                fill={val >= 0 ? `rgba(16, 185, 129, ${0.18 + intensity * 0.65})` : `rgba(220, 38, 38, ${0.18 + intensity * 0.65})`}
                stroke="#0F172A"
                strokeWidth={1.5}
              />
            </g>
          );
        })}

        {/* Hidden Nodes */}
        {Array.from({ length: hiddenCount }).map((_, h) => {
          const cy = getY(h, hiddenCount);
          const val = hidden[h] ?? 0;
          const intensity = Math.min(1, Math.abs(val));
          return (
            <g key={`hid-${h}`}>
              <circle
                cx={hiddenX}
                cy={cy}
                r={10}
                fill={val >= 0 ? `rgba(16, 185, 129, ${0.15 + intensity * 0.75})` : `rgba(220, 38, 38, ${0.15 + intensity * 0.75})`}
                stroke="#0F172A"
                strokeWidth={1.5}
              />
            </g>
          );
        })}
        <text x={hiddenX} y={height - 6} textAnchor="middle" className="fill-slate-500 text-[10px] font-medium">
          {labels.hiddenLayer}
        </text>

        {/* Output Node */}
        <g>
          <circle
            cx={outputX}
            cy={getY(0, 1)}
            r={16}
            fill={shouldFlap ? '#10B981' : '#E2E8F0'}
            stroke="#0F172A"
            strokeWidth={2}
          />
          <text
            x={outputX}
            y={getY(0, 1) + 3.5}
            textAnchor="middle"
            className={`text-[10px] font-mono font-bold ${shouldFlap ? 'fill-white' : 'fill-slate-700'}`}
          >
            {(output * 100).toFixed(0)}%
          </text>
          <text
            x={outputX}
            y={getY(0, 1) + 32}
            textAnchor="middle"
            className="fill-slate-700 text-[10px] font-semibold"
          >
            {labels.outputLabel}
          </text>
        </g>
      </svg>
    </div>
  );
};
