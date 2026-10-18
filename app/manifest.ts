import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RedWhiteBlue Market",
    short_name: "RWB Market",
    description:
      "Shop local products and connect with sellers across Liberia.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#08275a",
    icons: [
      {
        src: "/images/app-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/images/app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
