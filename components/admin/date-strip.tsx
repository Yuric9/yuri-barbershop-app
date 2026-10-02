"use client";

import { useEffect, useRef } from "react";
import { addDays, formatWeekdayShort, todayKey } from "../../lib/domain/dates";

const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Faixa horizontal de dias (deslizável no celular) para escolher a data. */
export function DateStrip({ value, onChange, before = 3, after = 17 }: { value: string; onChange: (date: string) => void; before?: number; after?: number }) {
  const today = todayKey();
  const selectedRef = useRef<HTMLButtonElement>(null);
  const days = Array.from({ length: before + after + 1 }, (_, index) => addDays(value, index - before));

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [value]);

  return (
    <div className="date-strip" role="listbox" aria-label="Escolher dia">
      {days.map((day) => {
        const selected = day === value;
        return (
          <button
            key={day}
            ref={selected ? selectedRef : undefined}
            type="button"
            role="option"
            aria-selected={selected}
            className={`date-strip__day ${selected ? "is-selected" : ""} ${day === today ? "is-today" : ""}`}
            onClick={() => onChange(day)}
          >
            <span>{day === today ? "Hoje" : formatWeekdayShort(day)}</span>
            <strong>{Number(day.slice(8))}</strong>
            <small>{MONTHS_SHORT[Number(day.slice(5, 7)) - 1]}</small>
          </button>
        );
      })}
    </div>
  );
}
