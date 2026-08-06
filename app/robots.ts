import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/**
 * What is worth a crawler's time is the formats and the pages that list them.
 * Everything else is either somebody's private view (account, admin), a machine
 * endpoint, or a room that will be over before it could ever rank.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/account", "/admin", "/match/", "/watch/", "/login"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
