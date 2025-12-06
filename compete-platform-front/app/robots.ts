import { MetadataRoute } from "next";
import { APP_URL } from "./_utils/constants/constants";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/*",
    },
    sitemap: APP_URL + "/sitemap.xml",
  };
}
