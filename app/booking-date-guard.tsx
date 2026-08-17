"use client";

import { useEffect } from "react";

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function syncBookingDateInput() {
  const input = document.querySelector<HTMLInputElement>('.chat-date input[type="date"]');
  if (!input) return;

  const today = localDateKey();
  input.min = today;

  if (input.value && input.value < today) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, "");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

export default function BookingDateGuard() {
  useEffect(() => {
    syncBookingDateInput();

    const observer = new MutationObserver(syncBookingDateInput);
    observer.observe(document.body, { childList: true, subtree: true });

    const blockPastDate = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('.chat-date .date-continue')) return;

      const input = document.querySelector<HTMLInputElement>('.chat-date input[type="date"]');
      const today = localDateKey();
      if (!input || !input.value || input.value < today) {
        event.preventDefault();
        event.stopPropagation();
        if (input) {
          input.min = today;
          input.setCustomValidity(input.value && input.value < today ? "Escolha uma data de hoje em diante." : "Escolha uma data para continuar.");
          input.reportValidity();
          window.setTimeout(() => input.setCustomValidity(""), 0);
        }
      }
    };

    document.addEventListener("click", blockPastDate, true);
    return () => {
      observer.disconnect();
      document.removeEventListener("click", blockPastDate, true);
    };
  }, []);

  return null;
}
