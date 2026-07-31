export type CityEntry = {
  city: string;
  country: string;
  iata: string;
};

// A curated list of major cities/airports for client-side autocomplete.
// Not exhaustive by design — it's meant to make typing an origin/destination
// fast and error-free, not to be a full geo database.
export const CITY_DATABASE: CityEntry[] = [
  // Poland
  { city: "Warsaw", country: "Poland", iata: "WAW" },
  { city: "Kraków", country: "Poland", iata: "KRK" },
  { city: "Gdańsk", country: "Poland", iata: "GDN" },
  { city: "Wrocław", country: "Poland", iata: "WRO" },
  { city: "Poznań", country: "Poland", iata: "POZ" },
  { city: "Szczecin", country: "Poland", iata: "SZZ" },
  { city: "Katowice", country: "Poland", iata: "KTW" },
  { city: "Łódź", country: "Poland", iata: "LCJ" },
  { city: "Rzeszów", country: "Poland", iata: "RZE" },
  { city: "Bydgoszcz", country: "Poland", iata: "BZG" },

  // Germany
  { city: "Berlin", country: "Germany", iata: "BER" },
  { city: "Frankfurt", country: "Germany", iata: "FRA" },
  { city: "Munich", country: "Germany", iata: "MUC" },
  { city: "Hamburg", country: "Germany", iata: "HAM" },
  { city: "Düsseldorf", country: "Germany", iata: "DUS" },
  { city: "Cologne", country: "Germany", iata: "CGN" },
  { city: "Stuttgart", country: "Germany", iata: "STR" },
  { city: "Nuremberg", country: "Germany", iata: "NUE" },
  { city: "Hannover", country: "Germany", iata: "HAJ" },
  { city: "Leipzig", country: "Germany", iata: "LEJ" },
  { city: "Dresden", country: "Germany", iata: "DRS" },

  // Spain
  { city: "Madrid", country: "Spain", iata: "MAD" },
  { city: "Barcelona", country: "Spain", iata: "BCN" },
  { city: "Valencia", country: "Spain", iata: "VLC" },
  { city: "Seville", country: "Spain", iata: "SVQ" },
  { city: "Málaga", country: "Spain", iata: "AGP" },
  { city: "Bilbao", country: "Spain", iata: "BIO" },
  { city: "Palma de Mallorca", country: "Spain", iata: "PMI" },
  { city: "Alicante", country: "Spain", iata: "ALC" },

  // France
  { city: "Paris", country: "France", iata: "CDG" },
  { city: "Nice", country: "France", iata: "NCE" },
  { city: "Lyon", country: "France", iata: "LYS" },
  { city: "Marseille", country: "France", iata: "MRS" },
  { city: "Toulouse", country: "France", iata: "TLS" },
  { city: "Bordeaux", country: "France", iata: "BOD" },
  { city: "Nantes", country: "France", iata: "NTE" },

  // Italy
  { city: "Rome", country: "Italy", iata: "FCO" },
  { city: "Milan", country: "Italy", iata: "MXP" },
  { city: "Venice", country: "Italy", iata: "VCE" },
  { city: "Naples", country: "Italy", iata: "NAP" },
  { city: "Florence", country: "Italy", iata: "FLR" },
  { city: "Bologna", country: "Italy", iata: "BLQ" },
  { city: "Turin", country: "Italy", iata: "TRN" },
  { city: "Catania", country: "Italy", iata: "CTA" },

  // United Kingdom
  { city: "London", country: "United Kingdom", iata: "LHR" },
  { city: "Manchester", country: "United Kingdom", iata: "MAN" },
  { city: "Edinburgh", country: "United Kingdom", iata: "EDI" },
  { city: "Birmingham", country: "United Kingdom", iata: "BHX" },
  { city: "Glasgow", country: "United Kingdom", iata: "GLA" },
  { city: "Bristol", country: "United Kingdom", iata: "BRS" },
  { city: "Liverpool", country: "United Kingdom", iata: "LPL" },

  // Portugal
  { city: "Lisbon", country: "Portugal", iata: "LIS" },
  { city: "Porto", country: "Portugal", iata: "OPO" },
  { city: "Faro", country: "Portugal", iata: "FAO" },

  // Netherlands / Belgium
  { city: "Amsterdam", country: "Netherlands", iata: "AMS" },
  { city: "Rotterdam", country: "Netherlands", iata: "RTM" },
  { city: "Eindhoven", country: "Netherlands", iata: "EIN" },
  { city: "Brussels", country: "Belgium", iata: "BRU" },
  { city: "Antwerp", country: "Belgium", iata: "ANR" },

  // Austria / Switzerland
  { city: "Vienna", country: "Austria", iata: "VIE" },
  { city: "Salzburg", country: "Austria", iata: "SZG" },
  { city: "Innsbruck", country: "Austria", iata: "INN" },
  { city: "Zurich", country: "Switzerland", iata: "ZRH" },
  { city: "Geneva", country: "Switzerland", iata: "GVA" },
  { city: "Basel", country: "Switzerland", iata: "BSL" },

  // Central & Eastern Europe
  { city: "Prague", country: "Czech Republic", iata: "PRG" },
  { city: "Brno", country: "Czech Republic", iata: "BRQ" },
  { city: "Budapest", country: "Hungary", iata: "BUD" },
  { city: "Bratislava", country: "Slovakia", iata: "BTS" },
  { city: "Ljubljana", country: "Slovenia", iata: "LJU" },
  { city: "Bucharest", country: "Romania", iata: "OTP" },
  { city: "Cluj-Napoca", country: "Romania", iata: "CLJ" },
  { city: "Sofia", country: "Bulgaria", iata: "SOF" },
  { city: "Varna", country: "Bulgaria", iata: "VAR" },
  { city: "Zagreb", country: "Croatia", iata: "ZAG" },
  { city: "Split", country: "Croatia", iata: "SPU" },
  { city: "Dubrovnik", country: "Croatia", iata: "DBV" },
  { city: "Kyiv", country: "Ukraine", iata: "KBP" },

  // Nordics & Baltics
  { city: "Copenhagen", country: "Denmark", iata: "CPH" },
  { city: "Stockholm", country: "Sweden", iata: "ARN" },
  { city: "Gothenburg", country: "Sweden", iata: "GOT" },
  { city: "Oslo", country: "Norway", iata: "OSL" },
  { city: "Bergen", country: "Norway", iata: "BGO" },
  { city: "Helsinki", country: "Finland", iata: "HEL" },
  { city: "Reykjavik", country: "Iceland", iata: "KEF" },
  { city: "Riga", country: "Latvia", iata: "RIX" },
  { city: "Vilnius", country: "Lithuania", iata: "VNO" },
  { city: "Tallinn", country: "Estonia", iata: "TLL" },

  // Ireland
  { city: "Dublin", country: "Ireland", iata: "DUB" },
  { city: "Cork", country: "Ireland", iata: "ORK" },

  // Greece, Malta, Cyprus, Turkey
  { city: "Athens", country: "Greece", iata: "ATH" },
  { city: "Thessaloniki", country: "Greece", iata: "SKG" },
  { city: "Santorini", country: "Greece", iata: "JTR" },
  { city: "Mykonos", country: "Greece", iata: "JMK" },
  { city: "Malta", country: "Malta", iata: "MLA" },
  { city: "Larnaca", country: "Cyprus", iata: "LCA" },
  { city: "Istanbul", country: "Turkey", iata: "IST" },
  { city: "Antalya", country: "Turkey", iata: "AYT" },

  // North Africa
  { city: "Marrakech", country: "Morocco", iata: "RAK" },
  { city: "Casablanca", country: "Morocco", iata: "CMN" },
  { city: "Cairo", country: "Egypt", iata: "CAI" },
  { city: "Hurghada", country: "Egypt", iata: "HRG" },

  // Middle East
  { city: "Dubai", country: "United Arab Emirates", iata: "DXB" },
  { city: "Abu Dhabi", country: "United Arab Emirates", iata: "AUH" },
  { city: "Doha", country: "Qatar", iata: "DOH" },
  { city: "Tel Aviv", country: "Israel", iata: "TLV" },

  // North America
  { city: "New York", country: "United States", iata: "JFK" },
  { city: "Los Angeles", country: "United States", iata: "LAX" },
  { city: "Chicago", country: "United States", iata: "ORD" },
  { city: "Miami", country: "United States", iata: "MIA" },
  { city: "San Francisco", country: "United States", iata: "SFO" },
  { city: "Boston", country: "United States", iata: "BOS" },
  { city: "Washington, D.C.", country: "United States", iata: "IAD" },
  { city: "Toronto", country: "Canada", iata: "YYZ" },
  { city: "Montreal", country: "Canada", iata: "YUL" },
  { city: "Vancouver", country: "Canada", iata: "YVR" },

  // Asia-Pacific
  { city: "Tokyo", country: "Japan", iata: "NRT" },
  { city: "Bangkok", country: "Thailand", iata: "BKK" },
  { city: "Singapore", country: "Singapore", iata: "SIN" },
  { city: "Hong Kong", country: "Hong Kong", iata: "HKG" },
  { city: "Seoul", country: "South Korea", iata: "ICN" },
  { city: "Sydney", country: "Australia", iata: "SYD" },
  { city: "Melbourne", country: "Australia", iata: "MEL" }
];

export function searchCities(query: string, limit = 8): CityEntry[] {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length === 0) return [];

  const starts: CityEntry[] = [];
  const contains: CityEntry[] = [];

  for (const entry of CITY_DATABASE) {
    const haystack = `${entry.city} ${entry.country} ${entry.iata}`.toLowerCase();
    const cityLower = entry.city.toLowerCase();

    if (cityLower.startsWith(trimmed) || entry.iata.toLowerCase() === trimmed) {
      starts.push(entry);
    } else if (haystack.includes(trimmed)) {
      contains.push(entry);
    }

    if (starts.length >= limit) break;
  }

  return [...starts, ...contains].slice(0, limit);
}
