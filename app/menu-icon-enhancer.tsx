"use client";

import { useEffect } from "react";

const SVG_NS = "http://www.w3.org/2000/svg";

type IconDef = { paths?: string[]; circles?: Array<[number, number, number]>; lines?: Array<[number, number, number, number]>; rects?: Array<[number, number, number, number, number?]> };

const defs: Record<string, IconDef> = {
  inicio: { paths:["M3 10.5 12 3l9 7.5","M5 9.5V21h14V9.5","M9 21v-7h6v7"] },
  "meu painel": { paths:["M3 13h8V3H3v10Zm10 8h8V11h-8v10Zm0-18v6h8V3h-8ZM3 21h8v-6H3v6Z"] },
  "caixa de entrada": { paths:["M3 5h18v14H3V5Z","m3 6 9 6 9-6"] },
  agenda: { paths:["M4 5h16v16H4V5Z","M8 3v4M16 3v4M4 10h16"] },
  "minha agenda": { paths:["M4 5h16v16H4V5Z","M8 3v4M16 3v4M4 10h16","m8 15 2 2 4-4"] },
  caixa: { paths:["M4 6h16v12H4V6Z","M4 10h16","M8 14h3"] },
  clientes: { circles:[[9,8,3],[17,9,2.5]], paths:["M3 21c0-4 2.5-7 6-7s6 3 6 7","M14 15c3.5 0 6 2.3 6 6"] },
  colaboradores: { circles:[[9,8,3],[17,9,2.5]], paths:["M3 21c0-4 2.5-7 6-7s6 3 6 7","M14 15c3.5 0 6 2.3 6 6"] },
  remarketing: { paths:["M20 7v5h-5","M4 17v-5h5","M18.5 10A7 7 0 0 0 6.3 7.5L4 12","M5.5 14A7 7 0 0 0 17.7 16.5L20 12"] },
  serviços: { circles:[[6,6,2],[6,18,2]], paths:["m8 7 11 10","m8 17 11-10"] },
  produtos: { paths:["M6 8h12l1 13H5L6 8Z","M9 8V6a3 3 0 0 1 6 0v2"] },
  "catálogo de estilos": { rects:[[3,4,18,16,2]], paths:["M7 8h.01M10 8h.01M13 8h.01M16 8h.01","M7 12h4M13 12h4M7 16h10"] },
  promoções: { paths:["M3 12 12 3h7v7l-9 9L3 12Z"], circles:[[15.5,6.5,1]] },
  assinaturas: { paths:["M4 18h16l-2-9-4 4-2-7-2 7-4-4-2 9Z","M5 21h14"] },
  "clube yuri": { paths:["M4 18h16l-2-9-4 4-2-7-2 7-4-4-2 9Z","M5 21h14"] },
  relatórios: { paths:["M4 20V10M10 20V4M16 20v-7M22 20H2"] },
  crescimento: { paths:["M3 17l6-6 4 4 8-9","M15 6h6v6"] },
  agendar: { paths:["M4 5h16v16H4V5Z","M8 3v4M16 3v4M4 10h16","M12 13v5M9.5 15.5h5"] },
  "meus horários": { paths:["M4 5h16v16H4V5Z","M8 3v4M16 3v4M4 10h16","M8 15h8"] },
  "meu histórico": { circles:[[12,12,8]], paths:["M12 7v5l3 2","M5 4v4h4"] },
  fidelidade: { paths:["M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 5.5-7 10-7 10Z"] },
  "avaliar atendimento": { paths:["m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"] },
  localização: { paths:["M12 21s6-5.3 6-11a6 6 0 1 0-12 0c0 5.7 6 11 6 11Z"], circles:[[12,10,2]] },
  "meu perfil": { circles:[[12,8,4]], paths:["M4 21c0-5 3.5-8 8-8s8 3 8 8"] },
  perfil: { circles:[[12,8,4]], paths:["M4 21c0-5 3.5-8 8-8s8 3 8 8"] },
  "meus ganhos": { circles:[[12,12,9]], paths:["M15 8.5c-.8-.8-2-1.2-3.2-1.2-1.8 0-3 .9-3 2.2 0 3.4 6.4 1.7 6.4 5.1 0 1.3-1.2 2.2-3.1 2.2-1.4 0-2.7-.5-3.6-1.4M12 5v14"] }
};

function normalizeLabel(value: string) {
  return value.replace(/\d+/g, "").trim().toLocaleLowerCase("pt-BR");
}

function makeSvg(def: IconDef) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.8");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  def.paths?.forEach((d) => { const p=document.createElementNS(SVG_NS,"path"); p.setAttribute("d",d); svg.appendChild(p); });
  def.circles?.forEach(([cx,cy,r]) => { const c=document.createElementNS(SVG_NS,"circle"); c.setAttribute("cx",String(cx)); c.setAttribute("cy",String(cy)); c.setAttribute("r",String(r)); svg.appendChild(c); });
  def.lines?.forEach(([x1,y1,x2,y2]) => { const l=document.createElementNS(SVG_NS,"line"); l.setAttribute("x1",String(x1)); l.setAttribute("y1",String(y1)); l.setAttribute("x2",String(x2)); l.setAttribute("y2",String(y2)); svg.appendChild(l); });
  def.rects?.forEach(([x,y,w,h,rx]) => { const r=document.createElementNS(SVG_NS,"rect"); r.setAttribute("x",String(x)); r.setAttribute("y",String(y)); r.setAttribute("width",String(w)); r.setAttribute("height",String(h)); if(rx)r.setAttribute("rx",String(rx)); svg.appendChild(r); });
  return svg;
}

export default function MenuIconEnhancer() {
  useEffect(() => {
    function enhance() {
      document.querySelectorAll<HTMLButtonElement>(".sidebar nav button").forEach((button) => {
        const iconHost = button.querySelector<HTMLElement>(":scope > span:first-child");
        if (!iconHost) return;
        const label = normalizeLabel(Array.from(button.childNodes).filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent || "").join(" "));
        const def = defs[label];
        if (!def || iconHost.dataset.vectorIcon === label) return;
        iconHost.replaceChildren(makeSvg(def));
        iconHost.dataset.vectorIcon = label;
        iconHost.classList.add("menu-vector-icon");
      });
    }
    enhance();
    const observer = new MutationObserver(enhance);
    observer.observe(document.body, { childList:true, subtree:true, characterData:true });
    return () => observer.disconnect();
  }, []);
  return null;
}
