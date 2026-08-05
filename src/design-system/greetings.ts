/**
 * Minby — greetings
 *
 * The line at the top of Hem. It should feel like a friend asking, never like
 * an app talking. Warm, curious, a little quiet. Never urgent, never salesy.
 *
 * Every greeting must point at at least one of these:
 *  – a person, a relation, seeing each other, or a circle.
 * A greeting never nudges the user to create content, post or "be active".
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
    "Sent. Vem hade du velat prata med nu?",
    "Godnatt {name}. Vem ses du med härnäst?",
    "Vem vill du höra av dig till i morgon?",
  ],
  morning: [
    "God morgon {name}. Vem vill du höra av dig till?",
    "Ny dag. Vem saknar du lite?",
    "Morgon, {name}. Vem vill du ses med snart?",
    "Vem hade blivit glad av ett livstecken i dag?",
    "God morgon. Hur mår dina kretsar?",
  ],
  midday: [
    "Hej {name}. Vem har du inte setts med på länge?",
    "Mitt i dagen – vem vill du ses med?",
    "Vem i dina kretsar tänker du på i dag?",
    "Hej {name}. Vem vill du hänga med snart?",
    "Vem hade du velat äta lunch med?",
  ],
  afternoon: [
    "Eftermiddag, {name}. Vem vill du träffa i veckan?",
    "Vem vill du ses med i helgen?",
    "Hej {name}. Vem vill du bjuda in i din krets?",
    "Vem står på tur att ses?",
    "Vilken krets vill du ses med snart?",
  ],
  evening: [
    "Var vill du hänga med i kväll?",
    "God kväll {name}. Vem vill du ses med?",
    "Kvällen är din – vem vill du dela den med?",
    "Hej {name}. Vem har du inte hörts med på ett tag?",
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
