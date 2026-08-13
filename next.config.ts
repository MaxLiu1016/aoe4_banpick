import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // AoE4 civ/map art — fandom wiki CDN only (per project asset rule).
      { protocol: "https", hostname: "static.wikia.nocookie.net" },
    ],
  },

  /**
   * Civ and map art is the largest thing we serve — every visitor pulls the
   * whole civ pool — and it is identical for everyone, so it belongs at the
   * edge rather than coming off the origin every time.
   *
   * Next serves `public/` with `max-age=0`, and Railway's CDN honours whatever
   * the origin says, so without this the art is never cached: repeat requests
   * come back `x-cache: MISS`. The Default TTL in Railway's settings is only a
   * fallback for responses that carry no Cache-Control at all, so it does not
   * cover this.
   *
   * The two ages differ on purpose. These filenames are not content-hashed the
   * way `_next/static` is, so a replaced image keeps its URL:
   *   - `s-maxage` (shared caches only) parks it at the edge for a year, which
   *     is where the egress saving is. The edge is ours to invalidate, and
   *     Railway is set to purge everything on each successful deploy — so
   *     replacing an image is just a deploy, same as any other change.
   *   - `max-age` keeps browsers to five minutes, because a browser cache is
   *     *not* ours to invalidate. That is the whole reason for the split: a
   *     visitor holding a year-old file would be stuck with it, and no purge
   *     on our side could reach them.
   */
  async headers() {
    return [
      {
        source: "/:dir(civs|maps)/:file*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=300, s-maxage=31536000, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
