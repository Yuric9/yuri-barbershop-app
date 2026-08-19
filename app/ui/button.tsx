import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  icon?: ReactNode;
  loading?: boolean;
};

export function Button({ variant = "primary", icon, loading = false, children, className = "", disabled, ...props }: Props) {
  return (
    <button
      className={`ui-button ui-button--${variant} ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {icon && <span className="ui-button__icon" aria-hidden="true">{icon}</span>}
      <span>{loading ? "Aguarde..." : children}</span>
    </button>
  );
}
