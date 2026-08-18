"use client";

import { useEffect, useRef, useState } from "react";

type CatalogItem = {
  src: string;
  title: string;
  description: string;
  category: string;
};

const WHATSAPP_NUMBER = "5562981007636";

function normalizeCategory(value: string) {
  const text = value.toLowerCase();
  if (text.includes("barba")) return "barba";
  if (text.includes("quím") || text.includes("quim") || text.includes("procedimento")) return "quimica";
  return "corte";
}

function whatsappMessage(item: CatalogItem) {
  const category = normalizeCategory(item.category);
  if (category === "barba") return `Olá! Estava olhando o catálogo da Yuri Barbershop e a referência ${item.title} chamou minha atenção. Gostaria de conversar sobre esse estilo de barba e saber se ele combina comigo.`;
  if (category === "quimica") return `Olá! Estava olhando o catálogo da Yuri Barbershop e vi o procedimento ${item.title}. Gostaria de entender melhor o resultado e saber se ele é indicado para o meu cabelo.`;
  return `Olá! Estava olhando o catálogo da Yuri Barbershop e a referência ${item.title} chamou minha atenção. Gostaria de conversar sobre esse estilo e saber se ele combina comigo.`;
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M16.04 3C8.86 3 3.02 8.82 3.02 15.98c0 2.52.73 4.98 2.1 7.08L3 29l6.13-2.02a13.03 13.03 0 0 0 6.9 1.91h.01C23.22 28.89 29 23.06 29 15.9 29 8.75 23.22 3 16.04 3Zm0 23.7h-.01a10.8 10.8 0 0 1-5.5-1.5l-.39-.23-3.64 1.2 1.22-3.54-.25-.4a10.72 10.72 0 0 1-1.65-5.73c0-5.92 4.84-10.74 10.8-10.74 5.95 0 10.79 4.82 10.79 10.74 0 5.93-4.84 10.2-11.37 10.2Zm5.92-8.08c-.32-.16-1.91-.94-2.2-1.05-.3-.11-.51-.16-.73.16-.21.32-.83 1.05-1.02 1.27-.19.21-.38.24-.7.08-.32-.16-1.36-.5-2.59-1.59-.96-.85-1.6-1.9-1.79-2.22-.19-.32-.02-.5.14-.65.15-.14.32-.37.49-.56.16-.19.21-.32.32-.54.11-.21.05-.4-.03-.56-.08-.16-.73-1.75-1-2.4-.26-.63-.53-.55-.73-.56h-.62c-.21 0-.56.08-.86.4-.3.32-1.13 1.1-1.13 2.69 0 1.59 1.16 3.12 1.32 3.34.16.21 2.28 3.47 5.52 4.87.77.33 1.37.53 1.84.68.77.24 1.47.21 2.02.13.62-.09 1.91-.78 2.18-1.53.27-.75.27-1.39.19-1.53-.08-.13-.3-.21-.62-.37Z"/>
    </svg>
  );
}

