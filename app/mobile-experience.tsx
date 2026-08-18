"use client";

import { useEffect } from "react";

const MOBILE_QUERY = "(max-width: 900px)";

export default function MobileExperience() {
  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY);
    const shell = document.querySelector<HTMLElement>(".app-shell");
    const sidebar = shell?.querySelector<HTMLElement>(".sidebar");
    const menuButton = shell?.querySelector<HTMLButtonElement>(".menu-button");
    if (!shell || !sidebar || !menuButton) return;

    sidebar.id ||= "mobile-primary-navigation";
    menuButton.setAttribute("aria-controls", sidebar.id);
    menuButton.setAttribute("aria-label", "Abrir menu de navegação");

    let backdrop = shell.querySelector<HTMLButtonElement>(".mobile-nav-backdrop");
    if (!backdrop) {
      backdrop = document.createElement("button");
      backdrop.type = "button";
      backdrop.className = "mobile-nav-backdrop";
      backdrop.setAttribute("aria-label", "Fechar menu de navegação");
      shell.appendChild(backdrop);
    }

    let closeButton = sidebar.querySelector<HTMLButtonElement>(".mobile-nav-close");
    if (!closeButton) {
      closeButton = document.createElement("button");
      closeButton.type = "button";
      closeButton.className = "mobile-nav-close";
      closeButton.setAttribute("aria-label", "Fechar menu");
      closeButton.innerHTML = "<span aria-hidden=\"true\">×</span>";
      sidebar.insertBefore(closeButton, sidebar.firstChild);
    }

    let openedByKeyboard = false;

    const sync = () => {
      const open = sidebar.classList.contains("open") && media.matches;
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.setAttribute("aria-label", open ? "Fechar menu de navegação" : "Abrir menu de navegação");
      document.body.classList.toggle("mobile-nav-open", open);
      backdrop!.tabIndex = open ? 0 : -1;
      if (open && openedByKeyboard) {
        window.requestAnimationFrame(() => closeButton!.focus());
        openedByKeyboard = false;
      }
    };

    const closeMenu = (restoreFocus = false) => {
      if (!sidebar.classList.contains("open")) return;
      sidebar.classList.remove("open");
      sync();
      if (restoreFocus) window.requestAnimationFrame(() => menuButton.focus());
    };

    const onMenuKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") openedByKeyboard = true;
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && sidebar.classList.contains("open")) {
        event.preventDefault();
        closeMenu(true);
      }
    };
    const onBackdropClick = () => closeMenu(true);
    const onCloseClick = () => closeMenu(true);
    const onNavClick = (event: Event) => {
      const target = event.target as Element | null;
      if (target?.closest("nav button, .sidebar-social a, .logout-button, .mobile-return-booking")) closeMenu(false);
    };
    const onMediaChange = () => {
      if (!media.matches) closeMenu(false);
      sync();
    };

    const observer = new MutationObserver(sync);
    observer.observe(sidebar, { attributes: true, attributeFilter: ["class"] });
    menuButton.addEventListener("keydown", onMenuKeyDown);
    backdrop.addEventListener("click", onBackdropClick);
    closeButton.addEventListener("click", onCloseClick);
    sidebar.addEventListener("click", onNavClick);
    document.addEventListener("keydown", onEscape);
    media.addEventListener("change", onMediaChange);
    sync();

    return () => {
      observer.disconnect();
      menuButton.removeEventListener("keydown", onMenuKeyDown);
      backdrop?.removeEventListener("click", onBackdropClick);
      closeButton?.removeEventListener("click", onCloseClick);
      sidebar.removeEventListener("click", onNavClick);
      document.removeEventListener("keydown", onEscape);
      media.removeEventListener("change", onMediaChange);
      document.body.classList.remove("mobile-nav-open");
    };
  }, []);

  return null;
}
