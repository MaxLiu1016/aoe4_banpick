import type { MetadataRoute } from "next";
import { dbConnect } from "@/lib/mongoose";
import { Preset } from "@/lib/models/Preset";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * The fixed pages, plus one entry per public format — the formats are the only
 * thing here with a reason to be searched for, so they are most of the sitemap.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const fixed: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/presets`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/history`, changeFrequency: "daily", priority: 0.3 },
  ];
  try {
    await dbConnect();
    const docs = await Preset.find({ isPublic: true }).select("_id updatedAt").sort({ updatedAt: -1 }).limit(1000).lean();
    return [
      ...fixed,
      ...docs.map((d) => ({
        url: `${base}/presets/${String(d._id)}`,
        lastModified: d.updatedAt ? new Date(d.updatedAt as Date) : undefined,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    ];
  } catch {
    // A sitemap of the fixed pages beats a 500 that tells search engines nothing.
    return fixed;
  }
}
