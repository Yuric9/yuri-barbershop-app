import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://yuricbarbershop.com", changeFrequency: "weekly", priority: 1 },
    { url: "https://yuricbarbershop.com/privacidade", changeFrequency: "yearly", priority: 0.3 },
  ];
}
