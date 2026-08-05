/**
 * Minby — greetings
 *
 * The line at the top of Hem. It should feel like a friend asking, never like
 * an app talking. Warm, curious, a little quiet. Never urgent, never salesy.
 *
 * Each greeting may use `{name}` — the user's first name. Variants without a
 * name are used when we don't know it yet.
 */

type PartOfDay = "night" | "morning" | "midday" | "afternoon" | "evening";

export const partOfDay = (date = new Date()): PartOfDay => {
  const h = date.getHours();
  if (h < 5) return "night";
  if (h < 10) return "morning";
  if (h < 14) return "midday";
  if (h < 17) return "afternoon";
  return "evening";
};

const GREETINGS: Record<PartOfDay, string[]> = {
  night: [
    "Fortfarande vaken, {name}?",
    "Tyst timme. Vem tänker du på?",
    "Sent, men ingen brådska.",
    "Godnatt {name} – något att lämna åt morgondagen?",
  ],
  morning: [
    "God morgon {name}. Vem vill du höra av dig till?",
    "Ny dag. Vem saknar du lite?",
    "Morgon, {name}. Något litet att dela?",
    "Vad vill du att den här dagen ska innehålla?",
    "God morgon. Vem hade blivit glad av ett livstecken?",
  ],
  midday: [
    "Hej {name}. Hur ser dagen ut?",
    "Mitt i dagen – vem vill du ses med?",
    "Något på gång i dina kretsar?",
    "Hej {name}. Vem vill du hänga med snart?",
  ],
  afternoon: [
    "Eftermiddag, {name}. Vem vill du träffa i veckan?",
    "Vad sägs om något i helgen?",
    "Hej {name}. Vem vill du bjuda in?",
    "Dags att göra en plan av en tanke?",
  ],
  evening: [
    "Var vill du hänga med i kväll?",
    "God kväll {name}. Vem vill du ses med?",
    "Kvällen är din – vem vill du dela den med?",
    "Hej {name}. Något du vill berätta för din krets?",
    "Vem vill du höra av dig till innan dagen är slut?",
  ],
};

/** Stable per hour, so the greeting doesn't shuffle on every re-render. */
const pick = (list: string[], date: Date) => {
  const seed = date.getFullYear() * 1000 + dayOfYear(date) * 24 + date.getHours();
  return list[seed % list.length];
};

const dayOfYear = (d: Date) =>
  Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000);

/**
 * The greeting shown on Hem. Falls back gracefully when we have no name.
 */
export const getGreeting = (firstName?: string | null, date = new Date()): string => {
  const list = GREETINGS[partOfDay(date)];
  const withName = firstName?.trim().split(" ")[0];
  const candidates = withName ? list : list.filter((g) => !g.includes("{name}"));
  const chosen = pick(candidates.length ? candidates : list, date);
  return chosen.replace("{name}", withName ?? "").replace(/\s+([?.!,])/g, "$1").replace(/\s{2,}/g, " ").trim();
};
