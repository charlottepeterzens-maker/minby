/** Home page shared types. */

export type CircleFilterId = "all" | "hangouts" | "tips" | "posts" | "photos" | "polls";

export interface CircleFilterOption {
  id: CircleFilterId;
  label: string;
}

export const CIRCLE_FILTERS: CircleFilterOption[] = [
  { id: "all", label: "Allt" },
  { id: "hangouts", label: "Träffar" },
  { id: "tips", label: "Tips" },
  { id: "posts", label: "Inlägg" },
  { id: "photos", label: "Foton" },
  { id: "polls", label: "Omröstningar" },
];
