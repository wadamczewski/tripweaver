import type { TransportMode } from "@/lib/types";

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins} min`;
  }

  if (mins === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${mins}m`;
}

export function modeLabel(mode: TransportMode): string {
  const labels: Record<TransportMode, string> = {
    flight: "Flight",
    train: "Train",
    bus: "Bus",
    car: "Car",
    ferry: "Ferry",
    transfer: "Transfer"
  };

  return labels[mode];
}

export function shortDate(date: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric"
  }).format(new Date(date));
}

export function compactTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}
