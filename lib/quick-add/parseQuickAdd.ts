// ─── Types ────────────────────────────────────────────────────────────────────

export type QuickAddType = "activity" | "grocery" | "planned_purchase" | "task" | "unknown";

export type QuickAddMember = {
  id: string;
  name: string;
};

export type QuickAddResult = {
  type: QuickAddType;
  title: string;
  personId?: string;
  personName?: string;
  date?: string;         // YYYY-MM-DD (eksplisitt dato)
  time?: string;         // HH:MM
  month?: string;        // YYYY-MM-DD (første dag i måneden)
  monthLabel?: string;   // "Juni 2026"
  dueDate?: string;      // YYYY-MM-DD (for oppgaver: relativ eller eksplisitt)
  dueDateLabel?: string; // "I morgen", "Lørdag", "15. mai"
  amount?: number;
  confidence: number;
  rawText: string;
};

// ─── Konstanter ───────────────────────────────────────────────────────────────

const GROCERY_TRIGGERS = [
  "kjøp", "handle", "handl", "legg til", "på handlelisten",
  "handletur", "handleliste",
];

const PURCHASE_TRIGGERS = [
  "planlegg", "planlagt", "spar til", "til sommeren", "til vinteren",
  "neste år",
];

const PURCHASE_ITEMS = [
  "sykkel", "jakke", "sofa", "vaskemaskin", "oppvaskmaskin", "telefon",
  "mobil", "tv", "bil", "båt", "pc", "mac", "laptop", "seng", "madrass",
  "møbler", "kjøleskap", "fryser", "komfyr", "ovn", "støvsuger", "camera",
  "kamera", "stol", "bord", "bokhylle", "skap", "moped", "scooter",
  "vinterjakke", "sykkeljakke", "sko", "støvler", "ski", "snowboard",
];

const TASK_TRIGGERS = [
  "husk", "husk å", "må", "fikse", "ordne", "bestill", "bestille",
  "send", "sende", "ring", "ringe", "betal", "betale", "sjekk", "sjekke",
  "lever", "levere", "hent", "hente", "ta kontakt", "følg opp",
  "book", "booke", "rydd", "rydde", "vask", "vaske",
];

const ACTIVITY_KEYWORDS = [
  "tannlege", "lege", "legen", "trening", "kamp", "møte",
  "bursdag", "bursdagsselskap", "time", "konsert", "forestilling",
  "praksis", "intervju", "stevne", "turnering", "seminar",
  "konferanse", "skole", "sfo", "barnehage", "fotball", "håndball",
  "svømming", "dans", "gym", "yoga", "pilates",
];

const MONTHS: { pattern: RegExp; label: string; num: number }[] = [
  { pattern: /\b(jan(?:uar)?)\b/i,    label: "Januar",    num: 1  },
  { pattern: /\b(feb(?:ruar)?)\b/i,   label: "Februar",   num: 2  },
  { pattern: /\b(mar(?:s)?)\b/i,      label: "Mars",      num: 3  },
  { pattern: /\b(apr(?:il)?)\b/i,     label: "April",     num: 4  },
  { pattern: /\b(mai)\b/i,            label: "Mai",       num: 5  },
  { pattern: /\b(jun(?:i)?)\b/i,      label: "Juni",      num: 6  },
  { pattern: /\b(jul(?:i)?)\b/i,      label: "Juli",      num: 7  },
  { pattern: /\b(aug(?:ust)?)\b/i,    label: "August",    num: 8  },
  { pattern: /\b(sep(?:tember)?)\b/i, label: "September", num: 9  },
  { pattern: /\b(okt(?:ober)?)\b/i,   label: "Oktober",   num: 10 },
  { pattern: /\b(nov(?:ember)?)\b/i,  label: "November",  num: 11 },
  { pattern: /\b(des(?:ember)?)\b/i,  label: "Desember",  num: 12 },
];

