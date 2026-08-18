"use client";

import { useEffect } from "react";

export default function ProductAdminEnhancer() {
  useEffect(() => {
    function enhance() {
      document.querySelectorAll<HTMLElement>("section").forEach((section) => {
        const title = section.querySelector("h2")?.textContent?.trim();
        if (title !== "Produtos e estoque") return;
        section.classList.add("product-admin-page");
        const tableCard = section.querySelector<HTMLElement>(".table-card");
        if (tableCard) tableCard.classList.add("product-admin-grid");
      });
    }

    enhance();
    const observer = new MutationObserver(enhance);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
