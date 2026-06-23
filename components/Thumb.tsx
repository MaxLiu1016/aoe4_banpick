"use client";

import { useState, useEffect } from "react";

/**
 * Image thumbnail that falls back to a neutral placeholder when the src is
 * missing or fails to load (e.g. a user-supplied map URL that 404s). The entry's
 * name is always shown as a text label alongside, so a broken image degrades to
 * just the text. Uses a plain <img> so ANY URL works (no domain allow-list).
 */
export function Thumb({ src, alt, className = "" }: { src?: string; alt: string; className?: string }) {
  const [err, setErr] = useState(false);
  useEffect(() => setErr(false), [src]);

  if (!src || err) {
    return <span className={`inline-block bg-surface-2/60 ${className}`} aria-label={alt} role="img" />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" onError={() => setErr(true)} className={className} />;
}
