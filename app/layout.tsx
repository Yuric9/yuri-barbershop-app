import type { Metadata, Viewport } from "next";
import "./design-tokens.css";
import "./globals.css";
import "./login-logo-fix.css";
import "./mobile-booking.css";
import "./booking-commerce.css";
import "./booking-hub-v2.css";
import "./catalog-image-viewer.css";
import "./mobile-experience.css";
import "./menu-icons.css";
import "./product-admin.css";
import "./product-experience.css";
import "./cash-today.css";
import "./barber-experience.css";
import "./barber-preview.css";
import "./barber-preview-interactive.css";
import "./barber-manual-service.css";
import "./barber-nav-icons.css";
import "./design-system.css";
import "./app-feel.css";
import "./current-version.css";
import "./reports-v2.css";
import "./booking-v3.css";
import "./booking-v3-contrast.css";
import "./product-orders-admin.css";
import BookingDateGuard from "./booking-date-guard";
import BookingErrorBoundary from "./booking-error-boundary";
import BookingV3 from "./booking-v3";
import CatalogImageViewer from "./catalog-image-viewer";
import MobileExperience from "./mobile-experience";
import MenuIconEnhancer from "./menu-icon-enhancer";
import ProductAdminEnhancer from "./product-admin-enhancer";
import ProductExperience from "./product-experience";
import CashTodayGuard from "./cash-today-guard";
import BarberExperience from "./barber-experience";
import AdminBarberPreviewLink from "./admin-barber-preview-link";
import BarberManualServiceEnhancer from "./barber-manual-service-enhancer";
import BarberNavIconEnhancer from "./barber-nav-icon-enhancer";
import LogoHomeEnhancer from "./logo-home-enhancer";
import CurrentVersionEnhancer from "./current-version-enhancer";
import ReportsV2 from "./reports-v2";
import ProductOrdersAdmin from "./product-orders-admin";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#11110f",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://yuricbarbershop.com"),
  title: "Yuri Barbershop | Agendamento e produtos",
  description: "Agende seu atendimento na Yuri Barbershop e encomende produtos diretamente pelo WhatsApp.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/brand/yuri-barbershop-logo.png",
    shortcut: "/brand/yuri-barbershop-logo.png",
    apple: "/brand/yuri-barbershop-logo.png",
  },
  openGraph: {
    title: "Yuri Barbershop",
    description: "Agendamento simples, produtos e atendimento direto pelo WhatsApp.",
    url: "https://yuricbarbershop.com",
    siteName: "Yuri Barbershop",
    locale: "pt_BR",
    type: "website",
    images: [{ url: "/brand/yuri-barbershop-logo.png", width: 1200, height: 1200, alt: "Yuri Barbershop" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <BookingDateGuard />
        {children}
        <BookingErrorBoundary>
          <BookingV3 />
        </BookingErrorBoundary>
        <CatalogImageViewer />
        <MobileExperience />
        <MenuIconEnhancer />
        <ProductAdminEnhancer />
        <ProductExperience />
        <CashTodayGuard />
        <BarberExperience />
        <AdminBarberPreviewLink />
        <BarberManualServiceEnhancer />
        <BarberNavIconEnhancer />
        <LogoHomeEnhancer />
        <CurrentVersionEnhancer />
        <ReportsV2 />
        <ProductOrdersAdmin />
      </body>
    </html>
  );
}
