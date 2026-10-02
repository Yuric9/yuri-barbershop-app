import type { ReactNode } from "react";
import { Button } from "./button";
import { Icon, type IconName } from "./icon";

export type PrimaryAction = { label: string; icon?: IconName; onClick: () => void };

/**
 * Cabeçalho da tela. A ação principal (`primary`) aparece como botão no
 * computador e como botão flutuante (FAB) no celular, no estilo de aplicativo.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  primary,
  className = "",
}: {
  className?: string;
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  primary?: PrimaryAction;
}) {
  return (
    <header className={`page-header ${className}`.trim()}>
      <div className="page-header__text">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {(actions || primary) && (
        <div className="page-header__actions">
          {actions}
          {primary && (
            <Button icon={primary.icon} className="page-header__primary" onClick={primary.onClick}>
              {primary.label}
            </Button>
          )}
        </div>
      )}
      {primary && (
        <button type="button" className="fab" onClick={primary.onClick} aria-label={primary.label}>
          <Icon name={primary.icon ?? "plus"} size={22} />
          <span>{primary.label}</span>
        </button>
      )}
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
