"use client";

import { useId, useMemo, useState } from "react";
import { formatPhone, phoneDigits } from "../../lib/domain/phone";
import type { ClientSummary } from "../../lib/client/types";

type Props = {
  label?: string;
  clients: ClientSummary[];
  value: string;
  onChange: (email: string) => void;
  emptyLabel?: string;
};

/** Seleção de cliente com busca por nome ou telefone. */
export function ClientPicker({ label = "Cliente", clients, value, onChange, emptyLabel = "Selecione o cliente" }: Props) {
  const id = useId();
  const [query, setQuery] = useState("");

  const options = useMemo(() => {
    const text = query.trim().toLocaleLowerCase("pt-BR");
    const digits = phoneDigits(query);
    const matches = text
      ? clients.filter((client) => client.name.toLocaleLowerCase("pt-BR").includes(text) || (digits.length >= 3 && phoneDigits(client.phone).includes(digits)))
      : clients;
    // Mantém visível o cliente já escolhido, mesmo fora do filtro.
    const selected = clients.find((client) => client.email === value);
    return selected && !matches.includes(selected) ? [selected, ...matches] : matches;
  }, [clients, query, value]);

  return (
    <div className="field client-picker">
      <label htmlFor={id}>{label}</label>
      <input
        type="search"
        placeholder="Buscar por nome ou telefone"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label={`Buscar ${label.toLowerCase()}`}
      />
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{emptyLabel}</option>
        {options.map((client) => (
          <option key={client.email} value={client.email}>
            {client.name}
            {client.phone ? ` — ${formatPhone(client.phone)}` : ""}
          </option>
        ))}
      </select>
      {query && <small className="field__hint">{options.length} cliente(s) encontrado(s)</small>}
    </div>
  );
}
