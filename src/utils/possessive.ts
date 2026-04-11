/** Swedish possessive form: "Jennie" → "Jennies", "Marcus" → "Marcus" */
export const possessive = (name: string): string => {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  return /[sxzSXZ]$/.test(trimmed) ? trimmed : `${trimmed}s`;
};
