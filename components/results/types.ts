import type {
  AccommodationOption,
  PackageHoliday,
  TransportOption,
  TripOption
} from "@/lib/types";

export type ResultsTabId = "complete" | "transport" | "accommodation" | "packages";

export type SaveTarget =
  | { kind: "trip"; id: string; label: string; option: TripOption }
  | { kind: "transport"; id: string; label: string; option: TransportOption }
  | { kind: "accommodation"; id: string; label: string; option: AccommodationOption }
  | { kind: "package"; id: string; label: string; option: PackageHoliday };

export type ProviderActionPayload = {
  id: string;
  kind: "trip" | "transport" | "accommodation" | "package" | "segment";
  label: string;
  provider: string;
  url?: string;
  parentOptionId?: string;
};

export type ProviderStatus = {
  id: string;
  label: string;
  state: "queued" | "running" | "complete" | "error";
  detail?: string;
  estimateCount?: number;
};

export type RecommendationCategoryId =
  | "ai-recommended"
  | "cheapest"
  | "fastest"
  | "package-holiday";

export type RecommendationBadge = {
  id: RecommendationCategoryId;
  label: string;
  description: string;
};

