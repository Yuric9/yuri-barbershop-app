import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  );
}

export function Panel({ title, eyebrow, actions, children, className = "" }: { title?: string; eyebrow?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`panel ${className}`.trim()}>
      {(title || actions) && (
        <header className="panel__header">
          <div>
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            {title && <h3>{title}</h3>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

export function Metric({ label, value, hint, highlight = false }: { label: string; value: ReactNode; hint?: ReactNode; highlight?: boolean }) {
  return (
    <article className={`metric ${highlight ? "metric--highlight" : ""}`.trim()}>
      <span className="metric__label">{label}</span>
      <strong className="metric__value">{value}</strong>
      {hint && <span className="metric__hint">{hint}</span>}
    </article>
  );
}

export function MetricGrid({ children }: { children: ReactNode }) {
  return <div className="metric-grid">{children}</div>;
}

export type BadgeTone = "neutral" | "gold" | "success" | "warning" | "danger" | "info";

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span className={`avatar avatar--${size}`} aria-hidden="true">
      {initials || "?"}
    </span>
  );
}

export function Tabs<T extends string>({ value, onChange, items, label }: { value: T; onChange: (value: T) => void; items: { value: T; label: string; count?: number }[]; label: string }) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={value === item.value}
          className={value === item.value ? "is-active" : ""}
          onClick={() => onChange(item.value)}
        >
          {item.label}
          {item.count !== undefined && <span className="tabs__count">{item.count}</span>}
        </button>
      ))}
    </div>
  );
}
