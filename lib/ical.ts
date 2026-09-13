// Enkel iCal (.ics) parser for VEVENT-blokker
// Håndterer både UTC-tider (Rubic) og lokaliserte tider (fotball.no)

export type ParsedEvent = {
  uid: string;
  title: string;
  location: string | null;
  date: string;       // YYYY-MM-DD (Oslo lokal tid)
  endDate: string;     // YYYY-MM-DD
  startTime: string | null; // HH:MM:SS
  endTime: string | null;   // HH:MM:SS
};

function unfold(ics: string): string {
  // iCal linjefolding: fortsettelseslinjer starter med mellomrom/tab
  return ics.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
}

function unescapeText(s: string): string {
  return s
    .replace(/\\n/g, " ")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

// Konverterer en DTSTART/DTEND-linje til {date, time} i Oslo lokal tid
function parseDateTimeField(line: string): { date: string; time: string | null } {
  // line eksempel: "DTSTART;TZID=Europe/Oslo:20260413T180000" eller "DTSTART:20260914T150000Z"
  const colonIdx = line.indexOf(":");
  const params = line.substring(0, colonIdx);
  const value = line.substring(colonIdx + 1).trim();

  const isUtc = value.endsWith("Z");
  const raw = value.replace("Z", "");

  const year = raw.substring(0, 4);
  const month = raw.substring(4, 6);
  const day = raw.substring(6, 8);
  const hasTime = raw.includes("T");
  const hour = hasTime ? raw.substring(9, 11) : "00";
  const minute = hasTime ? raw.substring(11, 13) : "00";
  const second = hasTime ? raw.substring(13, 15) : "00";

  if (!hasTime) {
    // Heldags-hendelse, ingen klokkeslett
    return { date: `${year}-${month}-${day}`, time: null };
  }

  if (!isUtc) {
    // Allerede lokalisert (TZID=Europe/Oslo) – bruk direkte
    return { date: `${year}-${month}-${day}`, time: `${hour}:${minute}:${second}` };
  }

  // UTC – konverter til Europe/Oslo lokal tid
  const utcDate = new Date(Date.UTC(
    parseInt(year), parseInt(month) - 1, parseInt(day),
    parseInt(hour), parseInt(minute), parseInt(second)
  ));

  const fmt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Oslo",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hourCycle: "h23",
  });

  const parts = fmt.formatToParts(utcDate).reduce((acc, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {} as Record<string, string>);

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}:${parts.second}`,
  };
}

export function parseICS(icsText: string): ParsedEvent[] {
  const unfolded = unfold(icsText);
  const lines = unfolded.split(/\r?\n/);

  const events: ParsedEvent[] = [];
  let current: Record<string, string> | null = null;

  for (const line of lines) {
    if (line.startsWith("BEGIN:VEVENT")) {
      current = {};
      continue;
    }
    if (line.startsWith("END:VEVENT")) {
      if (current && current.UID && current.SUMMARY && current.DTSTART) {
        const start = parseDateTimeField(current.DTSTART);
        const end = current.DTEND ? parseDateTimeField(current.DTEND) : start;
        events.push({
          uid: current.UID,
          title: unescapeText(current.SUMMARY),
          location: current.LOCATION ? unescapeText(current.LOCATION) : null,
          date: start.date,
          endDate: end.date,
          startTime: start.time,
          endTime: end.time,
        });
      }
      current = null;
      continue;
    }
    if (!current) continue;

    if (line.startsWith("UID:")) current.UID = line.substring(4).trim();
    else if (line.startsWith("SUMMARY:")) current.SUMMARY = line.substring(8).trim();
    else if (line.startsWith("LOCATION:")) current.LOCATION = line.substring(9).trim();
    else if (line.startsWith("DTSTART")) current.DTSTART = line.trim();
    else if (line.startsWith("DTEND")) current.DTEND = line.trim();
  }

  return events;
}
