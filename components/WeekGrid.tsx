"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { FamilyMember, Event } from "@/lib/types";
import { getMondayOfWeek, getWeekDates, formatDate } from "@/lib/dates";

const DAY_NAMES = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];

type ActiveCell = { memberId: string; date: string } | null;

type Props = {
  members: FamilyMember[];
  events: Event[];
  currentMonday: string;
};

export default function WeekGrid({ members, events, currentMonday }: Props) {
  const router = useRouter();
  const [activeCell, setActiveCell] = useState<ActiveCell>(null);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const monday = new Date(currentMonday + "T00:00:00");
  const weekDates = getWeekDates(monday);
  const todayStr = formatDate(new Date());
  const isCurrentWeek =
    formatDate(getMondayOfWeek(new Date())) === currentMonday;

  useEffect(() => {
    if (activeCell) inputRef.current?.focus();
  }, [activeCell]);

  const navigate = (direction: -1 | 0 | 1) => {
    if (direction === 0) {
      router.push(`?week=${formatDate(getMondayOfWeek(new Date()))}`);
      return;
    }
    const newMonday = new Date(monday);
    newMonday.setDate(monday.getDate() + direction * 7);
    router.push(`?week=${formatDate(newMonday)}`);
  };

  const openCell = (memberId: string, date: string) => {
    setActiveCell({ memberId, date });
    setInputValue("");
  };

  const saveEvent = async () => {
    if (!activeCell || !inputValue.trim()) {
      setActiveCell(null);
      return;
    }

    const input = inputValue.trim();
    const timeMatch = input.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
    let title = input;
    let start_time = null;
    let end_time = null;

    if (timeMatch) {
      start_time = timeMatch[1];
      end_time = timeMatch[2];
      title = input.replace(timeMatch[0], "").trim() || "Aktivitet";
    }

    const { error } = await supabase.from("events").insert({
      family_member_id: activeCell.memberId,
      date: activeCell.date,
      title,
      start_time,
      end_time,
    });

    if (error) {
      alert("Feil ved lagring: " + error.message);
    } else {
      setActiveCell(null);
      setInputValue("");
      router.refresh();
    }
  };

  return (
    <main className="min-h-screen bg-slate-900 text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Qlumio</h1>
          <p className="text-slate-400 text-sm mt-0.5">Less chaos, more family</p>
        </div>
        <Link
          href="/innstillinger"
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm px-3 py-1.5 rounded-lg hover:bg-slate-800"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Innstillinger
        </Link>
      </div>

      {/* Ingen medlemmer ennå */}
      {members.length === 0 && (
        <div className="text-center py-16">
          <p className="text-slate-400 mb-4">Ingen familiemedlemmer lagt til ennå.</p>
          <Link
            href="/innstillinger"
            className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-5 py-2 rounded-lg transition-colors"
          >
            Legg til familiemedlemmer →
          </Link>
        </div>
      )}

      {/* Uke-navigasjon */}
      {members.length > 0 && (
        <>
          <div className="flex items-center gap-3 mb-5">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 rounded transition-colors text-sm"
            >
              ← Forrige
            </button>
            <button
              onClick={() => navigate(0)}
              className={`px-4 py-1.5 rounded transition-colors text-sm font-medium ${
                isCurrentWeek
                  ? "bg-blue-500 text-white"
                  : "bg-slate-700 hover:bg-slate-600"
              }`}
            >
              Denne uken
            </button>
            <button
              onClick={() => navigate(1)}
              className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 rounded transition-colors text-sm"
            >
              Neste →
            </button>
          </div>

          {/* Ukesvisning */}
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              {/* Datoheader */}
              <div className="grid grid-cols-[140px_repeat(7,1fr)] gap-2 mb-2">
                <div />
                {weekDates.map((date, i) => {
                  const isToday = formatDate(date) === todayStr;
                  return (
                    <div key={i} className="text-center">
                      <div className="text-xs text-slate-500 uppercase tracking-wide">
                        {DAY_NAMES[i]}
                      </div>
                      <div className={`text-sm font-semibold mt-0.5 ${isToday ? "text-blue-400" : "text-slate-300"}`}>
                        {date.getDate()}.{date.getMonth() + 1}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Rad per familiemedlem */}
              {members.map((member) => (
                <div key={member.id} className="grid grid-cols-[140px_repeat(7,1fr)] gap-2 mb-2">
                  <div className="flex items-center gap-2 text-sm pr-2">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${member.color}`} />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{member.name}</div>
                      <div className="text-xs text-slate-500 truncate">{member.role}</div>
                    </div>
                  </div>

                  {weekDates.map((date, i) => {
                    const dateStr = formatDate(date);
                    const isToday = dateStr === todayStr;
                    const isActive =
                      activeCell?.memberId === member.id &&
                      activeCell?.date === dateStr;
                    const dayEvents = events.filter(
                      (e) => e.family_member_id === member.id && e.date === dateStr
                    );

                    return (
                      <div
                        key={i}
                        className={`h-20 rounded p-1 text-xs transition-colors ${
                          isActive
                            ? "bg-slate-600 ring-2 ring-blue-400"
                            : isToday
                            ? "bg-slate-700 ring-1 ring-blue-500 cursor-pointer hover:bg-slate-600"
                            : "bg-slate-800 cursor-pointer hover:bg-slate-700"
                        }`}
                        onClick={() => { if (!isActive) openCell(member.id, dateStr); }}
                      >
                        {!isActive && dayEvents.map((event) => (
                          <div key={event.id} className={`${member.color} rounded p-1 text-white mb-1`}>
                            {(event.start_time || event.end_time) && (
                              <div className="text-[10px] opacity-80">
                                {event.start_time}{event.end_time && ` – ${event.end_time}`}
                              </div>
                            )}
                            <div className="font-medium leading-tight">{event.title}</div>
                          </div>
                        ))}

                        {isActive && (
                          <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEvent();
                              if (e.key === "Escape") setActiveCell(null);
                            }}
                            onBlur={saveEvent}
                            placeholder="Aktivitet..."
                            className="w-full bg-transparent text-white placeholder-slate-400 outline-none text-xs"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
