"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import type { AccommodationOption } from "@/lib/types";

export type MappableHotel = AccommodationOption & { latitude: number; longitude: number };

type HotelMapCanvasProps = {
  hotels: MappableHotel[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

// Plain divIcon + CSS instead of Leaflet's default marker images — those
// need a webpack asset-path workaround in Next.js for no real benefit here.
function markerIcon(selected: boolean) {
  return L.divIcon({
    className: "",
    html: `<span class="hotel-marker${selected ? " hotel-marker--selected" : ""}"></span>`,
    iconSize: selected ? [22, 22] : [14, 14],
    iconAnchor: selected ? [11, 11] : [7, 7]
  });
}

function FitBounds({ hotels }: { hotels: MappableHotel[] }) {
  const map = useMap();

  useEffect(() => {
    if (hotels.length === 0) return;
    const bounds = L.latLngBounds(hotels.map((hotel) => [hotel.latitude, hotel.longitude]));
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 });
  }, [hotels, map]);

  return null;
}

export default function HotelMapCanvas({ hotels, selectedId, onSelect }: HotelMapCanvasProps) {
  const center = useMemo<[number, number]>(() => {
    const first = hotels[0];
    return first ? [first.latitude, first.longitude] : [0, 0];
  }, [hotels]);

  return (
    <MapContainer center={center} zoom={13} scrollWheelZoom className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds hotels={hotels} />
      {hotels.map((hotel) => (
        <Marker
          key={hotel.id}
          position={[hotel.latitude, hotel.longitude]}
          icon={markerIcon(hotel.id === selectedId)}
          eventHandlers={{ click: () => onSelect(hotel.id) }}
        />
      ))}
    </MapContainer>
  );
}
