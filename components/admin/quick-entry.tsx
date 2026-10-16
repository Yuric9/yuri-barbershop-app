"use client";

import { useState, type ReactNode } from "react";
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

/** Quantos serviços aparecem como botão grande (Corte, Barba e Combo). */
const MAIN_SERVICES = 3;

/**
 * Lançamento rápido de atendimentos no caixa: toque no serviço, confira o
 * valor (pode mudar, para desconto ou acréscimo) e lance. Fica sempre na
 * data de hoje e pode ser desfeito logo depois. Só os serviços principais
 * ficam à vista; os demais abrem em "Outros".
 */
export function QuickEntry({ extra }: { extra?: ReactNode }) {
  const services = useServices();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  if (services.loading && !services.data) return <LoadingState />;
  const list = sortForQuickEntry((services.data?.services ?? []).filter((service) => service.active));
  const main = list.slice(0, MAIN_SERVICES);
  const others = list.slice(MAIN_SERVICES);

  function choose(service: Service | null) {
    setPickerOpen(false);
    setSelection({ service });
  }

  return (
    <>
      <div className="quick-grid">
        {main.map((service) => (
          <button key={service.id} type="button" className="quick-tile" onClick={() => choose(service)}>
            <strong>{shortName(service.name)}</strong>
            <span>{formatMoney(service.priceCents)}</span>
          </button>
        ))}
      </div>
      <div className="quick-actions">
        <Button variant="secondary" icon="plus" onClick={() => setPickerOpen(true)}>
          Outros
        </Button>
        {extra}
      </div>

      {pickerOpen && (
        <Modal open title="Outros serviços" onClose={() => setPickerOpen(false)}>
          <ul className="entry-list">
            {others.map((service) => (
              <li key={service.id} className="entry">
                <button type="button" className="entry__main" onClick={() => choose(service)}>
                  <span className="entry__name">{service.name.trim()}</span>
                </button>
                <strong className="entry__amount">{formatMoney(service.priceCents)}</strong>
              </li>
            ))}
            <li className="entry">
              <button type="button" className="entry__main" onClick={() => choose(null)}>
                <span className="entry__name">Outro valor</span>
                <span className="entry__meta">Serviço avulso ou produto</span>
              </button>
              <Icon name="plus" size={18} />
            </li>
          </ul>
        </Modal>
      )}
      {selection && <QuickEntrySheet key={selection.service?.id ?? "outro"} service={selection.service} onClose={() => setSelection(null)} />}
    </>
  );
}

/** "Combo Corte + Barba" → "Combo" para caber no botão. */
function shortName(name: string) {
  const trimmed = name.trim();
  return /^combo\b/i.test(trimmed) ? "Combo" : trimmed;
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
