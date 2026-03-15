/**
 * Swedish date recognition utility.
 * Extracts dates from free-text Swedish chat messages.
 */

const MONTHS: Record<string, number> = {
  januari: 0, jan: 0,
  februari: 1, feb: 1,
  mars: 2, mar: 2,
  april: 3, apr: 3,
  maj: 4,
  juni: 5, jun: 5,
  juli: 6, jul: 6,
  augusti: 7, aug: 7,
  september: 8, sep: 8, sept: 8,
  oktober: 9, okt: 9,
  november: 10, nov: 10,
  december: 11, dec: 11,
};

const WEEKDAYS = [
  "måndag", "tisdag", "onsdag", "torsdag", "fredag", "lördag", "söndag",
];

const monthPattern = Object.keys(MONTHS).join("|");

export interface RecognizedDate {
  /** The primary date (start of range or single date) in YYYY-MM-DD */
  startDate: string;
  /** End date if a range was detected */
  endDate?: string;
  /** The matched text fragment */
  matchedText: string;
  /** A label extracted from surrounding context */
  label: string;
}

function resolveYear(month: number): number {
  const now = new Date();
  const thisYear = now.getFullYear();
  // If the month is more than 2 months in the past, assume next year
  const candidate = new Date(thisYear, month, 1);
  if (candidate < new Date(thisYear, now.getMonth() - 2, 1)) {
    return thisYear + 1;
  }
  return thisYear;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function toISO(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

/**
 * Extract a contextual label from the message, stripping the date part.
 */
function extractLabel(text: string, matchedText: string): string {
  let label = text
    .replace(matchedText, "")
    .replace(/^[\s,–\-:!.]+|[\s,–\-:!.]+$/g, "")
    .trim();

  // Remove leading common verbs/prepositions
  label = label
    .replace(/^(vi\s+)?(ska\s+)?(åker|åka|ses|träffas|kör|har|gör)\s*/i, "")
    .replace(/^(hos|på|i|till|vid)\s+/i, (m) => m) // keep prepositions with place names
    .trim();

  // Capitalize first letter
  if (label.length > 0) {
    label = label.charAt(0).toUpperCase() + label.slice(1);
  }

  return label || "Händelse";
}

/**
 * Parse a chat message and return recognized dates if any.
 */
export function recognizeDates(text: string): RecognizedDate[] {
  const results: RecognizedDate[] = [];
  const lower = text.toLowerCase();

  // Pattern 1: Date range "12–15 juni", "12-15 juni"
  const rangeRegex = new RegExp(
    `(\\d{1,2})\\s*[–\\-]\\s*(\\d{1,2})\\s+(${monthPattern})`,
    "gi"
  );
  let match: RegExpExecArray | null;

  while ((match = rangeRegex.exec(lower)) !== null) {
    const startDay = parseInt(match[1]);
    const endDay = parseInt(match[2]);
    const month = MONTHS[match[3].toLowerCase()];
    const year = resolveYear(month);

    results.push({
      startDate: toISO(year, month, startDay),
      endDate: toISO(year, month, endDay),
      matchedText: match[0],
      label: extractLabel(text, match[0]),
    });
  }

  if (results.length > 0) return results;

  // Pattern 2: "27 mars", "torsdag 27 mars", "27:e mars"
  const singleRegex = new RegExp(
    `(?:(?:${WEEKDAYS.join("|")})\\s+)?(\\d{1,2})(?::?e)?\\s+(${monthPattern})`,
    "gi"
  );

  while ((match = singleRegex.exec(lower)) !== null) {
    const day = parseInt(match[1]);
    const monthKey = match[2].toLowerCase();
    const month = MONTHS[monthKey];
    const year = resolveYear(month);

    results.push({
      startDate: toISO(year, month, day),
      matchedText: match[0],
      label: extractLabel(text, match[0]),
    });
  }

  if (results.length > 0) return results;

  // Pattern 3: ISO-like "2026-06-12"
  const isoRegex = /(\d{4})-(\d{2})-(\d{2})/g;
  while ((match = isoRegex.exec(text)) !== null) {
    results.push({
      startDate: match[0],
      matchedText: match[0],
      label: extractLabel(text, match[0]),
    });
  }

  return results;
}
