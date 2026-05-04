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
  date: string;
  members: FamilyMember[];
  preSelectedMemberId: string;
  onSave: (data: SaveData) => void;
  onClose: () => void;
};

// ─── ClockPicker ────────────────────────────────────────────────────────────
const CX = 130;
const CY = 130;
const R_OUTER = 105;
const R_INNER = 68;
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function angleToPos(angleDeg: number, r: number) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function ClockPicker({
  value,
  label,
  onChange,
  onClose,
}: {
  value: string;
  label: string;
  onChange: (v: string) => void;
  onClose: () => void;
}) {
  const parts = value ? value.split(":") : [];
  const initHour = parts.length === 2 ? parseInt(parts[0]) : 8;
  const initMin = parts.length === 2 ? parseInt(parts[1]) : 0;

  const [hour, setHour] = useState(initHour);
  const [minute, setMinute] = useState(initMin);
  const [mode, setMode] = useState<"hour" | "minute">("hour");
  const [manualMode, setManualMode] = useState(false);
  const [manualVal, setManualVal] = useState(value || "");
  const svgRef = useRef<SVGSVGElement>(null);

  const confirmManual = () => {
    const match = manualVal.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      const h = parseInt(match[1]);
      const m = parseInt(match[2]);
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        const rounded = Math.round(m / 5) * 5 % 60;
        onChange(`${pad(h)}:${pad(rounded)}`);
        onClose();
      }
    }
  };

  const handleConfirm = () => {
    onChange(`${pad(hour)}:${pad(minute)}`);
    onClose();
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = 260 / rect.width;
    const scaleY = 260 / rect.height;
    const mx = (e.clientX - rect.left) * scaleX - CX;
    const my = (e.clientY - rect.top) * scaleY - CY;
    const dist = Math.sqrt(mx * mx + my * my);
    if (dist < 20) return;

    // angle: 0 = up, clockwise
    let angle = Math.atan2(my, mx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;

    if (mode === "hour") {
      const raw = Math.round(angle / 30) % 12; // 0-11
      if (dist > (R_OUTER + R_INNER) / 2) {
        // outer: 1-12
        const h = raw === 0 ? 12 : raw;
        setHour(h);
        setTimeout(() => setMode("minute"), 120);
      } else {
        // inner: 13-23, 0
        const h = raw === 0 ? 0 : raw + 12;
        setHour(h);
        setTimeout(() => setMode("minute"), 120);
      }
    } else {
      const m = Math.round(angle / 30) % 12 * 5;
      setMinute(m);
    }
  };

  const selectHour = (h: number) => {
    setHour(h);
    setTimeout(() => setMode("minute"), 150);
  };

  const selectMinute = (m: number) => {
    setMinute(m);
  };

  // Hand endpoint
  const handAngle = mode === "hour"
    ? ((hour % 12) / 12) * 360
    : (minute / 60) * 360;
  const handR = mode === "hour"
    ? (hour >= 1 && hour <= 12 ? R_OUTER : R_INNER)
    : R_OUTER;
  const handPos = angleToPos(handAngle, handR);

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-blue-500 px-6 pt-5 pb-4">
          <p className="text-blue-200 text-xs font-medium uppercase tracking-wider mb-2">{label}</p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setMode("hour"); setManualMode(false); }}
              className={`font-mono text-5xl font-light transition-opacity ${mode === "hour" ? "text-white opacity-100" : "text-white opacity-50"}`}
            >
              {pad(hour)}
            </button>
            <span className="text-white text-5xl font-light opacity-70 leading-none">:</span>
            <button
              onClick={() => { setMode("minute"); setManualMode(false); }}
              className={`font-mono text-5xl font-light transition-opacity ${mode === "minute" ? "text-white opacity-100" : "text-white opacity-50"}`}
            >
              {pad(minute)}
            </button>
            <button
              onClick={() => setManualMode(!manualMode)}
              title="Skriv inn manuelt"
              className="ml-auto text-white opacity-60 hover:opacity-100 transition-opacity"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Manual mode */}
        {manualMode ? (
          <div className="p-5">
            <p className="text-xs text-gray-400 mb-2 text-center">Skriv tid (HH:MM)</p>
            <input
              type="text"
              placeholder="08:30"
              value={manualVal}
              onChange={(e) => setManualVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") confirmManual(); }}
              autoFocus
              className="w-full p-3 bg-gray-100 rounded-xl text-center text-xl font-mono outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />
            <div className="flex gap-2">
              <button onClick={() => setManualMode(false)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm text-gray-600 transition-colors">
                ← Tilbake
              </button>
              <button onClick={confirmManual}
                className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors">
                OK
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Clock face */}
            <div className="flex justify-center px-4 pt-3 pb-1">
              <svg
                ref={svgRef}
                viewBox="0 0 260 260"
                width="240"
                height="240"
                onClick={handleSvgClick}
                style={{ cursor: "pointer" }}
              >
                {/* Clock background */}
                <circle cx={CX} cy={CY} r="122" fill="#F3F4F6" />

                {/* Hand */}
                <line
                  x1={CX} y1={CY}
                  x2={handPos.x} y2={handPos.y}
                  stroke="#3B82F6" strokeWidth="2" strokeLinecap="round"
                />
                {/* Hand tip highlight */}
                <circle cx={handPos.x} cy={handPos.y} r="20" fill="#3B82F6" opacity="0.15" />
                <circle cx={handPos.x} cy={handPos.y} r="8" fill="#3B82F6" />
                {/* Center dot */}
                <circle cx={CX} cy={CY} r="4" fill="#3B82F6" />

                {mode === "hour" ? (
                  <>
                    {/* Outer hours 1–12 */}
                    {Array.from({ length: 12 }, (_, i) => {
                      const h = i === 0 ? 12 : i;
                      const angle = (i / 12) * 360;
                      const pos = angleToPos(angle, R_OUTER);
                      const isSelected = hour === h;
                      return (
                        <g key={h} onClick={(e) => { e.stopPropagation(); selectHour(h); }} style={{ cursor: "pointer" }}>
                          {isSelected && <circle cx={pos.x} cy={pos.y} r="20" fill="#3B82F6" />}
                          <text
                            x={pos.x} y={pos.y}
                            textAnchor="middle" dominantBaseline="central"
                            fontSize="15" fontWeight={isSelected ? "600" : "400"}
                            fill={isSelected ? "#ffffff" : "#374151"}
                          >
                            {h}
                          </text>
                        </g>
                      );
                    })}
                    {/* Inner hours 13–23 and 0 */}
                    {Array.from({ length: 12 }, (_, i) => {
                      const h = i === 0 ? 0 : i + 12;
                      const angle = (i / 12) * 360;
                      const pos = angleToPos(angle, R_INNER);
                      const isSelected = hour === h;
                      return (
                        <g key={`inner-${h}`} onClick={(e) => { e.stopPropagation(); selectHour(h); }} style={{ cursor: "pointer" }}>
                          {isSelected && <circle cx={pos.x} cy={pos.y} r="17" fill="#3B82F6" />}
                          <text
                            x={pos.x} y={pos.y}
                            textAnchor="middle" dominantBaseline="central"
                            fontSize="12" fontWeight={isSelected ? "600" : "400"}
                            fill={isSelected ? "#ffffff" : "#6B7280"}
                          >
                            {pad(h)}
                          </text>
                        </g>
                      );
                    })}
                  </>
                ) : (
                  <>
                    {/* Minutes 0–55 in 5-min steps */}
                    {MINUTES.map((m, i) => {
                      const angle = (i / 12) * 360;
                      const pos = angleToPos(angle, R_OUTER);
                      const isSelected = minute === m;
                      return (
                        <g key={m} onClick={(e) => { e.stopPropagation(); selectMinute(m); }} style={{ cursor: "pointer" }}>
                          {isSelected && <circle cx={pos.x} cy={pos.y} r="20" fill="#3B82F6" />}
                          <text
                            x={pos.x} y={pos.y}
                            textAnchor="middle" dominantBaseline="central"
                            fontSize="14" fontWeight={isSelected ? "600" : "400"}
                            fill={isSelected ? "#ffffff" : "#374151"}
                          >
                            {pad(m)}
                          </text>
                        </g>
                      );
                    })}
                  </>
                )}
              </svg>
            </div>

            {/* Mode tabs */}
            <div className="flex justify-center gap-6 pb-1">
              <button
                onClick={() => setMode("hour")}
                className={`text-xs font-medium pb-1 border-b-2 transition-colors ${mode === "hour" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-400"}`}
              >
                Time
              </button>
              <button
                onClick={() => setMode("minute")}
                className={`text-xs font-medium pb-1 border-b-2 transition-colors ${mode === "minute" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-400"}`}
              >
                Minutt
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-2 px-5 py-4">
              {value && (
                <button
                  onClick={() => { onChange(""); onClose(); }}
                  className="py-2.5 px-4 rounded-xl bg-gray-100 hover:bg-red-50 text-red-400 hover:text-red-600 text-sm transition-colors"
                >
                  Fjern
                </button>
              )}
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm text-gray-600 transition-colors">
                Avbryt
              </button>
              <button onClick={handleConfirm}
                className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors">
                OK
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── TimePicker – knapp som åpner ClockPicker ────────────────────────────────
function TimePicker({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex-1">
      <label className="text-xs text-gray-400 mb-1.5 block">{label}</label>
      <button
        type="button"
        onClick={() => setOpen(true)}
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
        <ClockPicker
          value={value}
          label={label}
          onChange={onChange}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

// ─── EventModal ──────────────────────────────────────────────────────────────
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

  useEffect(() => {
    if (hasChildParticipant && !responsibleId && parentMembers.length > 0) setResponsibleId(parentMembers[0].id);
    if (!hasChildParticipant) setResponsibleId("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasChildParticipant]);

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

        {/* 1. Kategori */}
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

        {/* 2. Tittel – kun for "Annet" */}
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

        {/* 4. Sluttdato */}
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
        <label className="flex items-center gap-2.5 mb-4 cursor-pointer">
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
