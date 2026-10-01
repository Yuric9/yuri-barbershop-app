"use client";

import type { Transaction } from "../../lib/client/types";
import { formatDate } from "../../lib/domain/dates";
import { isIncome } from "../../lib/domain/finance";
import { formatMoney } from "../../lib/domain/money";
import { IconButton } from "../ui/button";
import { EmptyState } from "../ui/feedback";
import { Badge } from "../ui/layout";

type Props = {
  transactions: Transaction[];
  empty: string;
  showDate?: boolean;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
};

/** Tabela de lançamentos. No celular, cada linha vira um cartão. */
export function TransactionTable({ transactions, empty, showDate = false, onEdit, onDelete }: Props) {
  if (!transactions.length) return <EmptyState icon="cash" title={empty} />;
  const actions = Boolean(onEdit || onDelete);
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {showDate && <th>Data</th>}
            <th>Descrição</th>
            <th>Pagamento</th>
            <th>Tipo</th>
            <th className="table__number">Valor</th>
            {actions && <th><span className="sr-only">Ações</span></th>}
          </tr>
        </thead>
        <tbody>
          {transactions.map((item) => {
            const income = isIncome(item);
            const links = [item.clientName, item.serviceName].filter(Boolean).join(" · ");
            return (
              <tr key={item.id}>
                {showDate && <td data-label="Data">{formatDate(item.date)}</td>}
                <td data-label="Descrição">
                  <strong>{item.description}</strong>
                  {links && links !== item.description && <small>{links}</small>}
                </td>
                <td data-label="Pagamento">{item.paymentMethod || "—"}</td>
                <td data-label="Tipo">
                  <Badge tone={income ? "success" : "danger"}>{income ? "Entrada" : "Saída"}</Badge>
                </td>
                <td data-label="Valor" className={`table__number ${income ? "" : "is-negative"}`}>
                  {income ? "" : "− "}
                  {formatMoney(item.amountCents)}
                </td>
                {actions && (
                  <td className="table__actions">
                    {onEdit && <IconButton icon="edit" label={`Editar ${item.description}`} onClick={() => onEdit(item)} />}
                    {onDelete && !item.appointmentId && <IconButton icon="trash" label={`Excluir ${item.description}`} onClick={() => onDelete(item)} />}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
