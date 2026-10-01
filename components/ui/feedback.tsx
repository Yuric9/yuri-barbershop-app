import type { ReactNode } from "react";
import { Button } from "./button";
import { Icon, type IconName } from "./icon";

export function Alert({ tone = "info", children }: { tone?: "info" | "warning" | "danger" | "success"; children: ReactNode }) {
  const icon: IconName = tone === "success" ? "check" : tone === "info" ? "info" : "alert";
  return (
    <div className={`alert alert--${tone}`} role={tone === "danger" ? "alert" : "status"}>
      <Icon name={icon} size={18} />
      <div>{children}</div>
    </div>
  );
}

export function EmptyState({ icon = "info", title, children, action }: { icon?: IconName; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon">
        <Icon name={icon} size={24} />
      </span>
      <strong>{title}</strong>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function LoadingState({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="loading-state" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="error-state" role="alert">
      <Icon name="alert" size={22} />
      <p>{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" icon="refresh" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}

/** Mostra carregamento/erro enquanto `data` não chega; depois renderiza `children(data)`. */
export function AsyncContent<T>({
  data,
  error,
  loading,
  onRetry,
  children,
}: {
  data: T | undefined;
  error: string;
  loading: boolean;
  onRetry?: () => void;
  children: (data: T) => ReactNode;
}) {
  if (data !== undefined) return <>{children(data)}</>;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (loading) return <LoadingState />;
  return null;
}
