// Norske helligdager og skoleferier for Horten/Vestfold

// Røde dager
export const PUBLIC_HOLIDAYS: Record<string, string> = {
  // 2026
  "2026-01-01": "Nyttårsdag",
  "2026-04-02": "Skjærtorsdag",
  "2026-04-03": "Langfredag",
  "2026-04-05": "1. påskedag",
  "2026-04-06": "2. påskedag",
  "2026-05-01": "Arbeidernes dag",
  "2026-05-14": "Kristi himmelfartsdag",
  "2026-05-17": "Grunnlovsdag",
  "2026-05-24": "1. pinsedag",
  "2026-05-25": "2. pinsedag",
  "2026-12-25": "1. juledag",
  "2026-12-26": "2. juledag",
  // 2027
  "2027-01-01": "Nyttårsdag",
  "2027-03-25": "Skjærtorsdag",
  "2027-03-26": "Langfredag",
  "2027-03-28": "1. påskedag",
  "2027-03-29": "2. påskedag",
  "2027-05-01": "Arbeidernes dag",
  "2027-05-06": "Kristi himmelfartsdag",
  "2027-05-16": "1. pinsedag",
  "2027-05-17": "Grunnlovsdag",
  "2027-12-25": "1. juledag",
  "2027-12-26": "2. juledag",
};

// Skoleferier Horten/Vestfold
export const SCHOOL_HOLIDAYS: Array<{ start: string; end: string; name: string }> = [
  // Skoleår 2025/2026
  { start: "2026-02-16", end: "2026-02-20", name: "Vinterferie" },
  { start: "2026-03-30", end: "2026-04-06", name: "Påskeferie" },
  { start: "2026-06-20", end: "2026-08-16", name: "Sommerferie" },
  // Skoleår 2026/2027
  { start: "2026-10-05", end: "2026-10-09", name: "Høstferie" },
  { start: "2026-12-19", end: "2027-01-04", name: "Juleferie" },
  { start: "2027-02-22", end: "2027-02-26", name: "Vinterferie" },
  { start: "2027-03-22", end: "2027-03-29", name: "Påskeferie" },
  { start: "2027-06-19", end: "2027-08-16", name: "Sommerferie" },
];

export function getPublicHolidayName(dateStr: string): string | null {
  return PUBLIC_HOLIDAYS[dateStr] ?? null;
}

export function isPublicHoliday(dateStr: string): boolean {
  return dateStr in PUBLIC_HOLIDAYS;
}

export function getSchoolHolidayName(dateStr: string): string | null {
  const date = new Date(dateStr + "T00:00:00");
  for (const h of SCHOOL_HOLIDAYS) {
    const start = new Date(h.start + "T00:00:00");
    const end = new Date(h.end + "T00:00:00");
    if (date >= start && date <= end) return h.name;
  }
  return null;
}

export function isSchoolHoliday(dateStr: string): boolean {
  return getSchoolHolidayName(dateStr) !== null;
}