export default function CatalogImageViewer() {
  const [gallery, setGallery] = useState<CatalogItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const current = currentIndex === null ? null : gallery[currentIndex] || null;

  function goNext() { setCurrentIndex((i) => i === null || gallery.length < 2 ? i : (i + 1) % gallery.length); }
  function goPrevious() { setCurrentIndex((i) => i === null || gallery.length < 2 ? i : (i - 1 + gallery.length) % gallery.length); }

  useEffect(() => {
    function enhanceCatalog() {
      document.querySelectorAll<HTMLElement>(".style-card").forEach((card) => {
        const image = card.querySelector<HTMLImageElement>("img");
        const media = image?.parentElement as HTMLElement | null;
        if (!image || !media || media.dataset.zoomReady === "true") return;
        media.dataset.zoomReady = "true";
        media.classList.add("catalog-photo-trigger");
        media.setAttribute("role", "button"); media.setAttribute("tabindex", "0");
        media.setAttribute("aria-label", `Ampliar imagem de ${image.alt || "estilo"}`);
        const badge = document.createElement("span"); badge.className = "catalog-zoom-badge"; badge.innerHTML = "⌕"; badge.setAttribute("aria-hidden", "true"); media.appendChild(badge);
      });
    }
    function getVisibleItems() {
      return Array.from(document.querySelectorAll<HTMLElement>(".style-card")).filter((card) => card.offsetParent !== null).map((card) => {
        const image = card.querySelector<HTMLImageElement>("img"); if (!image) return null;
        return { src:image.src, title:card.querySelector("h3")?.textContent?.trim() || image.alt || "Estilo", description:card.querySelector("p")?.textContent?.trim() || "", category:card.querySelector("small")?.textContent?.trim() || "corte" } satisfies CatalogItem;
      }).filter((item): item is CatalogItem => Boolean(item));
    }
    function openFrom(target: EventTarget | null) {
      const element = target instanceof Element ? target.closest(".catalog-photo-trigger") as HTMLElement | null : null; if (!element) return false;
      const image = element.querySelector<HTMLImageElement>("img"); if (!image) return false;
      const items=getVisibleItems(); const index=items.findIndex((item)=>item.src===image.src); if(index<0)return false; setGallery(items);setCurrentIndex(index);return true;
    }
    function onClick(event:MouseEvent){openFrom(event.target)} function onKey(event:KeyboardEvent){if((event.key==="Enter"||event.key===" ")&&openFrom(event.target))event.preventDefault()}
    enhanceCatalog(); const observer=new MutationObserver(enhanceCatalog); observer.observe(document.body,{childList:true,subtree:true}); document.addEventListener("click",onClick);document.addEventListener("keydown",onKey);
    return()=>{observer.disconnect();document.removeEventListener("click",onClick);document.removeEventListener("keydown",onKey)};
  },[]);

  useEffect(()=>{if(!current)return;const old=document.body.style.overflow;document.body.style.overflow="hidden";function onKey(event:KeyboardEvent){if(event.key==="Escape")setCurrentIndex(null);if(event.key==="ArrowRight"){event.preventDefault();goNext()}if(event.key==="ArrowLeft"){event.preventDefault();goPrevious()}}document.addEventListener("keydown",onKey);return()=>{document.body.style.overflow=old;document.removeEventListener("keydown",onKey)}},[current,gallery.length]);

  if(!current||currentIndex===null)return null;
  const whatsappUrl=`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage(current))}`;

  return <div className="catalog-lightbox" role="dialog" aria-modal="true" aria-label={`Imagem ampliada de ${current.title}`} onClick={()=>setCurrentIndex(null)}>
    <button className="catalog-lightbox-close" aria-label="Fechar imagem" onClick={()=>setCurrentIndex(null)}>×</button>
    <div className="catalog-lightbox-content" onClick={(e)=>e.stopPropagation()} onTouchStart={(e)=>{if(e.touches.length!==1){touchStart.current=null;return}touchStart.current={x:e.touches[0].clientX,y:e.touches[0].clientY}}} onTouchEnd={(e)=>{const s=touchStart.current;touchStart.current=null;if(!s||e.changedTouches.length!==1||gallery.length<2)return;const dx=e.changedTouches[0].clientX-s.x,dy=e.changedTouches[0].clientY-s.y;if(Math.abs(dx)<55||Math.abs(dx)<Math.abs(dy)*1.15)return;dx<0?goNext():goPrevious()}}>
      <div className="catalog-lightbox-image-wrap"><img src={current.src} alt={current.title}/>{gallery.length>1&&<><button className="catalog-nav catalog-nav-prev" aria-label="Foto anterior" onClick={goPrevious}>‹</button><button className="catalog-nav catalog-nav-next" aria-label="Próxima foto" onClick={goNext}>›</button><div className="catalog-counter" aria-live="polite">{currentIndex+1} / {gallery.length}</div></>}</div>
      <div className="catalog-lightbox-copy"><small>REFERÊNCIA DO CATÁLOGO</small><h2>{current.title}</h2>{current.description&&<p>{current.description}</p>}
        <div className="catalog-share-row"><span>Compartilhar com</span><a className="catalog-whatsapp-action" href={whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label={`Conversar no WhatsApp sobre ${current.title}`} title="WhatsApp"><WhatsAppIcon/></a></div>
        <span className="catalog-lightbox-hint">Deslize para o lado para ver o próximo modelo. Use dois dedos para ampliar a imagem.</span>
      </div>
    </div>
  </div>;
}
