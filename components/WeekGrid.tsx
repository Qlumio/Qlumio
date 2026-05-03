"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { FamilyMember, Event, EventException } from "@/lib/types";
import { getMondayOfWeek, getWeekDates, formatDate, getWeekNumber } from "@/lib/dates";
import EventModal from "@/components/EventModal";
import EventActionsModal from "@/components/EventActionsModal";

const DAY_NAMES = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];

type ModalCell = { memberId: string; date: string } | null;
type ActiveEvent = { event: Event; date: string } | null;

type Props = {
  members: FamilyMember[];
  events: Event[];
  exceptions: EventException[];
  currentMonday: string;
};

export default function WeekGrid({ members, events, exceptions, currentMonday }: Props) {
  const router = useRouter();
  const [modalCell, setModalCell] = useState<ModalCell>(null);
  const [activeEvent, setActiveEvent] = useState<ActiveEvent>(null);

  const monday = new Date(currentMonday + "T00:00:00");
  const weekDates = getWeekDates(monday);
  const todayStr = formatDate(new Date());
  const weekNumber = getWeekNumber(monday);
  const isCurrentWeek = formatDate(getMondayOfWeek(new Date())) === currentMonday;

  const navigate = (direction: -1 | 0 | 1) => {
    if (direction === 0) {
      router.push(`?week=${formatDate(getMondayOfWeek(new Date()))}`);
      return;
    }
    const newMonday = new Date(monday);
    newMonday.setDate(monday.getDate() + direction * 7);
    router.push(`?week=${formatDate(newMonday)}`);
  };

  // Finn events for et gitt familiemedlem på en gitt dato
  const getEventsForCell = (memberId: string, dateStr: string): Event[] => {
    const cellDate = new Date(dateStr + "T00:00:00");
    return events.filter((e) => {
      if (!e.participant_ids.includes(memberId)) return false;
      if (!e.recurring) return e.date === dateStr;
      // Gjentagende: vis på samme ukedag, men ikke hvis det finnes et unntak
      const eventDayOfWeek = new Date(e.date + "T00:00:00").getDay();
      if (cellDate.getDay() !== eventDayOfWeek) return false;
      const hasException = exceptions.some(
        (ex) => ex.event_id === e.id && ex.date === dateStr
      );
      return !hasException;
    });
  };

  // Lagre ny event
  const handleSaveEvent = async (data: {
    title: string;
    start_time: string | null;
    end_time: string | null;
    recurring: boolean;
    participant_ids: string[];
  }) => {
    if (!modalCell) return;

    const { data: event, error: eventError } = await supabase
      .from("events")
      .insert({
        title: data.title,
        date: modalCell.date,
        start_time: data.start_time,
        end_time: data.end_time,
        recurring: data.recurring,
      })
      .select()
      .single();

    if (eventError || !event) {
      alert("Feil ved lagring: " + eventError?.message);
      return;
    }

    const { error: participantsError } = await supabase
      .from("event_participants")
      .insert(
        data.participant_ids.map((id) => ({
          event_id: event.id,
          family_member_id: id,
        }))
      );

    if (participantsError) {
      alert("Feil: " + participantsError.message);
      return;
    }

    setModalCell(null);
    router.refresh();
  };

  // Slett bare denne uken (legg til unntak)
  const handleDeleteSingle = async () => {
    if (!activeEvent) return;
    const { error } = await supabase.from("event_exceptions").insert({
      event_id: activeEvent.event.id,
      date: activeEvent.date,
    });
    if (error) {
      alert("Feil: " + error.message);
      return;
    }
    setActiveEvent(null);
    router.refresh();
  };

  // Slett hele eventet (alle forekomster)
  const handleDeleteAll = async () => {
    if (!activeEvent) return;
    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", activeEvent.event.id);
    if (error) {
      alert("Feil: " + error.message);
      return;
    }
    setActiveEvent(null);
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition-colors text-sm px-2 py-1.5 rounded-lg hover:bg-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Hjem
          </Link>
          <div className="w-px h-5 bg-gray-100" />
          <h1 className="text-lg font-semibold">Aktiviteter</h1>
        </div>
        <Link
          href="/innstillinger"
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors text-sm px-3 py-1.5 rounded-lg hover:bg-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Innstillinger
        </Link>
      </div>

      {/* Ingen medlemmer */}
      {members.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-500 mb-4">Ingen familiemedlemmer lagt til ennå.</p>
          <Link
            href="/innstillinger"
            className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-5 py-2 rounded-lg transition-colors"
          >
            Legg til familiemedlemmer →
          </Link>
        </div>
      )}

      {members.length > 0 && (
        <>
          {/* Uke-navigasjon */}
          <div className="flex items-center gap-3 mb-5">
            <button onClick={() => navigate(-1)} className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 rounded transition-colors text-sm">
              ← Forrige
            </button>
            <button
              onClick={() => navigate(0)}
              className={`px-4 py-1.5 rounded transition-colors text-sm font-medium ${
                isCurrentWeek ? "bg-blue-500 text-white" : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              Denne uken
            </button>
            <button onClick={() => navigate(1)} className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 rounded transition-colors text-sm">
              Neste →
            </button>
            <span className="ml-2 text-gray-400 text-sm">Uke {weekNumber}</span>
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
                      <div className="text-xs text-gray-400 uppercase tracking-wide">{DAY_NAMES[i]}</div>
                      <div className={`text-sm font-semibold mt-0.5 ${isToday ? "text-blue-500" : "text-gray-700"}`}>
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
                      <div className="text-xs text-gray-400 truncate">{member.role}</div>
                    </div>
                  </div>

                  {weekDates.map((date, i) => {
                    const dateStr = formatDate(date);
                    const isToday = dateStr === todayStr;
                    const cellEvents = getEventsForCell(member.id, dateStr);

                    return (
                      <div
                        key={i}
                        onClick={() => setModalCell({ memberId: member.id, date: dateStr })}
                        className={`h-20 rounded p-1 text-xs cursor-pointer transition-colors overflow-hidden ${
                          isToday
                            ? "bg-gray-100 ring-1 ring-blue-500 hover:bg-gray-200"
                            : "bg-white hover:bg-gray-100"
                        }`}
                      >
                        {cellEvents.map((event) => (
                          <div
                            key={event.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveEvent({ event, date: dateStr });
                            }}
                            className={`${member.color} rounded p-1 text-gray-900 mb-1 cursor-pointer hover:opacity-80 transition-opacity`}
                          >
                            {(event.start_time || event.end_time) && (
                              <div className="text-[10px] opacity-80">
                                {event.start_time}{event.end_time && ` – ${event.end_time}`}
                              </div>
                            )}
                            <div className="font-medium leading-tight truncate">
                              {event.title}
                              {event.recurring && <span className="ml-1 opacity-60 text-[9px]">↻</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Modal: opprett event */}
      {modalCell && (
        <EventModal
          date={modalCell.date}
          members={members}
          preSelectedMemberId={modalCell.memberId}
          onSave={handleSaveEvent}
          onClose={() => setModalCell(null)}
        />
      )}

      {/* Modal: vis/slett event */}
      {activeEvent && (
        <EventActionsModal
          event={activeEvent.event}
          date={activeEvent.date}
          onDeleteSingle={handleDeleteSingle}
          onDeleteAll={handleDeleteAll}
          onClose={() => setActiveEvent(null)}
        />
      )}
    </main>
  );
}
