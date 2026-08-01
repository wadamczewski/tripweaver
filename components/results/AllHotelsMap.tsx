"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import clsx from "clsx";
import { BedDouble, Map as MapIcon, MapPin, ShieldCheck, Star, Utensils, X } from "lucide-react";
import type { AccommodationOption } from "@/lib/types";
import { DetailTile } from "./HotelDetailsModal";
import { formatMoney, getRoomSummary } from "./helpers";
import type { MappableHotel } from "./HotelMapCanvas";

const HotelMapCanvas = dynamic(() => import("./HotelMapCanvas"), { ssr: false });

type AllHotelsMapProps = {
  options: AccommodationOption[];
};

function hasCoordinates(option: AccommodationOption): option is MappableHotel {
  return typeof option.latitude === "number" && typeof option.longitude === "number";
}

/**
 * Shows every already-fetched accommodation option (no re-fetching — the
 * same options array the list/cards already render from) as pins on one
 * zoomable map, with a details-and-photos pane for whichever pin is
 * selected. Map:details ratio is 1.5fr:1fr — the map gets 50% more space
 * than the details pane, as requested. Portaled to document.body (like
 * HotelDetailsModal) so its `fixed` positioning is relative to the real
 * viewport, not trapped by an ancestor with its own CSS transform/filter.
 */
export function AllHotelsMap({ options }: AllHotelsMapProps) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const mappable = useMemo(() => options.filter(hasCoordinates), [options]);
  const selectedHotel = mappable.find((hotel) => hotel.id === selectedId) ?? mappable[0] ?? null;

  useEffect(() => {
    if (open && !selectedId && mappable.length > 0) {
      setSelectedId(mappable[0].id);
    }
  }, [open, selectedId, mappable]);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [selectedHotel?.id]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (options.length === 0) return null;

  const images =
    selectedHotel?.imageUrls && selectedHotel.imageUrls.length > 0
      ? selectedHotel.imageUrls
      : selectedHotel
        ? [selectedHotel.imageUrl]
        : [];

  return (
    <>
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink/70 shadow-soft transition hover:border-accent/30 hover:text-accentDark"
        onClick={() => setOpen(true)}
      >
        <MapIcon className="h-4 w-4" aria-hidden="true" />
        Show all {mappable.length} on map
      </button>

      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/60 p-4 backdrop-blur-md"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setOpen(false);
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label="All hotels on map"
                className="grid h-[92vh] w-full max-w-[95vw] grid-cols-1 overflow-hidden rounded-2xl bg-white shadow-lift lg:grid-cols-[1.5fr_1fr]"
              >
                <div className="relative h-full min-h-[16rem]">
                  <HotelMapCanvas
                    hotels={mappable}
                    selectedId={selectedHotel?.id ?? null}
                    onSelect={setSelectedId}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-3 z-[1000] grid h-9 w-9 place-items-center rounded-full bg-white text-ink shadow-lift transition hover:bg-mist"
                    onClick={() => setOpen(false)}
                    aria-label="Close map"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>

                <div className="flex flex-col overflow-y-auto border-t border-line lg:border-l lg:border-t-0">
                  {selectedHotel ? (
                    <>
                      <div className="relative h-56 shrink-0 bg-mist">
                        {images[activeImageIndex] ? (
                          <img
                            src={images[activeImageIndex]}
                            alt={selectedHotel.name}
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                        <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-ink shadow-sm">
                          {selectedHotel.provider}
                        </div>
                      </div>

                      {images.length > 1 ? (
                        <div className="flex gap-1.5 overflow-x-auto border-b border-line bg-paper/60 p-2">
                          {images.slice(0, 30).map((src, index) => (
                            <button
                              key={src}
                              type="button"
                              className={clsx(
                                "h-12 w-16 shrink-0 overflow-hidden rounded-md border-2 transition",
                                index === activeImageIndex
                                  ? "border-accent"
                                  : "border-transparent opacity-70 hover:opacity-100"
                              )}
                              onClick={() => setActiveImageIndex(index)}
                              aria-label={`Show photo ${index + 1}`}
                              aria-current={index === activeImageIndex}
                            >
                              <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
                            </button>
                          ))}
                        </div>
                      ) : null}

                      <div className="flex flex-col gap-4 p-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-sage/10 px-3 py-1 text-xs font-semibold text-sageDark">
                            <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                            {selectedHotel.rating} ({selectedHotel.reviewCount})
                          </span>
                        </div>

                        <div>
                          <h2 className="text-lg font-semibold text-ink">{selectedHotel.name}</h2>
                          <p className="mt-1 flex items-center gap-1 text-sm text-ink/60">
                            <MapPin className="h-4 w-4" aria-hidden="true" />
                            {selectedHotel.location}
                          </p>
                        </div>

                        <div className="rounded-lg bg-paper p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/60">
                            Total price
                          </p>
                          <p className="mt-1 text-2xl font-bold text-ink">
                            {formatMoney(selectedHotel.totalPrice)}
                          </p>
                          <p className="mt-1 text-sm text-ink/60">
                            {selectedHotel.nights} night{selectedHotel.nights === 1 ? "" : "s"} ·{" "}
                            {selectedHotel.taxesIncluded ? "Taxes incl." : "Taxes est."}
                          </p>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                          <DetailTile icon={BedDouble} label="Room" value={selectedHotel.roomType} />
                          <DetailTile icon={Utensils} label="Board" value={selectedHotel.boardType} />
                          <DetailTile
                            icon={ShieldCheck}
                            label="Cancellation"
                            value={selectedHotel.cancellationPolicy}
                          />
                          <DetailTile
                            icon={MapPin}
                            label="Occupancy"
                            value={getRoomSummary(selectedHotel.roomAllocation)}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full items-center justify-center p-8 text-center text-sm text-ink/50">
                      No hotels with map coordinates in the current results.
                    </div>
                  )}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
