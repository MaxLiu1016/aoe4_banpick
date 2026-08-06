/**
 * The site's own address.
 *
 * Needed because metadata has to be absolute: a relative OG image is not fetched
 * by anything that renders a link preview, so a share card silently loses its
 * picture. Railway provides its public domain at build time; the env var is the
 * override for a custom domain.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const railway = process.env.RAILWAY_PUBLIC_DOMAIN;
  if (railway) return `https://${railway}`;
  return "http://localhost:3000";
}
