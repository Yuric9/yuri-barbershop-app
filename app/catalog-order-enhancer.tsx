"use client";

import { useEffect } from "react";

function categoryRank(card: HTMLElement) {
  const label = (card.querySelector("small")?.textContent || "").toLocaleLowerCase("pt-BR");
  if (label.includes("corte")) return 0;
  if (label.includes("barba")) return 1;
  if (label.includes("quím") || label.includes("quim") || label.includes("procedimento")) return 2;
  return 3;
}

export default function CatalogOrderEnhancer() {
  useEffect(() => {
    let sorting = false;

    function reorderCatalog() {
      if (sorting) return;

      document.querySelectorAll<HTMLElement>(".style-grid").forEach((grid) => {
        const cards = Array.from(grid.children).filter(
          (child): child is HTMLElement => child instanceof HTMLElement && child.classList.contains("style-card"),
        );
        if (cards.length < 2) return;

        const sorted = cards
          .map((card, index) => ({ card, index, rank: categoryRank(card) }))
          .sort((a, b) => a.rank - b.rank || a.index - b.index)
          .map(({ card }) => card);

        const changed = sorted.some((card, index) => card !== cards[index]);
        if (!changed) return;

        sorting = true;
        const fragment = document.createDocumentFragment();
        sorted.forEach((card) => fragment.appendChild(card));
        grid.appendChild(fragment);
        sorting = false;
      });
    }

    reorderCatalog();
    const observer = new MutationObserver(() => window.requestAnimationFrame(reorderCatalog));
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return null;
}
