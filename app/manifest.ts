import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Yuri Barbershop",
    short_name: "Yuri Barber",
    description: "Agendamento, relacionamento e gestão da Yuri Barbershop.",
    start_url: "/",
    display: "standalone",
    background_color: "#171714",
    theme_color: "#171714",
    icons: [{ src: "/brand/yuri-barbershop-logo.png", sizes: "1254x1254", type: "image/png" }],
  };
}
