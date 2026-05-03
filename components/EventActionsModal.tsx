"use client";

import type { Event } from "@/lib/types";

const DAY_NAMES = ["Søndag", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag"];

type Props = {
  event: Event;
  date: string; // YYYY-MM-DD – datoen som ble klikket (relevant for gjentagende)
  onDeleteSingle: () => void;   // slett bare denne datoen (unntak)
  onDeleteAll: () => void;      // slett hele eventet
  onClose: () => void;
};

export default function EventActionsModal({
  event,
  date,
  onDeleteSingle,
  onDeleteAll,
  onClose,
}: Props) {
  const dateObj = new Date(date + "T00:00:00");
  const dateDisplay = `${DAY_NAMES[dateObj.getDay()]} ${dateObj.getDate()}.${dateObj.getMonth() + 1}`;

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
          <p className="text-xs text-gray-400 mb-1">{dateDisplay}</p>
          <h2 className="text-lg font-semibold">{event.title}</h2>
          {(event.start_time || event.end_time) && (
            <p className="text-sm text-gray-500 mt-0.5">
              {event.start_time}{event.end_time && ` – ${event.end_time}`}
            </p>
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
                className="w-full py-2.5 px-4 rounded-lg bg-gray-100 hover:bg-red-900/40 hover:text-red-300 transition-colors text-sm text-left"
              >
                🗑 Slett bare denne uken
              </button>
              <button
                onClick={onDeleteAll}
                className="w-full py-2.5 px-4 rounded-lg bg-gray-100 hover:bg-red-900/40 hover:text-red-300 transition-colors text-sm text-left"
              >
                🗑 Slett alle forekomster
              </button>
            </>
          ) : (
            <button
              onClick={onDeleteAll}
              className="w-full py-2.5 px-4 rounded-lg bg-gray-100 hover:bg-red-900/40 hover:text-red-300 transition-colors text-sm text-left"
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
