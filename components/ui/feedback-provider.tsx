"use client";

/**
 * Avisos temporários (toasts) e confirmações, disponíveis em todo o painel
 * pelos hooks `useToast()` e `useConfirm()`.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "./button";
import { Icon } from "./icon";
import { Modal } from "./modal";

type ToastAction = { label: string; onClick: () => void };
type Toast = { id: number; tone: "success" | "danger"; message: string; action?: ToastAction };
type ConfirmOptions = { title: string; message: ReactNode; confirmLabel?: string; danger?: boolean };

type FeedbackContextValue = {
  /** Aviso de sucesso; `action` mostra um botão (ex.: "Desfazer"). */
  success: (message: string, action?: ToastAction) => void;
  error: (message: string) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pending, setPending] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<(value: boolean) => void>(undefined);
  const nextId = useRef(1);
  const toastLayer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reabrir o popover o coloca acima de qualquer modal aberto depois dele.
    const layer = toastLayer.current;
    if (!layer?.showPopover) return;
    if (layer.matches(":popover-open")) layer.hidePopover();
    if (toasts.length) layer.showPopover();
  }, [toasts]);

  const dismiss = useCallback((id: number) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);

  const push = useCallback(
    (tone: Toast["tone"], message: string, action?: ToastAction) => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-2), { id, tone, message, action }]);
      // Com botão de ação, o aviso fica mais tempo na tela.
      window.setTimeout(() => dismiss(id), action ? 8000 : tone === "danger" ? 7000 : 4000);
    },
    [dismiss],
  );

  const confirm = useCallback((options: ConfirmOptions) => {
    setPending(options);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const answer = (value: boolean) => {
    resolver.current?.(value);
    setPending(null);
  };

  const value = useMemo(
    () => ({
      success: (message: string, action?: ToastAction) => push("success", message, action),
      error: (message: string) => push("danger", message),
      confirm,
    }),
    [push, confirm],
  );

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <div ref={toastLayer} className="toasts" popover="manual" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.tone}`} role={toast.tone === "danger" ? "alert" : "status"}>
            <Icon name={toast.tone === "success" ? "check" : "alert"} size={18} />
            <span>{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                className="toast__action"
                onClick={() => {
                  dismiss(toast.id);
                  toast.action?.onClick();
                }}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
      <Modal
        open={Boolean(pending)}
        title={pending?.title ?? ""}
        onClose={() => answer(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => answer(false)}>
              Voltar
            </Button>
            <Button variant={pending?.danger ? "danger" : "primary"} onClick={() => answer(true)} autoFocus>
              {pending?.confirmLabel ?? "Confirmar"}
            </Button>
          </>
        }
      >
        <div className="confirm-message">{pending?.message}</div>
      </Modal>
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error("useFeedback precisa estar dentro de <FeedbackProvider>.");
  return context;
}
