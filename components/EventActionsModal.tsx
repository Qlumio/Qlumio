"use client";

import { useState } from "react";
import type { Event, FamilyMember } from "@/lib/types";
import { EVENT_CATEGORIES } from "@/lib/types";
import { supabase } from "@/lib/supabase";

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
  date: string;
  members: FamilyMember[];
  onDeleteSingle: () => void;
  onDeleteAll: () => void;
  onClose: () => void;
  onUpdated: () => void; // refresh etter redigering
};

export default function EventActionsModal({
  event,
  date,
  members,
  onDeleteSingle,
  onDeleteAll,
  onClose,
  onUpdated,
}: Props) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [saving, setSaving] = useState(false);

  // Edit-state
  const [title, setTitle] = useState(event.title);
  const [startTime, setStartTime] = useState(event.start_time?.slice(0, 5) ?? "");
  const [endTime, setEndTime] = useState(event.end_time?.slice(0, 5) ?? "");
  const [endDate, setEndDate] = useState(event.end_date ?? "");
  const [category, setCategory] = useState(event.category ?? "");
  const [selectedIds, setSelectedIds] = useState<string[]>(event.participant_ids);
  const [responsibleId, setResponsibleId] = useState(event.responsible_member_id ?? "");

  const childMembers = members.filter((m) => m.role === "child");
  const parentMembers = members.filter((m) => m.role !== "child");
  const hasChildParticipant = selectedIds.some((id) => childMembers.some((c) => c.id === id));

  const toggleMember = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSaveEdit = async () => {
    if (!title.trim()) return;
    setSaving(true);

    await supabase.from("events").update({
      title: title.trim(),
      start_time: startTime || null,
      end_time: endTime || null,
      end_date: endDate || null,
      category: category || null,
      responsible_member_id: hasChildParticipant ? responsibleId || null : null,
    }).eq("id", event.id);

    // Oppdater deltakere
    await supabase.from("event_participants").delete().eq("event_id", event.id);
    if (selectedIds.length > 0) {
      await supabase.from("event_participants").insert(
        selectedIds.map((id) => ({ event_id: event.id, family_member_id: id }))
      );
    }

    setSaving(false);
    onUpdated();
    onClose();
  };

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
        className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {mode === "view" ? (
          <>
            {/* Header */}
            <div className="mb-4">
              <p className="text-xs text-gray-400 mb-1">{formatDisplayDate(date)}</p>
              <h2 className="text-lg font-semibold">{event.title}</h2>
              {(st || et) && (
                <p className="text-sm text-gray-500 mt-0.5">{st}{et && ` – ${et}`}</p>
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
              {event.category && (
                <p className="text-xs text-gray-400 mt-1">
                  {EVENT_CATEGORIES.find((c) => c.value === event.category)?.icon}{" "}
                  {EVENT_CATEGORIES.find((c) => c.value === event.category)?.label}
                </p>
              )}
            </div>

            {/* Rediger */}
            <button
              onClick={() => setMode("edit")}
              className="w-full py-2.5 px-4 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors text-sm text-left mb-2 font-medium"
            >
              ✏️ Rediger aktivitet
            </button>

            {/* Slettevalg */}
            <div className="space-y-2 mb-4">
              {event.recurring ? (
                <>
                  <button onClick={onDeleteSingle} className="w-full py-2.5 px-4 rounded-lg bg-gray-100 hover:bg-red-50 hover:text-red-600 transition-colors text-sm text-left">
                    🗑 Slett bare denne uken
                  </button>
                  <button onClick={onDeleteAll} className="w-full py-2.5 px-4 rounded-lg bg-gray-100 hover:bg-red-50 hover:text-red-600 transition-colors text-sm text-left">
                    🗑 Slett alle forekomster
                  </button>
                </>
              ) : (
                <button onClick={onDeleteAll} className="w-full py-2.5 px-4 rounded-lg bg-gray-100 hover:bg-red-50 hover:text-red-600 transition-colors text-sm text-left">
                  🗑 Slett aktivitet
                </button>
              )}
            </div>

            <button onClick={onClose} className="w-full py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-sm">
              Avbryt
            </button>
          </>
        ) : (
          <>
            {/* Rediger-modus */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Rediger aktivitet</h2>
              <button onClick={() => setMode("view")} className="text-gray-400 hover:text-gray-600 text-sm">← Tilbake</button>
            </div>

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tittel"
              autoFocus
              className="w-full p-2.5 rounded-lg bg-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 mb-3 text-sm text-gray-900"
            />

            <div className="flex gap-3 mb-3">
              <div className="flex-1">
                <label className="text-xs text-gray-400 mb-1 block">Fra (tid)</label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                  className="w-full p-2 rounded-lg bg-gray-100 outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900" />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-400 mb-1 block">Til (tid)</label>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                  className="w-full p-2 rounded-lg bg-gray-100 outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900" />
              </div>
            </div>

            <div className="mb-3">
              <label className="text-xs text-gray-400 mb-1 block">Sluttdato <span className="text-gray-300">(ved overnatting/flerdager)</span></label>
              <input type="date" value={endDate} min={event.date} onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2 rounded-lg bg-gray-100 outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900" />
            </div>

            {/* Kategori */}
            <div className="mb-3">
              <p className="text-xs text-gray-400 mb-2">Kategori</p>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={() => setCategory("")}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${!category ? "bg-gray-200 text-gray-700 font-medium" : "bg-gray-100 text-gray-500"}`}>
                  Ingen
                </button>
                {EVENT_CATEGORIES.map((cat) => (
                  <button key={cat.value} type="button" onClick={() => setCategory(cat.value)}
                    className={`px-2.5 py-1 rounded-lg text-xs transition-colors flex items-center gap-1 ${category === cat.value ? "bg-blue-100 text-blue-700 font-medium ring-1 ring-blue-300" : "bg-gray-100 text-gray-600"}`}>
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Deltakere */}
            <div className="mb-3">
              <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Deltakere</p>
              <div className="space-y-2">
                {members.map((member) => (
                  <label key={member.id} className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={selectedIds.includes(member.id)} onChange={() => toggleMember(member.id)}
                      className="w-4 h-4 accent-blue-500" />
                    <div className={`w-2.5 h-2.5 rounded-full ${member.color}`} />
                    <span className="text-sm text-gray-700">{member.name}
                      {member.role === "child" && <span className="ml-1.5 text-xs text-gray-400">barn</span>}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Ansvarlig foresatt */}
            {hasChildParticipant && parentMembers.length > 0 && (
              <div className="mb-4 bg-amber-50 rounded-lg p-3 border border-amber-100">
                <p className="text-xs text-amber-700 font-medium mb-2">👨‍👩‍👧 Ansvarlig foresatt</p>
                <div className="space-y-1.5">
                  {parentMembers.map((parent) => (
                    <label key={parent.id} className="flex items-center gap-2.5 cursor-pointer">
                      <input type="radio" name="responsible" value={parent.id}
                        checked={responsibleId === parent.id} onChange={() => setResponsibleId(parent.id)}
                        className="w-4 h-4 accent-amber-500" />
                      <div className={`w-2.5 h-2.5 rounded-full ${parent.color}`} />
                      <span className="text-sm text-gray-700">{parent.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => setMode("view")} className="flex-1 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-sm text-gray-700">
                Avbryt
              </button>
              <button onClick={handleSaveEdit} disabled={saving || !title.trim()}
                className="flex-1 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white transition-colors text-sm font-medium">
                {saving ? "Lagrer..." : "Oppdater"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
