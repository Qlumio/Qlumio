"use client";

import { useState, useEffect, useRef } from "react";
import type { FamilyMember } from "@/lib/types";
import { EVENT_CATEGORIES } from "@/lib/types";

const DAY_NAMES = ["Søndag", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag"];

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
  date: string; // YYYY-MM-DD
  members: FamilyMember[];
  preSelectedMemberId: string;
  onSave: (data: SaveData) => void;
  onClose: () => void;
};

export default function EventModal({
  date,
  members,
  preSelectedMemberId,
  onSave,
  onClose,
}: Props) {
  const [title, setTitle] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([preSelectedMemberId]);
  const [responsibleId, setResponsibleId] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const childMembers = members.filter((m) => m.role === "child");
  const parentMembers = members.filter((m) => m.role !== "child");

  const hasChildParticipant = selectedIds.some((id) =>
    childMembers.some((c) => c.id === id)
  );

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (hasChildParticipant && !responsibleId && parentMembers.length > 0) {
      setResponsibleId(parentMembers[0].id);
    }
    if (!hasChildParticipant) {
      setResponsibleId("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasChildParticipant]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const toggleMember = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    if (!title.trim() || selectedIds.length === 0) return;
    if (hasChildParticipant && !responsibleId) return;
    onSave({
      title: title.trim(),
      end_date: endDate || null,
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
  const showEndDate = endDate || (startTime && endTime && endTime <= startTime);

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Ny aktivitet</h2>
          <span className="text-gray-500 text-sm">{dateDisplay}</span>
        </div>

        <input
          ref={titleRef}
          type="text"
          placeholder="Hva skal skje?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          className="w-full p-2.5 rounded-lg bg-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 mb-3 text-sm text-gray-900"
        />

        <div className="flex gap-3 mb-3">
          <div className="flex-1">
            <label className="text-xs text-gray-400 mb-1 block">Fra (tid)</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full p-2 rounded-lg bg-gray-100 outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-400 mb-1 block">Til (tid)</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full p-2 rounded-lg bg-gray-100 outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="text-xs text-gray-400 mb-1 block">
            Sluttdato{" "}
            <span className="text-gray-300">(valgfritt – ved overnatting eller flerdagsaktivitet)</span>
          </label>
          <input
            type="date"
            value={endDate}
            min={date}
            onChange={(e) => setEndDate(e.target.value)}
            className={`w-full p-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-colors text-gray-900 ${
              showEndDate ? "bg-blue-50 ring-1 ring-blue-300" : "bg-gray-100"
            }`}
          />
          {showEndDate && endDate && (
            <p className="text-xs text-blue-500 mt-1">
              ✓ Vises i kalenderen fra {dateDisplay} til sluttdato
            </p>
          )}
        </div>

        <label className="flex items-center gap-2.5 mb-4 cursor-pointer group">
          <input
            type="checkbox"
            checked={recurring}
            onChange={(e) => setRecurring(e.target.checked)}
            className="w-4 h-4 accent-blue-500"
          />
          <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
            Gjentas ukentlig
          </span>
          {recurring && (
            <span className="text-xs text-blue-500 ml-1">
              (hver {DAY_NAMES[dateObj.getDay()].toLowerCase()})
            </span>
          )}
        </label>

        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Kategori <span className="normal-case text-gray-300">(vises i årshjul)</span></p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategory("")}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${!category ? "bg-gray-200 text-gray-700 font-medium" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
            >
              Ingen
            </button>
            {EVENT_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1 ${category === cat.value ? "bg-blue-100 text-blue-700 font-medium ring-1 ring-blue-300" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Deltakere</p>
          <div className="space-y-2">
            {members.map((member) => (
              <label key={member.id} className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(member.id)}
                  onChange={() => toggleMember(member.id)}
                  className="w-4 h-4 accent-blue-500"
                />
                <div className={`w-2.5 h-2.5 rounded-full ${member.color}`} />
                <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                  {member.name}
                  {member.role === "child" && (
                    <span className="ml-1.5 text-xs text-gray-400">barn</span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </div>

        {hasChildParticipant && (
          <div className="mb-4 bg-amber-50 rounded-lg p-3 border border-amber-100">
            <p className="text-xs text-amber-700 font-medium mb-2 flex items-center gap-1.5">
              <span>👨‍👩‍👧</span> Ansvarlig foresatt
            </p>
            {parentMembers.length === 0 ? (
              <p className="text-xs text-gray-400">Ingen foresatte registrert</p>
            ) : (
              <div className="space-y-1.5">
                {parentMembers.map((parent) => (
                  <label key={parent.id} className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="radio"
                      name="responsible"
                      value={parent.id}
                      checked={responsibleId === parent.id}
                      onChange={() => setResponsibleId(parent.id)}
                      className="w-4 h-4 accent-amber-500"
                    />
                    <div className={`w-2.5 h-2.5 rounded-full ${parent.color}`} />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                      {parent.name}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-sm text-gray-700"
          >
            Avbryt
          </button>
          <button
            onClick={handleSave}
            disabled={
              !title.trim() ||
              selectedIds.length === 0 ||
              (hasChildParticipant && !responsibleId)
            }
            className="flex-1 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-40 transition-colors text-sm font-medium text-white"
          >
            Lagre
          </button>
        </div>
      </div>
    </div>
  );
}
