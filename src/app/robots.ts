import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/pricing", "/docs", "/login", "/signup"],
      disallow: ["/dashboard", "/analysis", "/api/"],
    },
    sitemap: "https://cogniqa.codes/sitemap.xml",
  };
}
