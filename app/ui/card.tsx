import type { HTMLAttributes, ReactNode } from "react";

type Props = HTMLAttributes<HTMLElement> & {
  title?: string;
  eyebrow?: string;
  action?: ReactNode;
};

export function Card({ title, eyebrow, action, children, className = "", ...props }: Props) {
  return (
    <section className={`ui-card ${className}`.trim()} {...props}>
      {(title || eyebrow || action) && (
        <header className="ui-card__header">
          <div>
            {eyebrow && <small>{eyebrow}</small>}
            {title && <h3>{title}</h3>}
          </div>
          {action && <div className="ui-card__action">{action}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
