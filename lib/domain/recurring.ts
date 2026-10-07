/**
 * Despesas fixas (ex.: aluguel): cadastradas uma vez e confirmadas a cada mês.
 */

export type RecurringExpense = {
  id: number;
  description: string;
  amountCents: number;
  dayOfMonth: number;
  active: boolean;
};

export type LaunchedExpense = { recurringExpenseId?: number | null; date: string };

export type RecurringStatus<T extends RecurringExpense> = T & {
  /** Já foi lançada no mês. */
  launched: boolean;
  /** Ainda não lançada e o dia de vencimento já chegou. */
  due: boolean;
};

/** Situação de cada despesa fixa ativa no mês de `today`. */
export function recurringStatus<T extends RecurringExpense>(expenses: T[], transactions: LaunchedExpense[], today: string): RecurringStatus<T>[] {
  const month = today.slice(0, 7);
  const day = Number(today.slice(8, 10));
  const launchedIds = new Set(
    transactions.filter((item) => item.recurringExpenseId && item.date.startsWith(month)).map((item) => item.recurringExpenseId),
  );
  return expenses
    .filter((expense) => expense.active)
    .map((expense) => {
      const launched = launchedIds.has(expense.id);
      return { ...expense, launched, due: !launched && day >= expense.dayOfMonth };
    })
    .sort((a, b) => a.dayOfMonth - b.dayOfMonth);
}

/** Data do lançamento no mês: o dia de vencimento, limitado ao último dia do mês e a hoje. */
export function launchDateFor(dayOfMonth: number, today: string) {
  const [year, month] = today.slice(0, 7).split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Math.min(dayOfMonth, lastDay, Number(today.slice(8, 10)));
  return `${today.slice(0, 7)}-${String(day).padStart(2, "0")}`;
}
