"use client";

import { useState } from "react";
import { api } from "../../lib/client/api";
import { REFRESH } from "../../lib/client/refresh";
import { useServices } from "../../lib/client/resources";
import type { Service, Transaction } from "../../lib/client/types";
import { useAction } from "../../lib/client/use-action";
import { formatMoney, toCents } from "../../lib/domain/money";
import { sortForQuickEntry } from "../../lib/domain/quick-entry";
import { Button } from "../ui/button";
import { LoadingState } from "../ui/feedback";
import { useFeedback } from "../ui/feedback-provider";
import { TextField } from "../ui/field";
import { Icon } from "../ui/icon";
import { Modal } from "../ui/modal";

/** Formas de pagamento do lançamento rápido (opcional). */
const QUICK_PAYMENTS = ["Pix", "Dinheiro", "Cartão"] as const;

/** Valor em centavos → texto para o campo ("30,00"). */
function toInputValue(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

type Selection = { service: Service | null };

/**
 * Lançamento rápido de atendimentos no caixa: toque no serviço, confira o
 * valor (pode mudar, para desconto ou acréscimo) e lance. Fica sempre na
 * data de hoje e pode ser desfeito logo depois.
 */
export function QuickEntry() {
  const services = useServices();
  const [selection, setSelection] = useState<Selection | null>(null);

  if (services.loading && !services.data) return <LoadingState />;
  const list = sortForQuickEntry((services.data?.services ?? []).filter((service) => service.active));

  return (
    <>
      <div className="quick-grid">
        {list.map((service) => (
          <button key={service.id} type="button" className="quick-tile" onClick={() => setSelection({ service })}>
            <strong>{service.name.trim()}</strong>
            <span>{formatMoney(service.priceCents)}</span>
          </button>
        ))}
        <button type="button" className="quick-tile quick-tile--other" onClick={() => setSelection({ service: null })}>
          <Icon name="plus" size={20} />
          <strong>Outro valor</strong>
        </button>
      </div>
      {selection && <QuickEntrySheet key={selection.service?.id ?? "outro"} service={selection.service} onClose={() => setSelection(null)} />}
    </>
  );
}

function QuickEntrySheet({ service, onClose }: { service: Service | null; onClose: () => void }) {
  const feedback = useFeedback();
  const { busy, run } = useAction();
  const [amount, setAmount] = useState(service ? toInputValue(service.priceCents) : "");
  const [payment, setPayment] = useState("");
  const [description, setDescription] = useState("");

  const cents = toCents(amount);
  const valid = cents !== null && cents > 0;
  const difference = service && valid ? cents - service.priceCents : 0;
  const label = service?.name.trim() ?? (description.trim() || "Entrada");

  async function submit() {
    if (!valid) return;
    const result = await run(
      () =>
        api<{ transaction: Transaction }>("/api/transactions", {
          method: "POST",
          body: {
            kind: "entrada",
            amount,
            serviceId: service?.id ?? null,
            description: service ? service.name.trim() : description,
            paymentMethod: payment,
          },
        }),
      { refresh: REFRESH.finance },
    );
    if (!result) return;
    onClose();
    const id = result.transaction.id;
    feedback.success(`${label} lançado · ${formatMoney(cents)}`, {
      label: "Desfazer",
      onClick: () =>
        void run(() => api(`/api/transactions/${id}`, { method: "DELETE" }), {
          success: "Lançamento desfeito.",
          refresh: REFRESH.finance,
        }),
    });
  }

  return (
    <Modal
      open
      title={service ? service.name.trim() : "Outra entrada"}
      description="Lançamento de hoje. Ajuste o valor se deu desconto ou cobrou algo a mais."
      onClose={onClose}
      onSubmit={submit}
      footer={
        <Button type="submit" className="button--block" icon="check" loading={busy} disabled={!valid}>
          Lançar {valid ? formatMoney(cents) : ""}
        </Button>
      }
    >
      <div className="form-sections">
        <div className="field">
          <label htmlFor="quick-amount">Valor (R$)</label>
          <input
            id="quick-amount"
            className="amount-input"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            onFocus={(event) => event.target.select()}
            placeholder="0,00"
          />
          {service && difference !== 0 && valid && (
            <small className="field__hint">
              {difference < 0 ? `Desconto de ${formatMoney(-difference)}` : `Acréscimo de ${formatMoney(difference)}`} sobre o preço de{" "}
              {formatMoney(service.priceCents)}
            </small>
          )}
        </div>

        {!service && (
          <TextField label="Descrição (opcional)" placeholder="Ex.: hidratação, produto avulso" maxLength={240} value={description} onChange={(event) => setDescription(event.target.value)} />
        )}

        <div className="field">
          <span className="field__label">Pagamento (opcional)</span>
          <div className="chip-row" role="radiogroup" aria-label="Forma de pagamento">
            {QUICK_PAYMENTS.map((method) => (
              <button
                key={method}
                type="button"
                role="radio"
                aria-checked={payment === method}
                className={`chip ${payment === method ? "is-selected" : ""}`}
                onClick={() => setPayment(payment === method ? "" : method)}
              >
                {method}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
