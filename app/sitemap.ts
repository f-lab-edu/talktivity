import type { MetadataRoute } from "next";
import { typeCodes } from "@/lib/core/classification";
import { siteUrl } from "@/lib/site";

const paths = [
  "/",
  "/pricing",
  "/types",
  ...typeCodes.map((code) => `/types/${code}`),
  "/privacy",
  "/terms",
  "/refund",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return paths.map((path) => ({ url: new URL(path, siteUrl).toString() }));
}
