import type { SVGProps } from "react";

export type AppIconName =
  | "home" | "inbox" | "calendar" | "cash" | "clients" | "team"
  | "remarketing" | "services" | "products" | "catalog" | "promotions"
  | "subscription" | "reports" | "growth" | "earnings" | "profile"
  | "plus" | "back" | "check" | "close";

const paths: Record<AppIconName, string[]> = {
  home: ["M3 10.5 12 3l9 7.5", "M5 9.5V21h14V9.5", "M9 21v-7h6v7"],
  inbox: ["M3 5h18v14H3V5Z", "m3 6 9 6 9-6"],
  calendar: ["M4 5h16v16H4V5Z", "M8 3v4M16 3v4M4 10h16"],
  cash: ["M4 6h16v12H4V6Z", "M4 10h16", "M8 14h3"],
  clients: ["M3 21c0-4 2.5-7 6-7s6 3 6 7", "M14 15c3.5 0 6 2.3 6 6", "M6 8a3 3 0 1 0 6 0 3 3 0 0 0-6 0", "M14.5 9a2.5 2.5 0 1 0 5 0 2.5 2.5 0 0 0-5 0"],
  team: ["M3 21c0-4 2.5-7 6-7s6 3 6 7", "M14 15c3.5 0 6 2.3 6 6", "M6 8a3 3 0 1 0 6 0 3 3 0 0 0-6 0", "M14.5 9a2.5 2.5 0 1 0 5 0 2.5 2.5 0 0 0-5 0"],
  remarketing: ["M20 7v5h-5", "M4 17v-5h5", "M18.5 10A7 7 0 0 0 6.3 7.5L4 12", "M5.5 14A7 7 0 0 0 17.7 16.5L20 12"],
  services: ["M8 7 19 17", "M8 17 19 7", "M4 6a2 2 0 1 0 4 0 2 2 0 0 0-4 0", "M4 18a2 2 0 1 0 4 0 2 2 0 0 0-4 0"],
  products: ["M6 8h12l1 13H5L6 8Z", "M9 8V6a3 3 0 0 1 6 0v2"],
  catalog: ["M3 4h18v16H3z", "M7 8h.01M10 8h.01M13 8h.01M16 8h.01", "M7 12h4M13 12h4M7 16h10"],
  promotions: ["M3 12 12 3h7v7l-9 9L3 12Z", "M15.5 6.5h.01"],
  subscription: ["M4 18h16l-2-9-4 4-2-7-2 7-4-4-2 9Z", "M5 21h14"],
  reports: ["M4 20V10M10 20V4M16 20v-7M22 20H2"],
  growth: ["M3 17l6-6 4 4 8-9", "M15 6h6v6"],
  earnings: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18", "M15 8.5c-.8-.8-2-1.2-3.2-1.2-1.8 0-3 .9-3 2.2 0 3.4 6.4 1.7 6.4 5.1 0 1.3-1.2 2.2-3.1 2.2-1.4 0-2.7-.5-3.6-1.4", "M12 5v14"],
  profile: ["M8 8a4 4 0 1 0 8 0 4 4 0 0 0-8 0", "M4 21c0-5 3.5-8 8-8s8 3 8 8"],
  plus: ["M12 5v14M5 12h14"],
  back: ["M15 18 9 12l6-6"],
  check: ["m5 12 4 4L19 6"],
  close: ["M6 6l12 12M18 6 6 18"],
};

export function AppIcon({ name, size = 22, ...props }: SVGProps<SVGSVGElement> & { name: AppIconName; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
      {paths[name].map((d, index) => <path key={`${name}-${index}`} d={d} />)}
    </svg>
  );
}
