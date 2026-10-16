"use client";

import { useState } from "react";
import Image from "next/image";

export function ProductPhoto({
  src,
  alt,
  fallback,
  imageClassName,
  fallbackClassName,
}: {
  src: string | null;
  alt: string;
  fallback: string;
  imageClassName: string;
  fallbackClassName: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span
        role="img"
        aria-label={alt || "Product image unavailable"}
        className={fallbackClassName}
      >
        {fallback}
      </span>
    );
  }

  return (
    <>
      {!loaded && (
        <span
          aria-label="Loading product image"
          className="absolute inset-0 animate-pulse bg-slate-200/80"
        />
      )}
      <Image
        src={src}
        alt={alt}
        fill
        unoptimized
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`${imageClassName} transition-opacity ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </>
  );
}