const WEEKDAYS: { pattern: RegExp; label: string; day: number }[] = [
  { pattern: /\bmandag\b/i,   label: "Mandag",   day: 1 },
  { pattern: /\btirsdag\b/i,  label: "Tirsdag",  day: 2 },
  { pattern: /\bonsdag\b/i,   label: "Onsdag",   day: 3 },
  { pattern: /\btorsdag\b/i,  label: "Torsdag",  day: 4 },
  { pattern: /\bfredag\b/i,   label: "Fredag",   day: 5 },
  { pattern: /\blørdag\b/i,   label: "Lørdag",   day: 6 },
  { pattern: /\bsøndag\b/i,   label: "Søndag",   day: 0 },
];

// ─── Hjelpere ─────────────────────────────────────────────────────────────────

function pad(n: number) { return String(n).padStart(2, "0"); }

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function nextWeekday(targetDay: number): string {
  const now = new Date();
  const current = now.getDay();
  let diff = targetDay - current;
  if (diff <= 0) diff += 7;
  const d = new Date(now);
  d.setDate(now.getDate() + diff);
  return toYMD(d);
}

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toYMD(d);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function contains(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

function removeMatch(text: string, match: string): string {
  return text.replace(match, " ").replace(/\s+/g, " ").trim();
}

// ─── Entitetsekstraktorer ─────────────────────────────────────────────────────

function extractTime(text: string): { time: string | null; remaining: string } {
  // "kl. 12:30", "kl 12", "kl.12.00"
  const kl = text.match(/\bkl\.?\s*(\d{1,2})(?:[:\.](\d{2}))?\b/i);
  if (kl) {
    const t = `${pad(+kl[1])}:${pad(+(kl[2] ?? "0"))}`;
    return { time: t, remaining: removeMatch(text, kl[0]) };
  }
  // "12:30" (kolon – unngå kollisjon med dato)
  const colon = text.match(/\b(\d{1,2}):(\d{2})\b/);
  if (colon) {
    const t = `${pad(+colon[1])}:${pad(+colon[2])}`;
    return { time: t, remaining: removeMatch(text, colon[0]) };
  }
  return { time: null, remaining: text };
}

function extractAmount(text: string): { amount: number | null; remaining: string } {
  // "3500 kr", "3 500 kr", "3500,-", "3500 kroner"
  const withKr = text.match(/\b(\d[\d\s]{2,})\s*(?:kr(?:oner)?|,-)\b/i);
  if (withKr) {
    const n = parseInt(withKr[1].replace(/\s/g, ""), 10);
    return { amount: n, remaining: removeMatch(text, withKr[0]) };
  }
  // Frittstående tall ≥ 500 (sannsynlig pris)
  const standalone = text.match(/\b(\d{4,6})\b/);
  if (standalone) {
    const n = parseInt(standalone[1], 10);
    if (n >= 500) return { amount: n, remaining: removeMatch(text, standalone[0]) };
  }
  return { amount: null, remaining: text };
}

function extractExplicitDate(text: string): { date: string | null; dateLabel: string | null; remaining: string } {
  const m = text.match(/\b(\d{1,2})[./\-](\d{1,2})\b/);
  if (!m) return { date: null, dateLabel: null, remaining: text };
  const day = +m[1], month = +m[2];
  if (day < 1 || day > 31 || month < 1 || month > 12)
    return { date: null, dateLabel: null, remaining: text };

  const now = new Date();
  let year = now.getFullYear();
  const candidate = new Date(year, month - 1, day);
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  if (candidate < yesterday) year += 1;

  const date = `${year}-${pad(month)}-${pad(day)}`;
  const label = new Date(date + "T00:00:00").toLocaleDateString("nb-NO", {
    day: "numeric", month: "long",
  });
  return { date, dateLabel: label, remaining: removeMatch(text, m[0]) };
}

function extractMonth(text: string): {
  month: string | null; monthLabel: string | null; remaining: string
} {
  for (const { pattern, label, num } of MONTHS) {
    const m = text.match(pattern);
    if (!m) continue;
    const now = new Date();
    let year = now.getFullYear();
    if (num < now.getMonth() + 1) year += 1; // Bruk neste år om måneden er passert
    const month = `${year}-${pad(num)}-01`;
    return {
      month,
      monthLabel: `${label} ${year}`,
      remaining: removeMatch(text, m[0]),
    };
  }
  return { month: null, monthLabel: null, remaining: text };
}

function extractRelativeDate(text: string): {
  dueDate: string | null; dueDateLabel: string | null; remaining: string
} {
  // "i morgen"
  if (/\bi\s+morgen\b/i.test(text)) {
    return {
      dueDate: tomorrow(),
      dueDateLabel: "I morgen",
      remaining: text.replace(/\bi\s+morgen\b/i, " ").replace(/\s+/g, " ").trim(),
    };
  }
  // "innen DD.MM" – brukes som due_date
  const innen = text.match(/\binnen\s+(\d{1,2})[./](\d{1,2})\b/i);
  if (innen) {
    const day = +innen[1], month = +innen[2];
    const now = new Date();
    let year = now.getFullYear();
    const candidate = new Date(year, month - 1, day);
    if (candidate < now) year += 1;
    const dueDate = `${year}-${pad(month)}-${pad(day)}`;
    const dueDateLabel = new Date(dueDate + "T00:00:00").toLocaleDateString("nb-NO", {
      day: "numeric", month: "long",
    });
    return { dueDate, dueDateLabel, remaining: removeMatch(text, innen[0]) };
  }
  // Ukedag
  for (const { pattern, label, day } of WEEKDAYS) {
    if (pattern.test(text)) {
      return {
        dueDate: nextWeekday(day),
        dueDateLabel: label,
        remaining: text.replace(pattern, " ").replace(/\s+/g, " ").trim(),
      };
    }
  }
  return { dueDate: null, dueDateLabel: null, remaining: text };
}

function extractPerson(
  text: string,
  members: QuickAddMember[]
): { personId: string | null; personName: string | null; remaining: string } {
  const tokens = text.split(/\s+/);
  for (const token of tokens) {
    const lower = token.toLowerCase().replace(/[^a-zæøå]/gi, "");
    const match = members.find(
      (m) =>
        m.name.toLowerCase() === lower ||
        m.name.toLowerCase().startsWith(lower) && lower.length >= 3
    );
    if (match) {
      return {
        personId: match.id,
        personName: match.name,
        remaining: text.replace(new RegExp(`\\b${token}\\b`, "i"), " ").replace(/\s+/g, " ").trim(),
      };
    }
  }
  return { personId: null, personName: null, remaining: text };
}

// ─── Typeklassifisering ───────────────────────────────────────────────────────

function classify(
  text: string,
  signals: {
    hasExplicitDate: boolean;
    hasTime: boolean;
    hasMonth: boolean;
    hasAmount: boolean;
    hasRelativeDate: boolean;
  }
): QuickAddType {
  const lower = text.toLowerCase();

  const isActivity =
    contains(lower, ACTIVITY_KEYWORDS) ||
    (signals.hasExplicitDate && signals.hasTime);

  const isPlannedPurchase =
    contains(lower, PURCHASE_TRIGGERS) ||
    contains(lower, PURCHASE_ITEMS) ||
    (signals.hasAmount && (signals.hasMonth || contains(lower, GROCERY_TRIGGERS)));

  const isTask =
    contains(lower, TASK_TRIGGERS) ||
    (signals.hasRelativeDate && !signals.hasExplicitDate && !signals.hasTime);

  const isGrocery =
    contains(lower, GROCERY_TRIGGERS) &&
    !signals.hasMonth &&
    !signals.hasAmount &&
    !contains(lower, PURCHASE_ITEMS);

  // Prioritet: activity > planned_purchase > task > grocery
  if (isActivity) return "activity";
  if (isPlannedPurchase) return "planned_purchase";
  if (isTask) return "task";
  if (isGrocery) return "grocery";
  return "unknown";
}

// ─── Tittelvask ───────────────────────────────────────────────────────────────

function cleanTitle(text: string, type: QuickAddType): string {
  let t = text;

  // Fjern typetrigger fra starten
  const triggerSets: Record<QuickAddType, string[]> = {
    grocery:          ["legg til", "på handlelisten", "handleliste", "handle ", "kjøp "],
    planned_purchase: ["planlegg ", "planlagt "],
    task:             ["husk å ", "husk "],
    activity:         [],
    unknown:          [],
  };

  for (const trigger of triggerSets[type]) {
    const idx = t.toLowerCase().indexOf(trigger.toLowerCase());
    if (idx === 0) { t = t.slice(trigger.length).trim(); break; }
  }

  return capitalize(t.replace(/\s+/g, " ").trim());
}

// ─── Confidence ───────────────────────────────────────────────────────────────

function calcConfidence(type: QuickAddType, result: Partial<QuickAddResult>): number {
  if (type === "unknown") return 0.2;

  let score = 0.3; // basescore for at noe ble klassifisert
  if (result.title && result.title.length > 2) score += 0.3;
  if (type === "grocery") score += 0.3; // enkelt case, høy sikkerhet
  if (type === "activity" && result.date) score += 0.2;
  if (type === "activity" && result.time) score += 0.1;
  if (type === "planned_purchase" && result.amount) score += 0.2;
  if (type === "planned_purchase" && result.month) score += 0.1;
  if (type === "task" && (result.dueDate || result.personId)) score += 0.15;
  if (result.personId) score += 0.1;
  return Math.min(score, 1);
}

// ─── Hovedfunksjon ────────────────────────────────────────────────────────────

export function parseQuickAdd(
  raw: string,
  members: QuickAddMember[]
): QuickAddResult {
  let text = raw.trim();

  // 1. Ekstraher entiteter (og fjern dem fra arbeidsteksten)
  const { time, remaining: r1 }              = extractTime(text);
  const { amount, remaining: r2 }            = extractAmount(r1);
  const { date, remaining: r3 }              = extractExplicitDate(r2);
  const { month, monthLabel, remaining: r4 } = extractMonth(r3);
  const { dueDate, dueDateLabel, remaining: r5 } = extractRelativeDate(r4);
  const { personId, personName, remaining: r6 } = extractPerson(r5, members);

  // 2. Klassifiser basert på originaltekst + signaler
  const type = classify(raw, {
    hasExplicitDate: !!date,
    hasTime: !!time,
    hasMonth: !!month,
    hasAmount: !!amount,
    hasRelativeDate: !!dueDate,
  });

  // 3. Rens tittel fra gjenværende tekst
  const title = cleanTitle(r6, type);

  const partial: Partial<QuickAddResult> = {
    date: date ?? undefined,
    time: time ?? undefined,
    month: month ?? undefined,
    monthLabel: monthLabel ?? undefined,
    dueDate: dueDate ?? date ?? undefined,       // task bruker eksplisitt dato som frist om ingen relativ dato
    dueDateLabel: dueDateLabel ?? undefined,
    amount: amount ?? undefined,
    personId: personId ?? undefined,
    personName: personName ?? undefined,
  };

  return {
    type,
    title,
    confidence: calcConfidence(type, partial),
    rawText: raw,
    ...partial,
  };
}

// ─── Visningshjelpere ─────────────────────────────────────────────────────────

export function formatDisplayDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("nb-NO", {
    weekday: "short", day: "numeric", month: "long",
  });
}

export function typeLabel(type: QuickAddType): string {
  switch (type) {
    case "activity":         return "Aktivitet";
    case "grocery":          return "Handleliste";
    case "planned_purchase": return "Planlagt kjøp";
    case "task":             return "Oppgave";
    default:                 return "Ukjent";
  }
}

export function typeIcon(type: QuickAddType): string {
  switch (type) {
    case "activity":         return "📅";
    case "grocery":          return "🛒";
    case "planned_purchase": return "🎿";
    case "task":             return "✅";
    default:                 return "❓";
  }
}

export function typeColor(type: QuickAddType): string {
  switch (type) {
    case "activity":         return "blue";
    case "grocery":          return "green";
    case "planned_purchase": return "purple";
    case "task":             return "amber";
    default:                 return "gray";
  }
}
