"use client";

import { useState, useEffect, useRef } from "react";
import type { FamilyMember } from "@/lib/types";

const DAY_NAMES = ["Søndag", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag"];

type SaveData = {
  title: string;
  start_time: string | null;
  end_time: string | null;
  recurring: boolean;
  participant_ids: string[];
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
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([preSelectedMemberId]);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const toggleMember = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    if (!title.trim() || selectedIds.length === 0) return;
    onSave({
      title: title.trim(),
      start_time: startTime || null,
      end_time: endTime || null,
      recurring,
      participant_ids: selectedIds,
    });
  };

  const dateObj = new Date(date + "T00:00:00");
  const dateDisplay = `${DAY_NAMES[dateObj.getDay()]} ${dateObj.getDate()}.${dateObj.getMonth() + 1}`;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 rounded-xl p-6 w-full max-w-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Ny aktivitet</h2>
          <span className="text-slate-400 text-sm">{dateDisplay}</span>
        </div>

        {/* Tittel */}
        <input
          ref={titleRef}
          type="text"
          placeholder="Hva skal skje?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          className="w-full p-2.5 rounded-lg bg-slate-700 placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500 mb-3 text-sm"
        />

        {/* Tid */}
        <div className="flex gap-3 mb-3">
          <div className="flex-1">
            <label className="text-xs text-slate-500 mb-1 block">Fra</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full p-2 rounded-lg bg-slate-700 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-slate-500 mb-1 block">Til</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full p-2 rounded-lg bg-slate-700 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>

        {/* Gjentagelse */}
        <label className="flex items-center gap-2.5 mb-4 cursor-pointer group">
          <input
            type="checkbox"
            checked={recurring}
            onChange={(e) => setRecurring(e.target.checked)}
            className="w-4 h-4 accent-blue-500"
          />
          <span className="text-sm group-hover:text-white transition-colors">
            Gjentas ukentlig
          </span>
          {recurring && (
            <span className="text-xs text-blue-400 ml-1">
              (hver {DAY_NAMES[dateObj.getDay()].toLowerCase()})
            </span>
          )}
        </label>

        {/* Deltakere */}
        <div className="mb-5">
          <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Deltakere</p>
          <div className="space-y-2">
            {members.map((member) => (
              <label
                key={member.id}
                className="flex items-center gap-2.5 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(member.id)}
                  onChange={() => toggleMember(member.id)}
                  className="w-4 h-4 accent-blue-500"
                />
                <div className={`w-2.5 h-2.5 rounded-full ${member.color}`} />
                <span className="text-sm group-hover:text-white transition-colors">
                  {member.name}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Knapper */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors text-sm"
          >
            Avbryt
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || selectedIds.length === 0}
            className="flex-1 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-40 transition-colors text-sm font-medium"
          >
            Lagre
          </button>
        </div>
      </div>
    </div>
  );
}
