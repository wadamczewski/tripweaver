import { createTravelerGroup, DEFAULT_CHILD_AGES } from "@/lib/defaults";
import type {
  AccommodationStandard,
  PreferenceKey,
  RoomOccupancy,
  TravelerGroup,
  TravelerType,
  TransportMode
} from "@/lib/types";

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export const TRANSPORT_OPTIONS: Array<{
  value: TransportMode;
  label: string;
  helper: string;
}> = [
  { value: "flight", label: "Flight", helper: "Fastest reach" },
  { value: "train", label: "Train", helper: "City-center links" },
  { value: "bus", label: "Bus", helper: "Lower fares" },
  { value: "car", label: "Car", helper: "Road option" },
  { value: "ferry", label: "Ferry", helper: "Coastal routes" },
  { value: "transfer", label: "Transfer", helper: "Door-to-door" }
];

export const ACCOMMODATION_OPTIONS: Array<{
  value: AccommodationStandard;
  label: string;
}> = [
  { value: "any", label: "Any stay" },
  { value: "apartment", label: "Apartment" },
  { value: "3-star", label: "3 star" },
  { value: "4-star", label: "4 star" },
  { value: "5-star", label: "5 star" }
];

export const PREFERENCE_OPTIONS: Array<{
  value: PreferenceKey;
  label: string;
  helper: string;
}> = [
  { value: "cheapest", label: "Cheapest trip", helper: "Prioritize the lowest complete estimate" },
  { value: "shortest", label: "Shortest travel time", helper: "Prefer less time in transit" },
  { value: "fewestTransfers", label: "Fewest transfers", helper: "Reduce connection risk and moving parts" },
  { value: "lowestCarbon", label: "Lowest carbon footprint", helper: "Favor rail and lower-emission routes" },
  { value: "hotelQuality", label: "Best hotel quality", helper: "Weight rating, reviews, and room fit" },
  { value: "allInclusive", label: "All-inclusive preference", helper: "Value packages with meals and transfers" }
];

export function travelerAges(group: TravelerGroup, type: Extract<TravelerType, "child" | "infant">): number[] {
  return group.travelers
    .filter((traveler) => traveler.type === type)
    .map((traveler) => traveler.ageAtDeparture);
}

export function infantSeatFlags(group: TravelerGroup): boolean[] {
  return group.travelers
    .filter((traveler) => traveler.type === "infant")
    .map((traveler) => Boolean(traveler.requiresSeparateSeat));
}

export function resizeChildAges(currentAges: number[], count: number): number[] {
  return Array.from({ length: count }, (_, index) => currentAges[index] ?? DEFAULT_CHILD_AGES[index] ?? 8);
}

export function resizeInfantAges(currentAges: number[], count: number): number[] {
  return Array.from({ length: count }, (_, index) => currentAges[index] ?? 0);
}

export function resizeInfantSeatFlags(currentFlags: boolean[], count: number): boolean[] {
  return Array.from({ length: count }, (_, index) => currentFlags[index] ?? false);
}

export function buildTravelerGroup(options: {
  adults: number;
  childAges: number[];
  infantAges: number[];
  infantSeats: boolean[];
  needsAdjacentSeats: boolean;
  needsAdjacentRooms: boolean;
}): TravelerGroup {
  return createTravelerGroup({
    adults: Math.max(0, options.adults),
    childAges: options.childAges,
    infantAges: options.infantAges,
    infantSeats: options.infantSeats,
    needsAdjacentSeats: options.needsAdjacentSeats,
    needsAdjacentRooms: options.needsAdjacentRooms
  });
}

export function roomAffectingTravelerShapeChanged(previous: TravelerGroup, next: TravelerGroup): boolean {
  return (
    previous.adults !== next.adults ||
    joinAges(travelerAges(previous, "child")) !== joinAges(travelerAges(next, "child")) ||
    joinAges(travelerAges(previous, "infant")) !== joinAges(travelerAges(next, "infant"))
  );
}

export function buildRoomsForTravelers(group: TravelerGroup): RoomOccupancy[] {
  const childAges = travelerAges(group, "child");
  const infantAges = travelerAges(group, "infant");
  const totalTravelers = group.adults + childAges.length + infantAges.length;
  const roomCount = Math.max(1, Math.ceil(totalTravelers / 5));
  const rooms: RoomOccupancy[] = Array.from({ length: roomCount }, (_, index) => ({
    roomId: `room-${index + 1}`,
    adults: 0,
    childAges: [],
    infantAges: []
  }));

  let remainingAdults = group.adults;

  if (remainingAdults > 0 && roomCount > 1) {
    rooms.forEach((room) => {
      if (remainingAdults > 0) {
        room.adults += 1;
        remainingAdults -= 1;
      }
    });
  }

  distributeAdults(rooms, remainingAdults);
  distributeAges(rooms, childAges, "childAges");
  distributeAges(rooms, infantAges, "infantAges");

  return rooms;
}

export function roomTravelerTotal(room: RoomOccupancy): number {
  return room.adults + room.childAges.length + room.infantAges.length;
}

export function roomTotals(rooms: RoomOccupancy[]): {
  adults: number;
  children: number;
  infants: number;
  total: number;
} {
  const adults = rooms.reduce((sum, room) => sum + room.adults, 0);
  const children = rooms.reduce((sum, room) => sum + room.childAges.length, 0);
  const infants = rooms.reduce((sum, room) => sum + room.infantAges.length, 0);

  return {
    adults,
    children,
    infants,
    total: adults + children + infants
  };
}

export function nextRoomId(rooms: RoomOccupancy[]): string {
  const highest = rooms.reduce((max, room) => {
    const match = room.roomId.match(/\d+$/);
    return Math.max(max, match ? Number(match[0]) : 0);
  }, 0);

  return `room-${highest + 1}`;
}

function distributeAdults(rooms: RoomOccupancy[], adults: number): void {
  let remainingAdults = adults;
  let index = 0;

  while (remainingAdults > 0) {
    const room = rooms[index % rooms.length];

    if (roomTravelerTotal(room) < 5) {
      room.adults += 1;
      remainingAdults -= 1;
    }

    index += 1;
  }
}

function distributeAges(rooms: RoomOccupancy[], ages: number[], field: "childAges" | "infantAges"): void {
  ages.forEach((age) => {
    const room = rooms.find((candidate) => roomTravelerTotal(candidate) < 5) ?? rooms[rooms.length - 1];
    room[field] = [...room[field], age];
  });
}

function joinAges(ages: number[]): string {
  return ages.join("|");
}

