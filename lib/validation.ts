import type { RoomOccupancy, SearchCriteria } from "@/lib/types";

export function validateSearchCriteria(criteria: SearchCriteria): string[] {
  const errors: string[] = [];
  const departureTime = new Date(criteria.departureDate).getTime();
  const returnTime = new Date(criteria.returnDate).getTime();

  if (!criteria.origin.trim()) {
    errors.push("Enter a departure city.");
  }

  if (!criteria.destination.trim()) {
    errors.push("Enter a destination or choose Anywhere.");
  }

  if (!criteria.departureDate || Number.isNaN(departureTime)) {
    errors.push("Choose a valid departure date.");
  }

  if (!criteria.returnDate || Number.isNaN(returnTime) || returnTime <= departureTime) {
    errors.push("Choose a return date after the departure date.");
  }

  const children = criteria.travelers.travelers.filter((traveler) => traveler.type === "child");
  const infants = criteria.travelers.travelers.filter((traveler) => traveler.type === "infant");

  if (children.length !== criteria.travelers.children) {
    errors.push("The number of child ages must match the number of children.");
  }

  if (infants.length !== criteria.travelers.infants) {
    errors.push("The number of infant ages must match the number of infants.");
  }

  children.forEach((child, index) => {
    if (!Number.isFinite(child.ageAtDeparture) || child.ageAtDeparture < 2 || child.ageAtDeparture > 17) {
      errors.push(`Child ${index + 1} needs an age from 2 to 17 at departure.`);
    }
  });

  infants.forEach((infant, index) => {
    if (!Number.isFinite(infant.ageAtDeparture) || infant.ageAtDeparture < 0 || infant.ageAtDeparture > 1) {
      errors.push(`Infant ${index + 1} needs an age from 0 to 1 at departure.`);
    }
  });

  if ((children.length > 0 || infants.length > 0) && criteria.travelers.adults < 1) {
    errors.push("At least one adult must accompany children and infants in this demo.");
  }

  if (criteria.rooms.length === 0) {
    errors.push("Add at least one room allocation.");
  }

  if (!roomsMatchTravelers(criteria.rooms, criteria)) {
    errors.push("Room allocation must include every adult, child, and infant.");
  }

  const impossibleRoom = criteria.rooms.find((room) => room.adults + room.childAges.length + room.infantAges.length > 5);
  if (impossibleRoom) {
    errors.push(`${impossibleRoom.roomId} has more than five travelers. Split the group across rooms.`);
  }

  if (criteria.budget && criteria.budget.amount <= 0) {
    errors.push("Maximum budget must be greater than zero.");
  }

  if (criteria.selectedTransportModes.length === 0) {
    errors.push("Choose at least one transport type.");
  }

  return errors;
}

function roomsMatchTravelers(rooms: RoomOccupancy[], criteria: SearchCriteria): boolean {
  const roomAdults = rooms.reduce((total, room) => total + room.adults, 0);
  const roomChildren = rooms.reduce((total, room) => total + room.childAges.length, 0);
  const roomInfants = rooms.reduce((total, room) => total + room.infantAges.length, 0);

  return (
    roomAdults === criteria.travelers.adults &&
    roomChildren === criteria.travelers.children &&
    roomInfants === criteria.travelers.infants
  );
}
