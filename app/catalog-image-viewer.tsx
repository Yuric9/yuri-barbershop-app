"use client";

import { useEffect, useState } from "react";

export default function CatalogImageViewer() {
  const [current, setCurrent] = useState<{ src: string; title: string; description: string } | null>(null);

  useEffect(() => {
    function enhanceCatalog() {
      document.querySelectorAll<HTMLElement>(".style-card").forEach((card) => {
        const image = card.querySelector<HTMLImageElement>("img");
        const media = image?.parentElement as HTMLElement | null;
        if (!image || !media || media.dataset.zoomReady === "true") return;
        media.dataset.zoomReady = "true";
        media.classList.add("catalog-photo-trigger");
        media.setAttribute("role", "button");
        media.setAttribute("tabindex", "0");
        media.setAttribute("aria-label", `Ampliar imagem de ${image.alt || "estilo"}`);
        const badge = document.createElement("span");
        badge.className = "catalog-zoom-badge";
        badge.innerHTML = "⌕";
        badge.setAttribute("aria-hidden", "true");
        media.appendChild(badge);
      });
    }

    function openFrom(target: EventTarget | null) {
      const element = target instanceof Element ? target.closest(".catalog-photo-trigger") as HTMLElement | null : null;
      if (!element) return false;
      const card = element.closest(".style-card");
      const image = element.querySelector<HTMLImageElement>("img");
      if (!card || !image) return false;
      const title = card.querySelector("h3")?.textContent?.trim() || image.alt || "Estilo";
      const description = card.querySelector("p")?.textContent?.trim() || "";
      setCurrent({ src: image.src, title, description });
      return true;
    }

    function onClick(event: MouseEvent) { openFrom(event.target); }
    function onKey(event: KeyboardEvent) {
      if ((event.key === "Enter" || event.key === " ") && openFrom(event.target)) event.preventDefault();
      if (event.key === "Escape") setCurrent(null);
    }

    enhanceCatalog();
    const observer = new MutationObserver(enhanceCatalog);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      observer.disconnect();
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (!current) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = old; };
  }, [current]);

  if (!current) return null;

  return (
    <div className="catalog-lightbox" role="dialog" aria-modal="true" aria-label={`Imagem ampliada de ${current.title}`} onClick={() => setCurrent(null)}>
      <button className="catalog-lightbox-close" aria-label="Fechar imagem" onClick={() => setCurrent(null)}>×</button>
      <div className="catalog-lightbox-content" onClick={(event) => event.stopPropagation()}>
        <div className="catalog-lightbox-image-wrap">
          <img src={current.src} alt={current.title} />
        </div>
        <div className="catalog-lightbox-copy">
          <small>REFERÊNCIA DO CATÁLOGO</small>
          <h2>{current.title}</h2>
          {current.description && <p>{current.description}</p>}
          <span>Toque na imagem e use dois dedos para ampliar.</span>
        </div>
      </div>
    </div>
  );
}
