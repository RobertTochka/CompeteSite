import { MetadataRoute } from "next";
import {
  APP_URL,
  SITE_DESCRIPTION,
  SITE_NAME,
} from "./_utils/constants/constants";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: APP_URL,
    display: "standalone",
    orientation: "portrait",
    background_color: "linear-gradient(90deg, #0F1116 0%, #1A1B22 100%)",
    theme_color: "#2563EB",
    icons: [
      {
        src: "/favicon.ico",
      },
    ],
  };
}
