"use client";

import { useState, useEffect } from "react";
import type { FamilyMember } from "@/lib/types";
import { EVENT_CATEGORIES } from "@/lib/types";

const DAY_NAMES = ["Søndag", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag"];
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

type SaveData = {
  title: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  recurring: boolean;
  participant_ids: string[];
  responsible_member_id: string | null;
  category: string | null;
};

type Props = {
  date: string;
  members: FamilyMember[];
  preSelectedMemberId: string;
  onSave: (data: SaveData) => void;
  onClose: () => void;
};

// --- TimePicker ---
function TimePicker({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const [open, setOpen] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualVal, setManualVal] = useState(value);

  const parts = value ? value.split(":") : [];
  const curHour = parts.length === 2 ? parseInt(parts[0]) : null;
  const curMin = parts.length === 2 ? parseInt(parts[1]) : 0;

  const setTime = (h: number, m: number) => {
    onChange(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
  };

  const confirmManual = () => {
    const match = manualVal.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      const h = parseInt(match[1]);
      const m = parseInt(match[2]);
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        const rounded = Math.round(m / 5) * 5 % 60;
        setTime(h, rounded);
        setOpen(false);
        setManualMode(false);
      }
    }
  };

  return (
    <div className="relative flex-1">
      <label className="text-xs text-gray-400 mb-1.5 block">{label}</label>
      <button
        type="button"
        onClick={() => { setOpen(!open); setManualMode(false); setManualVal(value); }}
        className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl text-sm font-medium transition-colors ${
          value ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="font-mono">{value || "– –"}</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-2xl border border-gray-100 p-4 z-30 w-56">
          {!manualMode ? (
            <>
              <p className="text-xs text-gray-400 mb-2 text-center font-medium">{label}</p>
              <div className="flex items-center gap-2 mb-3">
                <select
                  value={curHour ?? ""}
                  onChange={(e) => { const h = parseInt(e.target.value); setTime(h, curMin); }}
                  className="flex-1 p-2 bg-gray-100 rounded-lg text-sm text-center outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                >
                  <option value="">--</option>
                  {HOURS.map((h) => (
                    <option key={h} value={h}>{h.toString().padStart(2, "0")}</option>
                  ))}
                </select>
                <span className="text-xl font-bold text-gray-300">:</span>
                <select
                  value={curMin}
                  onChange={(e) => { const m = parseInt(e.target.value); if (curHour !== null) setTime(curHour, m); }}
                  className="flex-1 p-2 bg-gray-100 rounded-lg text-sm text-center outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                >
                  {MINUTES.map((m) => (
                    <option key={m} value={m}>{m.toString().padStart(2, "0")}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-1.5">
                <button type="button" onClick={() => setManualMode(true)}
                  className="flex-1 text-xs text-gray-400 hover:text-gray-600 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  Skriv inn
                </button>
                {value && (
                  <button type="button" onClick={() => { onChange(""); setOpen(false); }}
                    className="flex-1 text-xs text-red-400 hover:text-red-600 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                    Fjern
                  </button>
                )}
                <button type="button" onClick={() => setOpen(false)}
                  className="flex-1 text-xs bg-blue-500 hover:bg-blue-600 text-white py-1.5 rounded-lg transition-colors">
                  OK
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-gray-400 mb-2 text-center">Skriv tid (HH:MM)</p>
              <input
                type="text"
                placeholder="08:30"
                value={manualVal}
                onChange={(e) => setManualVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") confirmManual(); }}
                autoFocus
                className="w-full p-2.5 bg-gray-100 rounded-lg text-sm text-center outline-none focus:ring-2 focus:ring-blue-500 font-mono mb-3"
              />
              <div className="flex gap-1.5">
                <button type="button" onClick={() => setManualMode(false)}
                  className="flex-1 text-xs text-gray-400 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">← Tilbake</button>
                <button type="button" onClick={confirmManual}
                  className="flex-1 text-xs bg-blue-500 hover:bg-blue-600 text-white py-1.5 rounded-lg transition-colors">OK</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// --- EventModal ---
export default function EventModal({ date, members, preSelectedMemberId, onSave, onClose }: Props) {
  const [category, setCategory] = useState<string>("");
  const [customTitle, setCustomTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [showEndDate, setShowEndDate] = useState(false);
  const [endDate, setEndDate] = useState(date);
  const [recurring, setRecurring] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([preSelectedMemberId]);
  const [responsibleId, setResponsibleId] = useState<string>("");

  const childMembers = members.filter((m) => m.role === "child");
  const parentMembers = members.filter((m) => m.role !== "child");
  const hasChildParticipant = selectedIds.some((id) => childMembers.some((c) => c.id === id));

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (hasChildParticipant && !responsibleId && parentMembers.length > 0) setResponsibleId(parentMembers[0].id);
    if (!hasChildParticipant) setResponsibleId("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasChildParticipant]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const selectedCat = EVENT_CATEGORIES.find((c) => c.value === category);
  const isAnnet = category === "annet" || category === "";
  const derivedTitle = isAnnet ? customTitle : (selectedCat?.label ?? "");
  const canSave = derivedTitle.trim() !== "" && selectedIds.length > 0 && !(hasChildParticipant && !responsibleId);

  const toggleMember = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      title: derivedTitle.trim(),
      end_date: showEndDate && endDate !== date ? endDate : null,
      start_time: startTime ? startTime.slice(0, 5) : null,
      end_time: endTime ? endTime.slice(0, 5) : null,
      recurring,
      participant_ids: selectedIds,
      responsible_member_id: hasChildParticipant ? responsibleId : null,
      category: category || null,
    });
  };

  const dateObj = new Date(date + "T00:00:00");
  const dateDisplay = `${DAY_NAMES[dateObj.getDay()]} ${dateObj.getDate()}.${dateObj.getMonth() + 1}`;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl p-5 w-full max-w-md shadow-xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Ny aktivitet</h2>
          <span className="text-gray-400 text-sm">{dateDisplay}</span>
        </div>

        {/* 1. Kategori – første valg */}
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide font-medium">Hva slags aktivitet?</p>
          <div className="grid grid-cols-4 gap-2">
            {EVENT_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-xs transition-colors ${
                  category === cat.value
                    ? "bg-blue-100 text-blue-700 ring-2 ring-blue-400 font-semibold"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <span className="text-2xl leading-none">{cat.icon}</span>
                <span className="text-center leading-tight">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Tittel – kun for "Annet" eller ingen kategori */}
        {isAnnet && (
          <input
            type="text"
            placeholder={category === "annet" ? "Beskriv aktiviteten..." : "Hva skal skje?"}
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            autoFocus={isAnnet}
            className="w-full p-2.5 rounded-xl bg-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 mb-4 text-sm text-gray-900"
          />
        )}

        {/* 3. Tid */}
        <div className="flex gap-3 mb-3">
          <TimePicker value={startTime} onChange={setStartTime} label="Fra" />
          <TimePicker value={endTime} onChange={setEndTime} label="Til" />
        </div>

        {/* 4. Sluttdato – skjult som default, kun vis om ulik dag */}
        <div className="mb-3">
          {!showEndDate ? (
            <button
              type="button"
              onClick={() => { setShowEndDate(true); setEndDate(date); }}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Legg til sluttdato (overnatting / flerdager)
            </button>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-gray-400">Sluttdato</label>
                <button type="button" onClick={() => { setShowEndDate(false); setEndDate(date); }}
                  className="text-xs text-gray-300 hover:text-red-400 transition-colors">Fjern</button>
              </div>
              <input
                type="date"
                value={endDate}
                min={date}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2 rounded-xl bg-blue-50 ring-1 ring-blue-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
              />
            </div>
          )}
        </div>

        {/* 5. Gjentas */}
        <label className="flex items-center gap-2.5 mb-4 cursor-pointer group">
          <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)}
            className="w-4 h-4 accent-blue-500" />
          <span className="text-sm text-gray-700">Gjentas ukentlig</span>
          {recurring && (
            <span className="text-xs text-blue-500 ml-1">(hver {DAY_NAMES[dateObj.getDay()].toLowerCase()})</span>
          )}
        </label>

        {/* 6. Deltakere */}
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Deltakere</p>
          <div className="space-y-2">
            {members.map((member) => (
              <label key={member.id} className="flex items-center gap-2.5 cursor-pointer group">
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

        {/* 7. Ansvarlig foresatt */}
        {hasChildParticipant && parentMembers.length > 0 && (
          <div className="mb-4 bg-amber-50 rounded-xl p-3 border border-amber-100">
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
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors text-sm text-gray-700">
            Avbryt
          </button>
          <button onClick={handleSave} disabled={!canSave}
            className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-40 transition-colors text-sm font-medium text-white">
            Lagre
          </button>
        </div>
      </div>
    </div>
  );
}
