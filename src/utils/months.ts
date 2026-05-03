export const MONTHS_SHORT = [
  "jan", "feb", "mars", "april", "maj", "juni",
  "juli", "aug", "sept", "okt", "nov", "dec",
];

export const WEEKDAYS_LONG = [
  "söndag", "måndag", "tisdag", "onsdag", "torsdag", "fredag", "lördag",
];

export const WEEKDAYS_SHORT = [
  "sön", "mån", "tis", "ons", "tor", "fre", "lör",
];

export function monthShort(date: Date): string {
  return MONTHS_SHORT[date.getMonth()];
}

export function weekdayLong(date: Date): string {
  return WEEKDAYS_LONG[date.getDay()];
}

export function weekdayShort(date: Date): string {
  return WEEKDAYS_SHORT[date.getDay()];
}

export function formatDayMonth(date: Date): string {
  return `${date.getDate()} ${monthShort(date)}`;
}
