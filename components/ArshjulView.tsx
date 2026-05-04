"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/userContext";
import type { Event, FamilyMember } from "@/lib/types";
import { ARSHJUL_CATEGORIES } from "@/lib/types";

const MONTH_NAMES = [
  "Januar", "Februar", "Mars", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Desember",
];

const CATEGORY_MAP = Object.fromEntries(
  ARSHJUL_CATEGORIES.map((c) => [c.value, c])
);

type Props = {
  events: Event[];
  members: FamilyMember[];
  year: number;
};

type NewEvent = {
  title: string;
  date: string;
  category: string;
  notes: string;
  participant_ids: string[];
};

export default function ArshjulView({ events: initialEvents, members, year }: Props) {
  const router = useRouter();
  const { currentUser } = useUser();
  const isAdmin = members.find((m) => m.id === currentUser?.id)?.permission_level === "admin";

  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [categoryFilter, setCategoryFilter] = useState<string>("alle");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newEvent, setNewEvent] = useState<NewEvent>({
    title: "",
    date: `${year}-01-01`,
    category: ARSHJUL_CATEGORIES[0].value,
    notes: "",
    participant_ids: [],
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMonth = new Date().getMonth(); // 0-indexed

  const filtered = events.filter(
    (e) => categoryFilter === "alle" || e.category === categoryFilter
  );

  // Grupper per måned
  const byMonth: Event[][] = Array.from({ length: 12 }, (_, i) =>
    filtered.filter((e) => new Date(e.date + "T00:00:00").getMonth() === i)
  );

  const toggleParticipant = (id: string) => {
    setNewEvent((prev) => ({
      ...prev,
      participant_ids: prev.participant_ids.includes(id)
        ? prev.participant_ids.filter((x) => x !== id)
        : [...prev.participant_ids, id],
    }));
  };

  const saveEvent = async () => {
    if (!newEvent.title.trim() || !newEvent.date || !newEvent.category) return;
    setSaving(true);

    const { data: ev, error } = await supabase
      .from("events")
      .insert({
        title: newEvent.title.trim(),
        date: newEvent.date,
        end_date: null,
        start_time: null,
        end_time: null,
        recurring: false,
        category: newEvent.category,
        responsible_member_id: null,
      })
      .select()
      .single();

    if (error || !ev) {
      alert("Feil ved lagring: " + error?.message);
      setSaving(false);
      return;
    }

    if (newEvent.participant_ids.length > 0) {
      await supabase.from("event_participants").insert(
        newEvent.participant_ids.map((id) => ({
          event_id: ev.id,
          family_member_id: id,
        }))
      );
    }

    setEvents((prev) => [
      ...prev,
      {
        id: ev.id,
        title: ev.title,
        date: ev.date,
        end_date: null,
        start_time: null,
        end_time: null,
        recurring: false,
        category: ev.category,
        responsible_member_id: null,
        created_at: ev.created_at,
        participant_ids: newEvent.participant_ids,
      },
    ].sort((a, b) => a.date.localeCompare(b.date)));

    setNewEvent({
      title: "",
      date: `${year}-01-01`,
      category: ARSHJUL_CATEGORIES[0].value,
      notes: "",
      participant_ids: [],
    });
    setShowAdd(false);
    setSaving(false);
    router.refresh();
  };

  const deleteEvent = async (id: string) => {
    if (!confirm("Slett denne hendelsen fra årshjulet?")) return;
    setEvents((prev) => prev.filter((e) => e.id !== id));
    await supabase.from("event_participants").delete().eq("event_id", id);
    await supabase.from("events").delete().eq("id", id);
  };

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-lg mx-auto px-4 pb-16">

        {/* Header */}
        <div className="flex items-center justify-between pt-6 pb-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-700 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Årshjul</h1>
              <p className="text-xs text-gray-400">{year}</p>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Legg til
            </button>
          )}
        </div>

        {/* Kategori-filter */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setCategoryFilter("alle")}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${categoryFilter === "alle" ? "bg-blue-500 text-white font-medium" : "bg-white text-gray-600 hover:bg-gray-100"}`}
          >
            Alle
          </button>
          {ARSHJUL_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategoryFilter(cat.value)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1 ${categoryFilter === cat.value ? "bg-blue-500 text-white font-medium" : "bg-white text-gray-600 hover:bg-gray-100"}`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        {/* 12 måneder */}
        <div className="space-y-2">
          {MONTH_NAMES.map((monthName, idx) => {
            const monthEvents = byMonth[idx];
            const isCurrentMonth = idx === currentMonth;
            const isPast = idx < currentMonth;

            return (
              <div
                key={idx}
                className={`rounded-xl overflow-hidden transition-all ${
                  isCurrentMonth
                    ? "ring-2 ring-blue-400"
                    : ""
                }`}
              >
                {/* Måneds-header */}
                <div
                  className={`flex items-center justify-between px-4 py-3 ${
                    isCurrentMonth
                      ? "bg-blue-500 text-white"
                      : isPast
                      ? "bg-gray-100 text-gray-400"
                      : "bg-white text-gray-700"
                  }`}
                >
                  <span className={`font-semibold text-sm ${isCurrentMonth ? "text-white" : ""}`}>
                    {monthName}
                  </span>
                  {monthEvents.length > 0 && (
                    <span
                      className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                        isCurrentMonth
                          ? "bg-white/20 text-white"
                          : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {monthEvents.length}
                    </span>
                  )}
                </div>

                {/* Hendelser i måneden */}
                {monthEvents.length > 0 && (
                  <div className={`divide-y ${isCurrentMonth ? "divide-blue-50" : "divide-gray-100"} bg-white`}>
                    {monthEvents.map((ev) => {
                      const cat = ev.category ? CATEGORY_MAP[ev.category] : null;
                      const d = new Date(ev.date + "T00:00:00");
                      const isToday = ev.date === todayStr;
                      const isPastEvent = ev.date < todayStr;
                      const participants = members.filter((m) =>
                        ev.participant_ids.includes(m.id)
                      );

                      return (
                        <div
                          key={ev.id}
                          className={`flex items-center gap-3 px-4 py-3 group ${isPastEvent ? "opacity-50" : ""}`}
                        >
                          {/* Dato */}
                          <div className="text-center w-8 flex-shrink-0">
                            <div className={`text-lg font-bold leading-none ${isToday ? "text-blue-500" : "text-gray-700"}`}>
                              {d.getDate()}
                            </div>
                          </div>

                          {/* Kategori-ikon */}
                          {cat && (
                            <span className="text-base flex-shrink-0">{cat.icon}</span>
                          )}

                          {/* Tittel + deltakere */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${isPastEvent ? "line-through" : "text-gray-800"}`}>
                              {ev.title}
                            </p>
                            {participants.length > 0 && (
                              <div className="flex items-center gap-1 mt-0.5">
                                {participants.map((p) => (
                                  <div key={p.id} className="flex items-center gap-0.5">
                                    <div className={`w-2 h-2 rounded-full ${p.color}`} />
                                    <span className="text-xs text-gray-400">{p.name}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Slett */}
                          {isAdmin && (
                            <button
                              onClick={() => deleteEvent(ev.id)}
                              className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all p-1 flex-shrink-0"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legg til modal */}
      {showAdd && (
        <div
          className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4"
          onClick={() => setShowAdd(false)}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Ny årshjul-hendelse</h2>

            <input
              type="text"
              placeholder="Hva er det? (f.eks. EU-kontroll, forsikring)"
              value={newEvent.title}
              onChange={(e) => setNewEvent((p) => ({ ...p, title: e.target.value }))}
              autoFocus
              className="w-full p-2.5 rounded-lg bg-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 mb-3 text-sm text-gray-900"
            />

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Dato</label>
                <input
                  type="date"
                  value={newEvent.date}
                  min={`${year}-01-01`}
                  max={`${year}-12-31`}
                  onChange={(e) => setNewEvent((p) => ({ ...p, date: e.target.value }))}
                  className="w-full p-2 rounded-lg bg-gray-100 outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Kategori</label>
                <select
                  value={newEvent.category}
                  onChange={(e) => setNewEvent((p) => ({ ...p, category: e.target.value }))}
                  className="w-full p-2 rounded-lg bg-gray-100 outline-none text-sm text-gray-900"
                >
                  {ARSHJUL_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs text-gray-400 mb-2 block">Gjelder (valgfritt)</label>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleParticipant(m.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors ${
                      newEvent.participant_ids.includes(m.id)
                        ? "bg-blue-100 text-blue-700 font-medium ring-1 ring-blue-300"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${m.color}`} />
                    {m.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-sm text-gray-700"
              >
                Avbryt
              </button>
              <button
                onClick={saveEvent}
                disabled={saving || !newEvent.title.trim()}
                className="flex-1 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white transition-colors text-sm font-medium"
              >
                {saving ? "Lagrer..." : "Lagre"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
