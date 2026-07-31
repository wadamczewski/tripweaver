"use client";

import { Check, DoorOpen, Minus, Plus, RotateCcw, X } from "lucide-react";
import { useMemo } from "react";

import { Tooltip } from "@/components/ui/Tooltip";
import type { RoomOccupancy, Traveler, TravelerGroup } from "@/lib/types";

import { buildRoomsForTravelers, cn, nextRoomId, roomTotals, roomTravelerTotal } from "./searchUtils";

export type RoomAllocatorProps = {
  rooms: RoomOccupancy[];
  travelers: TravelerGroup;
  onRoomsChange: (rooms: RoomOccupancy[]) => void;
  className?: string;
};

type MinorToken = {
  id: string;
  type: "child" | "infant";
  age: number;
  label: string;
};

type AssignmentMap = Record<string, string[]>;

export function RoomAllocator({ rooms, travelers, onRoomsChange, className }: RoomAllocatorProps) {
  const safeRooms = rooms.length > 0 ? rooms : buildRoomsForTravelers(travelers);
  const childTokens = useMemo(() => minorTokens(travelers, "child"), [travelers]);
  const infantTokens = useMemo(() => minorTokens(travelers, "infant"), [travelers]);
  const childAssignments = useMemo(
    () => buildAssignments(safeRooms, childTokens, "childAges"),
    [safeRooms, childTokens]
  );
  const infantAssignments = useMemo(
    () => buildAssignments(safeRooms, infantTokens, "infantAges"),
    [safeRooms, infantTokens]
  );
  const totals = roomTotals(safeRooms);

  function updateRoom(roomId: string, patch: Partial<RoomOccupancy>): void {
    onRoomsChange(safeRooms.map((room) => (room.roomId === roomId ? { ...room, ...patch } : room)));
  }

  function addRoom(): void {
    onRoomsChange([
      ...safeRooms,
      {
        roomId: nextRoomId(safeRooms),
        adults: 0,
        childAges: [],
        infantAges: []
      }
    ]);
  }

  function removeRoom(roomId: string): void {
    if (safeRooms.length <= 1) {
      return;
    }

    onRoomsChange(safeRooms.filter((room) => room.roomId !== roomId));
  }

  function toggleMinor(roomId: string, token: MinorToken): void {
    const currentAssignments = token.type === "child" ? childAssignments : infantAssignments;
    const otherAssignments = token.type === "child" ? infantAssignments : childAssignments;
    const nextAssignments = toggleAssignment(currentAssignments, roomId, token.id);

    onRoomsChange(
      safeRooms.map((room) => {
        const nextChildIds = token.type === "child" ? nextAssignments[room.roomId] ?? [] : otherAssignments[room.roomId] ?? [];
        const nextInfantIds = token.type === "infant" ? nextAssignments[room.roomId] ?? [] : otherAssignments[room.roomId] ?? [];

        return {
          ...room,
          childAges: idsToAges(nextChildIds, childTokens),
          infantAges: idsToAges(nextInfantIds, infantTokens)
        };
      })
    );
  }

  return (
    <section className={cn("space-y-3 rounded-2xl border border-line bg-white p-4 shadow-soft", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <DoorOpen className="h-4 w-4 text-accent" aria-hidden="true" />
          Room allocation
          <Tooltip text="Assign adults and child ages to rooms before provider estimates run." />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-paper px-3 text-xs font-semibold text-ink transition hover:border-accent/50 hover:bg-white"
            onClick={() => onRoomsChange(buildRoomsForTravelers(travelers))}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Auto-fit
          </button>
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ink px-3 text-xs font-semibold text-white transition hover:bg-accentDark"
            onClick={addRoom}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add room
          </button>
        </div>
      </div>

      <div className="flex divide-x divide-line overflow-hidden rounded-xl border border-line">
        <AllocationMeter label="Adults" current={totals.adults} target={travelers.adults} />
        <AllocationMeter label="Children" current={totals.children} target={travelers.children} />
        <AllocationMeter label="Infants" current={totals.infants} target={travelers.infants} />
      </div>

      <div className="space-y-2">
        {safeRooms.map((room, index) => (
          <div className="rounded-xl border border-line bg-paper/70 p-3" key={room.roomId}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-bold text-ink">Room {index + 1}</span>
                <span className="text-xs text-ink/50">{roomTravelerTotal(room)} of 5 assigned</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-ink/55">Adults</span>
                  <div className="flex h-7 items-center gap-1.5 rounded-lg border border-line bg-white px-1">
                    <button
                      type="button"
                      className="grid h-5 w-5 place-items-center rounded text-ink transition hover:bg-mist disabled:cursor-not-allowed disabled:opacity-30"
                      disabled={room.adults <= 0}
                      onClick={() => updateRoom(room.roomId, { adults: Math.max(0, room.adults - 1) })}
                      aria-label={`Decrease adults in room ${index + 1}`}
                    >
                      <Minus className="h-3 w-3" aria-hidden="true" />
                    </button>
                    <span className="min-w-3 text-center text-xs font-bold text-ink">{room.adults}</span>
                    <button
                      type="button"
                      className="grid h-5 w-5 place-items-center rounded text-ink transition hover:bg-mist disabled:cursor-not-allowed disabled:opacity-30"
                      disabled={roomTravelerTotal(room) >= 5}
                      onClick={() => updateRoom(room.roomId, { adults: Math.min(5, room.adults + 1) })}
                      aria-label={`Increase adults in room ${index + 1}`}
                    >
                      <Plus className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  className="grid h-7 w-7 place-items-center rounded-lg text-ink/50 transition hover:bg-white hover:text-accent disabled:cursor-not-allowed disabled:text-ink/20"
                  disabled={safeRooms.length <= 1}
                  onClick={() => removeRoom(room.roomId)}
                  aria-label={`Remove room ${index + 1}`}
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              <MinorAssignment
                label="Children"
                emptyLabel="No children"
                roomId={room.roomId}
                tokens={childTokens}
                assignments={childAssignments}
                roomIsFull={roomTravelerTotal(room) >= 5}
                onToggle={toggleMinor}
              />
              <MinorAssignment
                label="Infants"
                emptyLabel="No infants"
                roomId={room.roomId}
                tokens={infantTokens}
                assignments={infantAssignments}
                roomIsFull={roomTravelerTotal(room) >= 5}
                onToggle={toggleMinor}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AllocationMeter({ label, current, target }: { label: string; current: number; target: number }) {
  const isMatched = current === target;

  return (
    <div className="flex flex-1 items-center justify-between gap-2 px-3 py-2">
      <span className="text-xs font-semibold text-ink/55">{label}</span>
      <span className="flex items-center gap-1 text-sm font-bold text-ink">
        {current}/{target}
        {isMatched ? <Check className="h-3.5 w-3.5 text-sage" aria-hidden="true" /> : null}
      </span>
    </div>
  );
}

function MinorAssignment({
  label,
  emptyLabel,
  roomId,
  tokens,
  assignments,
  roomIsFull,
  onToggle
}: {
  label: string;
  emptyLabel: string;
  roomId: string;
  tokens: MinorToken[];
  assignments: AssignmentMap;
  roomIsFull: boolean;
  onToggle: (roomId: string, token: MinorToken) => void;
}) {
  if (tokens.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-semibold text-ink/55">{label}:</span>
      <div className="flex flex-wrap gap-1.5">
        {tokens.map((token) => {
          const isAssigned = assignments[roomId]?.includes(token.id) ?? false;
          const isDisabled = roomIsFull && !isAssigned;

          return (
            <button
              type="button"
              className={cn(
                "rounded-lg border px-2.5 py-1 text-xs font-semibold transition",
                isAssigned
                  ? "border-accent bg-accent text-white"
                  : "border-line bg-white text-ink hover:border-accent/50",
                isDisabled ? "cursor-not-allowed opacity-45 hover:border-line" : ""
              )}
              disabled={isDisabled}
              key={token.id}
              onClick={() => onToggle(roomId, token)}
              aria-pressed={isAssigned}
              title={emptyLabel}
            >
              {token.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function minorTokens(group: TravelerGroup, type: MinorToken["type"]): MinorToken[] {
  return group.travelers
    .filter((traveler): traveler is Traveler & { type: MinorToken["type"] } => traveler.type === type)
    .map((traveler, index) => ({
      id: traveler.id,
      type,
      age: traveler.ageAtDeparture,
      label: `${type === "child" ? "Child" : "Infant"} ${index + 1} - age ${traveler.ageAtDeparture}`
    }));
}

function buildAssignments(rooms: RoomOccupancy[], tokens: MinorToken[], field: "childAges" | "infantAges"): AssignmentMap {
  const usedTokenIds = new Set<string>();

  return rooms.reduce<AssignmentMap>((assignments, room) => {
    assignments[room.roomId] = room[field]
      .map((age) => {
        const exactToken = tokens.find((token) => token.age === age && !usedTokenIds.has(token.id));
        const fallbackToken = exactToken ?? tokens.find((token) => !usedTokenIds.has(token.id));

        if (!fallbackToken) {
          return undefined;
        }

        usedTokenIds.add(fallbackToken.id);
        return fallbackToken.id;
      })
      .filter((tokenId): tokenId is string => Boolean(tokenId));

    return assignments;
  }, {});
}

function toggleAssignment(assignments: AssignmentMap, roomId: string, tokenId: string): AssignmentMap {
  const isAlreadyAssignedToRoom = assignments[roomId]?.includes(tokenId) ?? false;

  return Object.fromEntries(
    Object.entries(assignments).map(([currentRoomId, tokenIds]) => {
      const withoutToken = tokenIds.filter((currentTokenId) => currentTokenId !== tokenId);

      if (currentRoomId === roomId && !isAlreadyAssignedToRoom) {
        return [currentRoomId, [...withoutToken, tokenId]];
      }

      return [currentRoomId, withoutToken];
    })
  );
}

function idsToAges(tokenIds: string[], tokens: MinorToken[]): number[] {
  return tokenIds
    .map((tokenId) => tokens.find((token) => token.id === tokenId)?.age)
    .filter((age): age is number => typeof age === "number");
}
