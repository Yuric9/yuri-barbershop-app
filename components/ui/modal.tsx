"use client";

import { useEffect, useRef, type FormEvent, type PointerEvent, type ReactNode } from "react";
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

/** Distância (px) que a folha precisa ser arrastada para baixo para fechar. */
const SWIPE_TO_CLOSE = 110;

/**
 * Janela modal acessível baseada no `<dialog>` nativo: prende o foco,
 * fecha com Esc e devolve o foco ao elemento anterior.
 * No celular ela aparece como uma folha que sobe de baixo (bottom sheet) e
 * pode ser fechada arrastando o cabeçalho para baixo.
 */
export function Modal({ open, title, description, onClose, children, footer, size = "md", onSubmit }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const drag = useRef<{ startY: number; distance: number } | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function startDrag(event: PointerEvent<HTMLElement>) {
    const isSheet = window.matchMedia("(max-width: 639px)").matches;
    if (!isSheet || (event.target as HTMLElement).closest("button")) return;
    drag.current = { startY: event.clientY, distance: 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: PointerEvent<HTMLElement>) {
    if (!drag.current || !ref.current) return;
    drag.current.distance = Math.max(0, event.clientY - drag.current.startY);
    ref.current.style.transition = "none";
    ref.current.style.transform = `translateY(${drag.current.distance}px)`;
  }

  function endDrag() {
    if (!drag.current || !ref.current) return;
    const shouldClose = drag.current.distance > SWIPE_TO_CLOSE;
    drag.current = null;
    ref.current.style.transition = "";
    ref.current.style.transform = "";
    if (shouldClose) onClose();
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit?.();
  }

  const body = (
    <>
      <header className="modal__header" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
        <span className="modal__handle" aria-hidden="true" />
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
