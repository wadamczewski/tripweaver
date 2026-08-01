"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import {
  BedDouble,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ImagesIcon,
  Info,
  MapPin,
  ShieldCheck,
  Star,
  Utensils,
  X
} from "lucide-react";
import type { AccommodationOption } from "@/lib/types";
import { formatMoney, getRoomSummary } from "./helpers";

type HotelDetailsModalProps = {
  option: AccommodationOption;
  children: ReactNode;
  className?: string;
};

const OPEN_DELAY_MS = 150;
const CLOSE_DELAY_MS = 200;
const MAP_BBOX_DELTA = 0.006;

/**
 * Wraps a hotel's hero photo. Hovering (or focusing/clicking the small
 * affordance badge, for touch and keyboard users) opens a centered modal
 * with the full photo gallery, the hotel's real details, and a small map —
 * rendered through a portal into document.body so it escapes the card's own
 * overflow-hidden and sits above a blurred, dimmed backdrop covering the
 * whole page.
 */
export function HotelDetailsModal({ option, children, className }: HotelDetailsModalProps) {
  const [open, setOpen] = useState(false);
  const [focusOnOpen, setFocusOnOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const images = option.imageUrls && option.imageUrls.length > 0 ? option.imageUrls : [option.imageUrl];

  const openNow = useCallback((viaInteraction: boolean) => {
    clearTimeout(closeTimer.current);
    setFocusOnOpen(viaInteraction);
    setOpen(true);
  }, []);

  const scheduleOpen = useCallback(() => {
    clearTimeout(closeTimer.current);
    openTimer.current = setTimeout(() => openNow(false), OPEN_DELAY_MS);
  }, [openNow]);

  const scheduleClose = useCallback(() => {
    clearTimeout(openTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }, []);

  const cancelClose = useCallback(() => {
    clearTimeout(closeTimer.current);
  }, []);

  const closeNow = useCallback(() => {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(
    () => () => {
      clearTimeout(openTimer.current);
      clearTimeout(closeTimer.current);
    },
    []
  );

  return (
    <div className={clsx("relative", className)} onMouseEnter={scheduleOpen} onMouseLeave={scheduleClose}>
      {children}

      <button
        ref={triggerRef}
        type="button"
        className="absolute bottom-2 right-2 z-10 inline-flex items-center gap-1.5 rounded-full bg-ink/70 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-ink/85"
        onFocus={() => openNow(true)}
        onBlur={scheduleClose}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (open) {
            closeNow();
          } else {
            openNow(true);
          }
        }}
        aria-label={
          images.length > 1
            ? `View all ${images.length} photos and details for ${option.name}`
            : `View details for ${option.name}`
        }
      >
        {images.length > 1 ? (
          <>
            <ImagesIcon className="h-3.5 w-3.5" aria-hidden="true" />+{images.length - 1}
          </>
        ) : (
          <>
            <Info className="h-3.5 w-3.5" aria-hidden="true" />
            Details
          </>
        )}
      </button>

      {open
        ? createPortal(
            <DetailsModal
              option={option}
              images={images}
              focusOnOpen={focusOnOpen}
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
              onClose={closeNow}
            />,
            document.body
          )
        : null}
    </div>
  );
}

function DetailsModal({
  option,
  images,
  focusOnOpen,
  onMouseEnter,
  onMouseLeave,
  onClose
}: {
  option: AccommodationOption;
  images: string[];
  focusOnOpen: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const total = images.length;

  const goPrev = useCallback(() => setIndex((current) => (current - 1 + total) % total), [total]);
  const goNext = useCallback(() => setIndex((current) => (current + 1) % total), [total]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") goPrev();
      if (event.key === "ArrowRight") goNext();
    }

    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [goNext, goPrev, onClose]);

  useEffect(() => {
    if (focusOnOpen) panelRef.current?.focus();
  }, [focusOnOpen]);

  const hasCoordinates = typeof option.latitude === "number" && typeof option.longitude === "number";
  const mapUrl = hasCoordinates
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${option.longitude! - MAP_BBOX_DELTA}%2C${
        option.latitude! - MAP_BBOX_DELTA
      }%2C${option.longitude! + MAP_BBOX_DELTA}%2C${option.latitude! + MAP_BBOX_DELTA}&layer=mapnik&marker=${
        option.latitude
      }%2C${option.longitude}`
    : undefined;
  const mapLinkUrl = hasCoordinates
    ? `https://www.openstreetmap.org/?mlat=${option.latitude}&mlon=${option.longitude}#map=16/${option.latitude}/${option.longitude}`
    : undefined;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/60 p-4 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${option.name} details`}
        tabIndex={-1}
        className="grid max-h-[88vh] w-full max-w-5xl grid-cols-1 overflow-hidden rounded-2xl bg-white shadow-lift outline-none lg:grid-cols-[1.35fr_1fr]"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div className="relative min-h-[16rem] bg-ink lg:min-h-full">
          <div className="relative h-full w-full">
            {images.map((src, position) => {
              const distance = Math.min(Math.abs(position - index), total - Math.abs(position - index));
              if (distance > 1) return null;

              return (
                <img
                  key={src}
                  src={src}
                  alt={`${option.name} — photo ${position + 1} of ${total}`}
                  loading="lazy"
                  className={clsx(
                    "absolute inset-0 h-full w-full object-cover transition-opacity duration-200",
                    position === index ? "opacity-100" : "opacity-0"
                  )}
                />
              );
            })}
          </div>

          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
            {total > 1 ? (
              <span className="pointer-events-auto rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white">
                {index + 1} / {total}
              </span>
            ) : (
              <span />
            )}
            <button
              type="button"
              className="pointer-events-auto grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white transition hover:bg-black/75"
              onClick={onClose}
              aria-label="Close details"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {total > 1 ? (
            <>
              <button
                type="button"
                className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white transition hover:bg-black/75"
                onClick={goPrev}
                aria-label="Previous photo"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white transition hover:bg-black/75"
                onClick={goNext}
                aria-label="Next photo"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>

              <div className="absolute inset-x-0 bottom-0 flex gap-1.5 overflow-x-auto bg-gradient-to-t from-black/75 to-transparent p-2 pt-8">
                {images.map((src, position) => (
                  <button
                    key={src}
                    type="button"
                    className={clsx(
                      "h-10 w-14 shrink-0 overflow-hidden rounded-md border-2 transition",
                      position === index ? "border-white" : "border-transparent opacity-60 hover:opacity-90"
                    )}
                    onClick={() => setIndex(position)}
                    aria-label={`Go to photo ${position + 1}`}
                    aria-current={position === index}
                  >
                    <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>

        <div className="flex flex-col overflow-y-auto p-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-ink/60">{option.provider}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-sage/10 px-3 py-1 text-xs font-semibold text-sageDark">
              <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
              {option.rating} ({option.reviewCount})
            </span>
          </div>

          <h2 className="text-xl font-semibold text-ink">{option.name}</h2>
          <p className="mt-1 flex items-center gap-1 text-sm text-ink/60">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {option.location}
          </p>

          <div className="mt-4 rounded-lg bg-paper p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/60">Total price</p>
            <p className="mt-1 text-2xl font-bold text-ink">{formatMoney(option.totalPrice)}</p>
            <p className="mt-1 text-sm text-ink/60">
              {option.nights} night{option.nights === 1 ? "" : "s"} · {option.taxesIncluded ? "Taxes incl." : "Taxes est."}
            </p>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <DetailTile icon={BedDouble} label="Room" value={option.roomType} />
            <DetailTile icon={Utensils} label="Board" value={option.boardType} />
            <DetailTile icon={ShieldCheck} label="Cancellation" value={option.cancellationPolicy} />
            <DetailTile icon={MapPin} label="Occupancy" value={getRoomSummary(option.roomAllocation)} />
          </div>

          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink/60">Location</p>
            {mapUrl ? (
              <>
                <iframe
                  src={mapUrl}
                  title={`Map showing the location of ${option.name}`}
                  loading="lazy"
                  className="h-40 w-full rounded-lg border border-line"
                />
                <a
                  href={mapLinkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accentDark hover:underline"
                >
                  Open in OpenStreetMap
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </>
            ) : (
              <div className="flex h-40 w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line bg-paper text-center text-xs text-ink/50">
                <MapPin className="h-5 w-5" aria-hidden="true" />
                Exact location not provided by this provider.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DetailTile({
  icon: Icon,
  label,
  value
}: {
  icon: typeof BedDouble;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-line bg-paper/70 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink/60">
        <Icon className="h-4 w-4 text-accent" aria-hidden="true" />
        {label}
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-ink">{value}</p>
    </div>
  );
}
