import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://cogniqa.codes";

  const routes = ["", "/pricing", "/dashboard", "/docs", "/login", "/signup"].map(
    (route) => ({
      url: `${baseUrl}${route}`,
      lastModified: new Date().toISOString(),
      changeFrequency: "daily" as const,
      priority: route === "" ? 1.0 : route === "/dashboard" ? 0.8 : 0.5,
    })
  );

  return routes;
}
