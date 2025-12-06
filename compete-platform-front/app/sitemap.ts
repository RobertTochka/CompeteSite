import { MetadataRoute } from "next";
import { APP_URL } from "./_utils/constants/constants";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: APP_URL,
      lastModified: new Date().toISOString(),
      priority: 1.0,
    },
    {
      url: APP_URL + "/profile",
      lastModified: new Date().toISOString(),
      priority: 0.5,
    },
    {
      url: APP_URL + "/lobbies",
      lastModified: new Date().toISOString(),
      priority: 0.4,
    },
  ];
}
