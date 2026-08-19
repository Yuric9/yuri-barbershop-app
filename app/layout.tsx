import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./login-logo-fix.css";
import "./mobile-booking.css";
import "./catalog-image-viewer.css";
import "./mobile-experience.css";
import "./menu-icons.css";
import "./product-admin.css";
import "./product-experience.css";
import "./subscription-sales.css";
import "./subscription-admin.css";
import "./subscription-archive.css";
import BookingDateGuard from "./booking-date-guard";
import MobileBookingBridge from "./mobile-booking-bridge";
import CatalogAdminEnhancer from "./catalog-admin-enhancer";
import CatalogImageViewer from "./catalog-image-viewer";
import CatalogOrderEnhancer from "./catalog-order-enhancer";
import MobileExperience from "./mobile-experience";
import MenuIconEnhancer from "./menu-icon-enhancer";
import ProductAdminEnhancer from "./product-admin-enhancer";
import ProductExperience from "./product-experience";
import SubscriptionPaymentEnhancer from "./subscription-payment-enhancer";
import SubscriptionSalesEnhancer from "./subscription-sales-enhancer";
import SubscriptionAdminEnhancer from "./subscription-admin-enhancer";
import SubscriptionArchiveEnhancer from "./subscription-archive-enhancer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#11110f",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://yuricbarbershop.com"),
  title: "Yuri Barbershop | Agendamento e cuidados masculinos",
  description: "Agende seu atendimento na Yuri Barbershop, conheça nossos serviços, produtos, promoções e o Clube Yuri.",
  manifest: "/manifest.webmanifest",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/brand/yuri-barbershop-logo.png",
    shortcut: "/brand/yuri-barbershop-logo.png",
    apple: "/brand/yuri-barbershop-logo.png",
  },
  openGraph: {
    title: "Yuri Barbershop",
    description: "Estilo, confiança e atitude. Agende seu atendimento pelo nosso aplicativo.",
    url: "https://yuricbarbershop.com",
    siteName: "Yuri Barbershop",
    locale: "pt_BR",
    type: "website",
    images: [{ url: "/brand/yuri-barbershop-logo.png", width: 1200, height: 1200, alt: "Yuri Barbershop" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <BookingDateGuard />
        {children}
        <MobileBookingBridge />
        <CatalogAdminEnhancer />
        <CatalogOrderEnhancer />
        <CatalogImageViewer />
        <MobileExperience />
        <MenuIconEnhancer />
        <ProductAdminEnhancer />
        <ProductExperience />
        <SubscriptionPaymentEnhancer />
        <SubscriptionSalesEnhancer />
        <SubscriptionAdminEnhancer />
        <SubscriptionArchiveEnhancer />
      </body>
    </html>
  );
}
