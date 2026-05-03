"use client";

import type { Event, FamilyMember } from "@/lib/types";

const DAY_NAMES = ["Søndag", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag"];

function formatDisplayDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}`;
}

function formatTime(t: string | null): string | null {
  if (!t) return null;
  return t.slice(0, 5);
}

type Props = {
  event: Event;
  date: string; // YYYY-MM-DD – datoen som ble klikket (relevant for gjentagende)
  members: FamilyMember[];
  onDeleteSingle: () => void;   // slett bare denne datoen (unntak)
  onDeleteAll: () => void;      // slett hele eventet
  onClose: () => void;
};

export default function EventActionsModal({
  event,
  date,
  members,
  onDeleteSingle,
  onDeleteAll,
  onClose,
}: Props) {
  const st = formatTime(event.start_time);
  const et = formatTime(event.end_time);
  const isMultiDay = event.end_date && event.end_date !== event.date;
  const responsible = event.responsible_member_id
    ? members.find((m) => m.id === event.responsible_member_id)
    : null;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-1">{formatDisplayDate(date)}</p>
          <h2 className="text-lg font-semibold">{event.title}</h2>
          {(st || et) && (
            <p className="text-sm text-gray-500 mt-0.5">
              {st}{et && ` – ${et}`}
            </p>
          )}
          {isMultiDay && (
            <p className="text-sm text-gray-500 mt-0.5">
              ⟷ {formatDisplayDate(event.date)} → {formatDisplayDate(event.end_date!)}
            </p>
          )}
          {responsible && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${responsible.color}`} />
              <p className="text-xs text-amber-700">👨‍👩‍👧 Ansvarlig: {responsible.name}</p>
            </div>
          )}
          {event.recurring && (
            <p className="text-xs text-blue-500 mt-1">↻ Gjentagende ukentlig</p>
          )}
        </div>

        {/* Slettevalg */}
        <div className="space-y-2 mb-4">
          {event.recurring ? (
            <>
              <button
                onClick={onDeleteSingle}
                className="w-full py-2.5 px-4 rounded-lg bg-gray-100 hover:bg-red-50 hover:text-red-600 transition-colors text-sm text-left"
              >
                🗑 Slett bare denne uken
              </button>
              <button
                onClick={onDeleteAll}
                className="w-full py-2.5 px-4 rounded-lg bg-gray-100 hover:bg-red-50 hover:text-red-600 transition-colors text-sm text-left"
              >
                🗑 Slett alle forekomster
              </button>
            </>
          ) : (
            <button
              onClick={onDeleteAll}
              className="w-full py-2.5 px-4 rounded-lg bg-gray-100 hover:bg-red-50 hover:text-red-600 transition-colors text-sm text-left"
            >
              🗑 Slett aktivitet
            </button>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-sm"
        >
          Avbryt
        </button>
      </div>
    </div>
  );
}
