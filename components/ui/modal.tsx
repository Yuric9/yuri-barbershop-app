"use client";

import { useEffect, useRef, type FormEvent, type ReactNode } from "react";
import { IconButton } from "./button";

type ModalProps = {
  open: boolean;
  title: string;
  description?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg";
  /** Quando informado, o conteúdo vira um formulário (Enter envia). */
  onSubmit?: () => void;
};

/**
 * Janela modal acessível baseada no `<dialog>` nativo: prende o foco,
 * fecha com Esc e devolve o foco ao elemento anterior.
 */
export function Modal({ open, title, description, onClose, children, footer, size = "md", onSubmit }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit?.();
  }

  const body = (
    <>
      <header className="modal__header">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        <IconButton icon="close" label="Fechar" onClick={onClose} />
      </header>
      <div className="modal__body">{children}</div>
      {footer && <footer className="modal__footer">{footer}</footer>}
    </>
  );

  return (
    <dialog
      ref={ref}
      className={`modal modal--${size}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // Clique fora da caixa (no fundo escuro) fecha a janela.
        if (event.target === ref.current) onClose();
      }}
    >
      {open && (onSubmit ? <form onSubmit={submit} className="modal__form">{body}</form> : <div className="modal__form">{body}</div>)}
    </dialog>
  );
}
