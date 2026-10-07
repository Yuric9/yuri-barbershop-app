"use client";

import { useCallback, useState } from "react";
import { useFeedback } from "../../components/ui/feedback-provider";
import { invalidate } from "./api";

type ActionOptions = {
  /** Mensagem de sucesso exibida ao usuário. */
  success?: string;
  /** Botão no aviso de sucesso (ex.: "Desfazer"). */
  successAction?: { label: string; onClick: () => void };
  /** Prefixos de endereços da API que devem ser recarregados depois. */
  refresh?: readonly string[];
};

/**
 * Executa uma alteração (salvar, excluir...) controlando o estado "salvando",
 * exibindo a mensagem de sucesso ou de erro e atualizando as telas afetadas.
 */
export function useAction() {
  const feedback = useFeedback();
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    async <T,>(action: () => Promise<T>, options: ActionOptions = {}): Promise<T | undefined> => {
      setBusy(true);
      try {
        const result = await action();
        if (options.refresh?.length) invalidate(...options.refresh);
        if (options.success) feedback.success(options.success, options.successAction);
        return result;
      } catch (error) {
        feedback.error(error instanceof Error ? error.message : "Não foi possível concluir a operação.");
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [feedback],
  );

  return { busy, run };
}
