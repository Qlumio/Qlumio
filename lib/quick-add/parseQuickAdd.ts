// ─── Types ────────────────────────────────────────────────────────────────────

export type QuickAddMember = {
  id: string;
  name: string;
};

export type ParsedQuickAdd = {
  type: "activity";
  title: string;
  date: string | null;       // YYYY-MM-DD
  startTime: string | null;  // HH:MM
  memberId: string | null;
  memberName: string | null;
  confidence: number;        // 0–1
};

// ─── Parser ───────────────────────────────────────────────────────────────────

/**
 * Regelbasert parsing av korte naturlige tekstkommandoer.
 * Eksempel: "Thea tannlege 11.05 kl 12:00"
 *
 * Rekkefølge:
 *   1. Finn tid  (kl 12 / kl. 12:00 / 12:00)
 *   2. Finn dato (11.05 / 11/05 / 11-05)
 *   3. Finn navn (matcher mot familiemedlemmer)
 *   4. Resten = tittel
 */
export function parseQuickAdd(
  raw: string,
  members: QuickAddMember[]
): ParsedQuickAdd {
  let text = raw.trim();

  // ── 1. Tid ────────────────────────────────────────────────────────────────
  let startTime: string | null = null;

  // "kl. 12:30", "kl 12", "kl.12", "kl 12.30"
  const klMatch = text.match(
    /\bkl\.?\s*(\d{1,2})(?:[:\.](\d{2}))?\b/i
  );
  if (klMatch) {
    const h = klMatch[1].padStart(2, "0");
    const m = (klMatch[2] ?? "00").padStart(2, "0");
    startTime = `${h}:${m}`;
    text = text.replace(klMatch[0], " ").trim();
  } else {
    // "12:30" (kolon, ikke punktum – unngår kollisjon med dato-format)
    const colonTimeMatch = text.match(/\b(\d{1,2}):(\d{2})\b/);
    if (colonTimeMatch) {
      const h = colonTimeMatch[1].padStart(2, "0");
      const m = colonTimeMatch[2].padStart(2, "0");
      startTime = `${h}:${m}`;
      text = text.replace(colonTimeMatch[0], " ").trim();
    }
  }

  // ── 2. Dato ───────────────────────────────────────────────────────────────
  let date: string | null = null;

  // DD.MM  /  DD/MM  /  DD-MM  (begge deler 1–2 siffer)
  const dateMatch = text.match(/\b(\d{1,2})[.\/\-](\d{1,2})\b/);
  if (dateMatch) {
    const day = parseInt(dateMatch[1], 10);
    const month = parseInt(dateMatch[2], 10);

    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const now = new Date();
      let year = now.getFullYear();

      // Bruk neste år om datoen allerede er passert (mer enn 1 dag siden)
      const candidate = new Date(year, month - 1, day);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (candidate < yesterday) year += 1;

      date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      text = text.replace(dateMatch[0], " ").trim();
    }
  }

  // ── 3. Navn ───────────────────────────────────────────────────────────────
  let memberId: string | null = null;
  let memberName: string | null = null;

  const tokens = text.split(/\s+/).filter(Boolean);

  for (const token of tokens) {
    const normalized = token.toLowerCase();
    const match = members.find(
      (m) =>
        m.name.toLowerCase() === normalized ||
        m.name.toLowerCase().startsWith(normalized) // støtter kortform "The" → "Thea"
    );
    if (match) {
      memberId = match.id;
      memberName = match.name;
      // Fjern tokenet fra teksten
      text = text.replace(new RegExp(`\\b${token}\\b`, "i"), " ").trim();
      break; // første treff er nok
    }
  }

  // ── 4. Tittel = resten ────────────────────────────────────────────────────
  const title = text.replace(/\s+/g, " ").trim();

  // ── 5. Confidence ─────────────────────────────────────────────────────────
  let confidence = 0;
  if (date) confidence += 0.45;
  if (title) confidence += 0.25;
  if (memberId) confidence += 0.20;
  if (startTime) confidence += 0.10;

  return {
    type: "activity",
    title,
    date,
    startTime,
    memberId,
    memberName,
    confidence,
  };
}

// ─── Visningshjelpere ─────────────────────────────────────────────────────────

export function formatParsedDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("nb-NO", {
    weekday: "short",
    day: "numeric",
    month: "long",
  });
}
