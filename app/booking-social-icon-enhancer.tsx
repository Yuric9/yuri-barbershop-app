"use client";

import { useEffect } from "react";

const instagramSvg = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm10.25 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"/></svg>`;
const whatsappSvg = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a9.5 9.5 0 0 0-8.1 14.47L2.5 21.5l5.16-1.35A9.5 9.5 0 1 0 12 2Zm0 2a7.5 7.5 0 1 1-3.83 13.95l-.36-.21-2.37.62.63-2.29-.23-.37A7.5 7.5 0 0 1 12 4Zm-2.42 3.9c-.19 0-.39.02-.57.2-.18.18-.7.68-.7 1.67 0 .98.72 1.93.82 2.06.1.13 1.41 2.14 3.42 3 .48.2.86.33 1.16.43.49.16.93.14 1.28.09.39-.06 1.2-.49 1.37-.97.17-.48.17-.89.12-.97-.05-.09-.19-.13-.4-.24l-1.36-.64c-.2-.1-.35-.15-.5.08-.15.22-.57.72-.7.87-.13.15-.26.17-.48.06-.22-.1-.93-.34-1.77-1.09-.65-.58-1.1-1.3-1.22-1.52-.13-.22-.01-.34.09-.45.09-.1.22-.26.32-.39.11-.13.14-.22.22-.37.07-.15.04-.28-.02-.39-.05-.1-.48-1.16-.66-1.59-.17-.42-.35-.43-.48-.44h-.42Z"/></svg>`;
const googleSvg = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.35 12.27c0-.78-.07-1.53-.2-2.27H12v4.3h5.23a4.47 4.47 0 0 1-1.94 2.93v2.79h3.14c1.84-1.7 2.92-4.2 2.92-7.75Z"/><path fill="#34A853" d="M12 21.75c2.63 0 4.84-.87 6.45-2.36l-3.14-2.79c-.87.58-1.99.92-3.31.92-2.54 0-4.69-1.72-5.46-4.02H3.3v2.87A9.75 9.75 0 0 0 12 21.75Z"/><path fill="#FBBC05" d="M6.54 13.5A5.86 5.86 0 0 1 6.23 12c0-.52.1-1.03.3-1.5V7.63H3.3A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.05 1.05 4.37l3.24-2.87Z"/><path fill="#EA4335" d="M12 6.48c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.58 14.63 2.25 12 2.25a9.75 9.75 0 0 0-8.7 5.38l3.24 2.87C7.31 8.2 9.46 6.48 12 6.48Z"/></svg>`;

function applyIcons() {
  document.querySelectorAll<HTMLAnchorElement>(".booking-social-grid a").forEach((link) => {
    const icon = link.querySelector<HTMLElement>(":scope > span");
    if (!icon) return;
    const href = link.href.toLowerCase();
    if (href.includes("instagram.com")) icon.innerHTML = instagramSvg;
    else if (href.includes("wa.me") || href.includes("whatsapp")) icon.innerHTML = whatsappSvg;
    else if (href.includes("g.page") || href.includes("google")) icon.innerHTML = googleSvg;
    icon.classList.add("booking-social-brand-icon");
  });
}

export default function BookingSocialIconEnhancer() {
  useEffect(() => {
    applyIcons();
    const observer = new MutationObserver(applyIcons);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return null;
}
