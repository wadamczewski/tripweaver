"use client";

import { useEffect, useState } from "react";

// Generic scenic fallbacks used before a destination resolves, or if Wikipedia
// has no usable photo for it. Not destination-specific, just reliably pretty.
const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1500835556837-99ac94a94552?auto=format&fit=crop&w=1920&q=80"
];

// Wikipedia media-list items that are almost never a landscape/landmark photo.
const UNWANTED_TITLE =
  /flag|coat[_ ]of[_ ]arms|blazon|locator|logo|seal[_ ]of|emblem|blank[_ ]map|location[_ ]map|insignia|\.svg$/i;

type MediaListItem = {
  type?: string;
  title?: string;
  srcset?: Array<{ src?: string; scale?: string }>;
};

async function resolveWikipediaTitle(query: string, signal: AbortSignal): Promise<string | null> {
  const url = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(
    query
  )}&limit=1&namespace=0&format=json&origin=*`;
  const response = await fetch(url, { signal });
  if (!response.ok) return null;

  const data = (await response.json()) as [string, string[], string[], string[]];
  return data?.[1]?.[0] ?? null;
}

function parseScale(scale?: string): number {
  const match = scale?.match(/[\d.]+/);
  return match ? Number.parseFloat(match[0]) : 1;
}

// media-list srcset entries are protocol-relative (e.g. "//upload.wikimedia.org/...")
// and come in a couple of resolutions ("1x"/"2x") — take the highest one.
function bestSrcFromSrcset(srcset: MediaListItem["srcset"]): string | undefined {
  if (!srcset || srcset.length === 0) return undefined;

  const best = [...srcset].sort((a, b) => parseScale(b.scale) - parseScale(a.scale))[0]?.src;
  if (!best) return undefined;

  return best.startsWith("//") ? `https:${best}` : best;
}

async function fetchWikipediaImages(title: string, signal: AbortSignal): Promise<string[]> {
  const path = title.trim().replace(/\s+/g, "_");
  const url = `https://en.wikipedia.org/api/rest_v1/page/media-list/${encodeURIComponent(path)}`;
  const response = await fetch(url, { signal });
  if (!response.ok) return [];

  const data = (await response.json()) as { items?: MediaListItem[] };
  const items = Array.isArray(data.items) ? data.items : [];

  return items
    .filter((item) => item.type === "image" && item.title && !UNWANTED_TITLE.test(item.title))
    .map((item) => bestSrcFromSrcset(item.srcset))
    .filter((src): src is string => Boolean(src))
    .slice(0, 5);
}

// Resolves a typed destination (e.g. "Barcelona") to real photos of that
// place via Wikipedia's public, keyless REST API — its lead article images
// are curated by editors, so they reliably show the actual city skyline or
// landmark rather than a random stock photo. Falls back to generic scenery
// if no article/photo is found. Rotates through whatever it finds so the
// backdrop isn't static.
export function useDestinationImages(destination: string, rotateMs = 9000) {
  const [images, setImages] = useState<string[]>(FALLBACK_IMAGES);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const query = destination.trim();

    if (!query) {
      setImages(FALLBACK_IMAGES);
      setActiveIndex(0);
      return;
    }

    const controller = new AbortController();
    const debounce = setTimeout(() => {
      (async () => {
        try {
          const title = await resolveWikipediaTitle(query, controller.signal);
          if (!title) throw new Error("No matching Wikipedia page");

          const found = await fetchWikipediaImages(title, controller.signal);
          if (controller.signal.aborted) return;

          setImages(found.length > 0 ? found : FALLBACK_IMAGES);
          setActiveIndex(0);
        } catch {
          if (controller.signal.aborted) return;
          setImages(FALLBACK_IMAGES);
          setActiveIndex(0);
        }
      })();
    }, 500);

    return () => {
      clearTimeout(debounce);
      controller.abort();
    };
  }, [destination]);

  useEffect(() => {
    if (images.length <= 1) return;

    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % images.length);
    }, rotateMs);

    return () => clearInterval(timer);
  }, [images, rotateMs]);

  return { images, activeIndex };
}
