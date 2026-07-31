"use client";

export type RangeSliderProps = {
  min: number;
  max: number;
  step?: number;
  valueMin: number;
  valueMax: number;
  onChangeMin: (value: number) => void;
  onChangeMax: (value: number) => void;
  minLabel?: string;
  maxLabel?: string;
};

export function RangeSlider({
  min,
  max,
  step = 1,
  valueMin,
  valueMax,
  onChangeMin,
  onChangeMax,
  minLabel = "Minimum",
  maxLabel = "Maximum"
}: RangeSliderProps) {
  const span = max - min || 1;
  const leftPercent = Math.min(100, Math.max(0, ((valueMin - min) / span) * 100));
  const rightPercent = Math.min(100, Math.max(0, ((valueMax - min) / span) * 100));

  return (
    <div className="relative h-5 w-full">
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-line" />
      <div
        className="pointer-events-none absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-accent"
        style={{ left: `${leftPercent}%`, right: `${100 - rightPercent}%` }}
      />
      <input
        type="range"
        className="range-input z-20"
        min={min}
        max={max}
        step={step}
        value={valueMin}
        onChange={(event) => onChangeMin(Math.min(Number(event.target.value), valueMax - step))}
        aria-label={minLabel}
      />
      <input
        type="range"
        className="range-input z-10"
        min={min}
        max={max}
        step={step}
        value={valueMax}
        onChange={(event) => onChangeMax(Math.max(Number(event.target.value), valueMin + step))}
        aria-label={maxLabel}
      />
    </div>
  );
}
