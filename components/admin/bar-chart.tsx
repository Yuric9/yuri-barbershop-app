"use client";

import { formatMoney } from "../../lib/domain/money";

export type Bar = { key: string; label: string; title: string; value: number };

/** Gráfico de barras simples e acessível (cada barra é um botão). */
export function BarChart({ bars, selected, onSelect, label }: { bars: Bar[]; selected?: string; onSelect?: (key: string) => void; label: string }) {
  const max = Math.max(1, ...bars.map((bar) => bar.value));
  return (
    <div className="bar-chart" role="group" aria-label={label}>
      {bars.map((bar) => (
        <button
          type="button"
          key={bar.key}
          className={`bar-chart__item ${selected === bar.key ? "is-selected" : ""}`}
          onClick={() => onSelect?.(bar.key)}
          aria-pressed={onSelect ? selected === bar.key : undefined}
          aria-label={`${bar.title}: ${formatMoney(bar.value)}`}
          title={`${bar.title}: ${formatMoney(bar.value)}`}
        >
          <span className="bar-chart__value">{bar.value ? formatMoney(bar.value).replace(",00", "") : ""}</span>
          <span className="bar-chart__track">
            <span className="bar-chart__bar" style={{ height: `${Math.max(2, (bar.value / max) * 100)}%` }} />
          </span>
          <span className="bar-chart__label">{bar.label}</span>
        </button>
      ))}
    </div>
  );
}
