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
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  // iPhone: ao ser adicionado à tela inicial, abre em tela cheia como um app.
  appleWebApp: { capable: true, title: "Yuri Gestão", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
