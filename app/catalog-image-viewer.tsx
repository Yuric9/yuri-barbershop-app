"use client";

import { useEffect, useRef, useState } from "react";

type CatalogItem = {
  src: string;
  title: string;
  description: string;
};

export default function CatalogImageViewer() {
  const [gallery, setGallery] = useState<CatalogItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const current = currentIndex === null ? null : gallery[currentIndex] || null;

  function goNext() {
    setCurrentIndex((index) => {
      if (index === null || gallery.length < 2) return index;
      return (index + 1) % gallery.length;
    });
  }

  function goPrevious() {
    setCurrentIndex((index) => {
      if (index === null || gallery.length < 2) return index;
      return (index - 1 + gallery.length) % gallery.length;
    });
  }

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

    function getVisibleItems() {
      return Array.from(document.querySelectorAll<HTMLElement>(".style-card"))
        .filter((card) => card.offsetParent !== null)
        .map((card) => {
          const image = card.querySelector<HTMLImageElement>("img");
          if (!image) return null;
          return {
            src: image.src,
            title: card.querySelector("h3")?.textContent?.trim() || image.alt || "Estilo",
            description: card.querySelector("p")?.textContent?.trim() || "",
          } satisfies CatalogItem;
        })
        .filter((item): item is CatalogItem => Boolean(item));
    }

    function openFrom(target: EventTarget | null) {
      const element = target instanceof Element ? target.closest(".catalog-photo-trigger") as HTMLElement | null : null;
      if (!element) return false;
      const image = element.querySelector<HTMLImageElement>("img");
      if (!image) return false;

      const items = getVisibleItems();
      const index = items.findIndex((item) => item.src === image.src);
      if (index < 0) return false;

      setGallery(items);
      setCurrentIndex(index);
      return true;
    }

    function onClick(event: MouseEvent) { openFrom(event.target); }
    function onKey(event: KeyboardEvent) {
      if ((event.key === "Enter" || event.key === " ") && openFrom(event.target)) event.preventDefault();
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

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setCurrentIndex(null);
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrevious();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", onKey);
    };
  }, [current, gallery.length]);

  if (!current || currentIndex === null) return null;

  return (
    <div
      className="catalog-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`Imagem ampliada de ${current.title}`}
      onClick={() => setCurrentIndex(null)}
    >
      <button className="catalog-lightbox-close" aria-label="Fechar imagem" onClick={() => setCurrentIndex(null)}>×</button>

      <div
        className="catalog-lightbox-content"
        onClick={(event) => event.stopPropagation()}
        onTouchStart={(event) => {
          if (event.touches.length !== 1) {
            touchStart.current = null;
            return;
          }
          touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
        }}
        onTouchEnd={(event) => {
          const start = touchStart.current;
          touchStart.current = null;
          if (!start || event.changedTouches.length !== 1 || gallery.length < 2) return;

          const dx = event.changedTouches[0].clientX - start.x;
          const dy = event.changedTouches[0].clientY - start.y;
          if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.15) return;

          if (dx < 0) goNext();
          else goPrevious();
        }}
      >
        <div className="catalog-lightbox-image-wrap">
          <img src={current.src} alt={current.title} />

          {gallery.length > 1 && (
            <>
              <button className="catalog-nav catalog-nav-prev" aria-label="Foto anterior" onClick={goPrevious}>‹</button>
              <button className="catalog-nav catalog-nav-next" aria-label="Próxima foto" onClick={goNext}>›</button>
              <div className="catalog-counter" aria-live="polite">{currentIndex + 1} / {gallery.length}</div>
            </>
          )}
        </div>

        <div className="catalog-lightbox-copy">
          <small>REFERÊNCIA DO CATÁLOGO</small>
          <h2>{current.title}</h2>
          {current.description && <p>{current.description}</p>}
          <span>Deslize para o lado para ver o próximo modelo. Use dois dedos para ampliar a imagem.</span>
        </div>
      </div>
    </div>
  );
}
