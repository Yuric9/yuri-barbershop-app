"use client";

import { useEffect } from "react";

const BUSINESS_TIME_ZONE = "America/Sao_Paulo";

function localToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const day = parts.find((part) => part.type === "day")?.value || "";
  return year && month && day ? `${year}-${month}-${day}` : new Date().toISOString().slice(0, 10);
}

function brazilianDateToKey(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  return match ? `${match[3]}-${match[2]}-${match[1]}` : "";
}

function endDateFromStatus(status: HTMLElement) {
  const range = status.querySelector("span")?.textContent || "";
  const match = /até\s+(\d{2}\/\d{2}\/\d{4})/i.exec(range);
  return match ? brazilianDateToKey(match[1]) : "";
}

function normalizeStatus(status: HTMLElement) {
  const label = status.querySelector<HTMLElement>("b");
  if (!label) return;
  const raw = (label.textContent || "").trim().toUpperCase();
  if (raw !== "ATIVA" && raw !== "ASSINATURA ATIVA") return;

  const endDate = endDateFromStatus(status);
  if (!endDate) {
    label.textContent = "ASSINATURA ATIVA";
    status.classList.add("active");
    return;
  }

  if (endDate >= localToday()) {
    label.textContent = "ASSINATURA ATIVA";
    status.classList.add("active");
  } else {
    label.textContent = "VENCIDA";
    status.classList.remove("active");
  }
}

export default function SubscriptionClientStatusGuard() {
  useEffect(() => {
    let scheduled = false;

    function scan() {
      scheduled = false;
      document.querySelectorAll<HTMLElement>(".membership-page .membership-status").forEach(normalizeStatus);
    }

    function schedule() {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(scan);
    }

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    schedule();
    return () => observer.disconnect();
  }, []);

  return null;
}
