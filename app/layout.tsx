import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#14130f",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://yuricbarbershop.com"),
  title: "Yuri Barbershop | Gestão",
  description: "Sistema de gestão da Yuri Barbershop: agenda, caixa, clientes, equipe e relatórios.",
  manifest: "/manifest.webmanifest",
  robots: { index: false, follow: false },
  icons: {
    icon: "/brand/yuri-barbershop-logo.png",
    apple: "/brand/yuri-barbershop-logo.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
