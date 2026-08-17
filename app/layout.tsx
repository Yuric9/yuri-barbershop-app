import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./login-logo-fix.css";
import "./mobile-booking.css";
import BookingDateGuard from "./booking-date-guard";
import MobileBookingBridge from "./mobile-booking-bridge";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      </body>
    </html>
  );
}
