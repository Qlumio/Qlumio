"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { FamilyMember, Event, EventException, Task, Meal, MealPlan } from "@/lib/types";
import { getMondayOfWeek, getWeekDates, formatDate, getWeekNumber } from "@/lib/dates";
import EventModal from "@/components/EventModal";
import EventActionsModal from "@/components/EventActionsModal";
import DayView from "@/components/DayView";
import { EVENT_CATEGORIES } from "@/lib/types";
import { getPublicHolidayName, getSchoolHolidayName, isPublicHoliday } from "@/lib/holidays";

const DAY_NAMES = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];
const MONTH_NAMES = ["Januar", "Februar", "Mars", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Desember"];
const MAX_VISIBLE_EVENTS = 3;

// Konverter mettede farger (bg-X-500) til pastell (bg-X-100) for aktivitetskort
function toChipColor(memberColor: string): string {
  return memberColor
    .replace(/-700$/, "-200")
    .replace(/-600$/, "-100")
    .replace(/-500$/, "-100")
    .replace(/-400$/, "-100");
}

type ModalCell = { memberId: string; date: string } | null;
type ActiveEvent = { event: Event; date: string } | null;

type Props = {
  members: FamilyMember[];
  events: Event[];
  exceptions: EventException[];
  tasks: Task[];
  currentMonday: string;
  familyId: string;
  meals: Meal[];
  mealPlans: MealPlan[];
};

// Vis kun HH:MM (strip sekunder)
function formatTime(t: string | null): string | null {
  if (!t) return null;
  return t.slice(0, 5);
}

// ── TaskChip – oppgave-chip i kalender ───────────────────────────────────────
function TaskChip({ task, onToggle }: { task: Task; onToggle: (task: Task) => void }) {
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onToggle(task); }}
      className={`flex items-start gap-1.5 rounded-md px-2 py-1.5 mb-1.5 cursor-pointer transition-opacity hover:opacity-80 ${
        task.completed ? "bg-green-50" : "bg-gray-50 border border-dashed border-gray-200"
      }`}
    >
      <div className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 rounded-sm border flex items-center justify-center transition-colors ${
        task.completed ? "bg-green-500 border-green-500" : "border-gray-300"
      }`}>
        {task.completed && (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className={`text-xs leading-tight ${task.completed ? "line-through text-gray-400" : "text-gray-700"}`}>
        {task.title}
      </span>
    </div>
  );
}

function getCategoryEmoji(category: string | null): string | null {
  if (!category) return null;
  return EVENT_CATEGORIES.find((c) => c.value === category)?.icon ?? null;
}

// ── EventChip – gjenbrukbar chip for enkeltaktivitet ──────────────────────
function EventChip({
  event,
  dateStr,
  member,
  members,
  chipColor,
  onOpen,
  solo = false,
}: {
  event: Event;
  dateStr: string;
  member: FamilyMember;
  members: FamilyMember[];
  chipColor: string;
  onOpen: (event: Event) => void;
  solo?: boolean;
}) {
  const isFirstDay = event.date === dateStr;
  const isLastDay = (event.end_date ?? event.date) === dateStr;
  const st = formatTime(event.start_time);
  const et = formatTime(event.end_time);
  const emoji = getCategoryEmoji(event.category ?? null);

  const responsible = event.responsible_member_id
    ? members.find((m) => m.id === event.responsible_member_id)
    : null;
  const isChildCol = member.role === "child";
  const isResponsibleCol = event.responsible_member_id === member.id;
  const childParticipants = isResponsibleCol
    ? members.filter((m) => m.role === "child" && event.participant_ids.includes(m.id))
    : [];

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onOpen(event); }}
      className={`${chipColor} rounded-md p-2 text-gray-800 mb-1.5 cursor-pointer hover:opacity-80 transition-opacity`}
    >
      {(st || et) && (
        <div className="text-xs text-gray-500 leading-tight mb-0.5">
          {isFirstDay && st && <span>{st}</span>}
          {isFirstDay && st && isLastDay && et && <span> – {et}</span>}
          {isFirstDay && st && !isLastDay && <span> →</span>}
          {!isFirstDay && isLastDay && et && <span>→ {et}</span>}
        </div>
      )}
      <div className={`flex items-start gap-1 ${solo ? "text-sm" : "text-xs"} font-semibold leading-tight`}>
        {emoji && <span className={`${solo ? "text-base" : "text-sm"} flex-shrink-0 leading-none`}>{emoji}</span>}
        <span className="truncate">
          {event.title}
          {event.recurring && <span className="ml-1 opacity-50 text-[9px]">↻</span>}
          {event.end_date && !event.recurring && <span className="ml-1 opacity-50 text-[9px]">⟷</span>}
        </span>
      </div>
      {isChildCol && responsible && (
        <div className="flex items-center gap-1 mt-0.5">
          <div className={`w-2 h-2 rounded-full ${responsible.color} opacity-80`} />
          <span className="text-[9px] opacity-70 leading-tight truncate">{responsible.name}</span>
        </div>
      )}
      {isResponsibleCol && childParticipants.length > 0 && (
        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
          {childParticipants.map((child) => (
            <div key={child.id} className="flex items-center gap-0.5">
              <div className={`w-2 h-2 rounded-full ${child.color} opacity-80`} />
              <span className="text-[9px] opacity-70 leading-tight">{child.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function WeekGrid({ members, events, exceptions, tasks, currentMonday, familyId, meals, mealPlans }: Props) {
  const router = useRouter();
  const [modalCell, setModalCell] = useState<ModalCell>(null);
  const [activeEvent, setActiveEvent] = useState<ActiveEvent>(null);
  const [focusedMemberId, setFocusedMemberId] = useState<string | null>(null);
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);
  const [hiddenMemberIds, setHiddenMemberIds] = useState<Set<string>>(new Set());

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const toggleMember = (id: string) => {
    setHiddenMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const visibleMembers = members.filter((m) => !hiddenMemberIds.has(m.id));

  // Oppgaver for et gitt familiemedlem på en gitt dato
  const getTasksForCell = (memberId: string, dateStr: string): Task[] =>
    localTasks.filter((t) => t.due_date === dateStr && t.assigned_to === memberId);

  // Toggle completed lokalt + i DB
  const handleToggleTask = async (task: Task) => {
    const updated = { ...task, completed: !task.completed };
    setLocalTasks((prev) => prev.map((t) => t.id === task.id ? updated : t));
    await supabase
      .from("tasks")
      .update({ completed: updated.completed, completed_at: updated.completed ? new Date().toISOString() : null })
      .eq("id", task.id);
  };

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

  const navigateMonth = (direction: -1 | 1) => {
    const d = new Date(monday);
    d.setDate(1);
    d.setMonth(d.getMonth() + direction);
    const targetMonth = d.getMonth();
    const targetYear = d.getFullYear();

    // getMondayOfWeek kan returnere en dato i forrige måned (f.eks. hvis 1. juli er onsdag
    // → mandag blir 29. juni). Sjekk at vi faktisk er i riktig måned, ellers hopp en uke frem.
    const candidate = getMondayOfWeek(d);
    if (candidate.getMonth() !== targetMonth || candidate.getFullYear() !== targetYear) {
      candidate.setDate(candidate.getDate() + 7);
    }
    router.push(`?week=${formatDate(candidate)}`);
  };

  const currentMonthName = MONTH_NAMES[monday.getMonth()];
  const currentYear = monday.getFullYear();

  // Finn events for et gitt familiemedlem på en gitt dato (støtter flerdagsaktiviteter)
  const getEventsForCell = (memberId: string, dateStr: string): Event[] => {
    const cellDate = new Date(dateStr + "T00:00:00");
    return events.filter((e) => {
      // Vis eventet hvis medlemmet er deltaker ELLER ansvarlig foresatt
      const isParticipant = e.participant_ids.includes(memberId);
      const isResponsible = e.responsible_member_id === memberId;
      if (!isParticipant && !isResponsible) return false;
      if (!e.recurring) {
        const startDate = new Date(e.date + "T00:00:00");
        const endDate = e.end_date ? new Date(e.end_date + "T00:00:00") : startDate;
        return cellDate >= startDate && cellDate <= endDate;
      }
      // Gjentagende: vis på samme ukedag
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
    end_date: string | null;
    start_time: string | null;
    end_time: string | null;
    recurring: boolean;
    participant_ids: string[];
    responsible_member_id: string | null;
    category: string | null;
  }) => {
    if (!modalCell) return;

    const { data: event, error: eventError } = await supabase
      .from("events")
      .insert({
        title: data.title,
        date: modalCell.date,
        end_date: data.end_date,
        start_time: data.start_time,
        end_time: data.end_time,
        recurring: data.recurring,
        responsible_member_id: data.responsible_member_id,
        category: data.category,
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

  if (isMobile) {
    return (
      <DayView
        members={members}
        events={events}
        exceptions={exceptions}
        tasks={tasks}
        familyId={familyId}
        meals={meals}
        mealPlans={mealPlans}
      />
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition-colors text-sm px-2 py-1.5 rounded-lg hover:bg-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Tilbake
          </button>
          <div className="w-px h-5 bg-gray-100" />
          <h1 className="text-lg font-semibold">Aktiviteter</h1>
        </div>
        <div className="flex items-center gap-2">
        <Link
          href="/arshjul"
          className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition-colors text-sm px-2 py-1.5 rounded-lg hover:bg-white"
          title="Årshjul"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="hidden sm:inline">Årshjul</span>
        </Link>
        <Link
          href="/oppgaver?ny=1"
          className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition-colors text-sm px-2 py-1.5 rounded-lg hover:bg-white"
          title="Legg til oppgave"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span className="hidden sm:inline">+ Oppgave</span>
        </Link>
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
          {/* Navigasjon */}
          <div className="flex flex-col gap-2 mb-5">
            {/* Månedsnav */}
            <div className="flex items-center gap-2">
              <button onClick={() => navigateMonth(-1)} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded transition-colors text-sm">
                ‹‹ Forrige mnd
              </button>
              <span className="font-semibold text-base min-w-[140px] text-center">
                {currentMonthName} {currentYear}
              </span>
              <button onClick={() => navigateMonth(1)} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded transition-colors text-sm">
                Neste mnd ››
              </button>
            </div>
            {/* Ukenav */}
            <div className="flex items-center gap-2">
              <button onClick={() => navigate(-1)} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded transition-colors text-sm">
                ← Forrige uke
              </button>
              <button
                onClick={() => navigate(0)}
                className={`px-3 py-1.5 rounded transition-colors text-sm font-medium ${
                  isCurrentWeek ? "bg-blue-500 text-white" : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                Denne uken
              </button>
              <button onClick={() => navigate(1)} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded transition-colors text-sm">
                Neste uke →
              </button>
              <span className="ml-1 text-gray-400 text-sm">Uke {weekNumber}</span>
            </div>
          </div>

          {/* Personfilter */}
          {!focusedMemberId && members.length > 1 && (
            <div className="flex flex-wrap gap-2 px-4 pb-3">
              {members.map((m) => {
                const hidden = hiddenMemberIds.has(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => toggleMember(m.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium transition-all ${
                      hidden
                        ? "bg-gray-100 text-gray-400 line-through"
                        : `${m.color} text-white`
                    }`}
                  >
                    {m.name}
                  </button>
                );
              })}
            </div>
          )}

          {/* Ukesvisning */}
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">

              {/* ── Familie-visning (alle) ── */}
              {!focusedMemberId && (
                <>
                  {/* Datoheader */}
                  <div className="grid grid-cols-[150px_repeat(7,1fr)] gap-2 mb-2">
                    {/* Klikk "Familie" for å reset (her er det ingen fokus, men vi viser en tom celle) */}
                    <div />
                    {weekDates.map((date, i) => {
                      const ds = formatDate(date);
                      const isToday = ds === todayStr;
                      const holidayName = getPublicHolidayName(ds);
                      const schoolHoliday = getSchoolHolidayName(ds);
                      const isRed = isPublicHoliday(ds);
                      return (
                        <div key={i} className="text-center">
                          <div className="text-xs text-gray-400 uppercase tracking-wide">{DAY_NAMES[i]}</div>
                          <div className={`text-sm font-semibold mt-0.5 ${isToday ? "text-blue-500" : isRed ? "text-red-500" : "text-gray-700"}`}>
                            {date.getDate()}.{date.getMonth() + 1}
                          </div>
                          {holidayName && (
                            <div className="text-[10px] text-red-400 leading-tight mt-0.5 truncate" title={holidayName}>
                              {holidayName}
                            </div>
                          )}
                          {!holidayName && schoolHoliday && (
                            <div className="text-[10px] text-amber-400 leading-tight mt-0.5">🎒 {schoolHoliday}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Middag-rad */}
                  <div className="grid grid-cols-[150px_repeat(7,1fr)] gap-2 mb-4 mt-1">
                    <div className="flex items-center gap-1.5 px-2">
                      <span className="text-base">🍽️</span>
                      <span className="text-xs text-gray-400 font-medium">Middag</span>
                    </div>
                    {weekDates.map((date) => {
                      const ds = formatDate(date);
                      const plan = mealPlans.find(p => p.date === ds);
                      const title = plan?.meals?.title ?? plan?.custom_title;
                      return (
                        <div key={ds} className="min-h-[2rem] flex items-center justify-center">
                          {title ? (
                            <span className="text-xs text-purple-600 font-medium bg-purple-50 rounded-lg px-2 py-1 text-center leading-tight">{title}</span>
                          ) : (
                            <span className="text-xs text-gray-200">–</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Rad per familiemedlem */}
                  {visibleMembers.map((member) => (
                    <div key={member.id} className="grid grid-cols-[150px_repeat(7,1fr)] gap-2 mb-2">
                      <button
                        onClick={() => setFocusedMemberId(member.id)}
                        className="flex items-center gap-2 text-sm pr-2 rounded-lg hover:bg-white px-2 py-1 transition-colors text-left group"
                        title={`Vis kun ${member.name}`}
                      >
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${member.color}`} />
                        <div className="min-w-0">
                          <div className="font-medium truncate group-hover:text-blue-600 transition-colors">{member.name}</div>
                        </div>
                      </button>

                      {weekDates.map((date, i) => {
                        const dateStr = formatDate(date);
                        const isToday = dateStr === todayStr;
                        const cellEvents = getEventsForCell(member.id, dateStr);
                        const visibleEvents = cellEvents.slice(0, MAX_VISIBLE_EVENTS);
                        const hiddenCount = cellEvents.length - MAX_VISIBLE_EVENTS;

                        const cellTasks = getTasksForCell(member.id, dateStr);

                        return (
                          <div
                            key={i}
                            onClick={() => setModalCell({ memberId: member.id, date: dateStr })}
                            className={`relative group/cell min-h-28 rounded-lg p-1.5 cursor-pointer transition-colors ${
                              isToday
                                ? "bg-gray-100 ring-1 ring-blue-500 hover:bg-gray-200"
                                : "bg-white hover:bg-gray-100"
                            }`}
                          >
                            <button
                              onClick={(e) => { e.stopPropagation(); setModalCell({ memberId: member.id, date: dateStr }); }}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white/80 hover:bg-blue-500 hover:text-white text-gray-300 hover:text-white flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-all z-10 text-xs font-bold shadow-sm"
                              title="Legg til aktivitet"
                            >
                              +
                            </button>
                            {visibleEvents.map((event) => (
                              <EventChip
                                key={event.id}
                                event={event}
                                dateStr={dateStr}
                                member={member}
                                members={members}
                                chipColor={toChipColor(member.color)}
                                onOpen={(ev) => setActiveEvent({ event: ev, date: dateStr })}
                              />
                            ))}
                            {hiddenCount > 0 && (
                              <div className="text-xs text-gray-400 pl-1 mt-0.5">+{hiddenCount} mer</div>
                            )}
                            {cellTasks.map((task) => (
                              <TaskChip key={task.id} task={task} onToggle={handleToggleTask} />
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </>
              )}

              {/* ── Solo-visning (ett familiemedlem) ── */}
              {focusedMemberId && (() => {
                const member = members.find((m) => m.id === focusedMemberId);
                if (!member) return null;
                return (
                  <>
                    {/* Topprad: tilbake + navn */}
                    <div className="flex items-center gap-3 mb-3">
                      <button
                        onClick={() => setFocusedMemberId(null)}
                        className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition-colors text-sm px-2 py-1.5 rounded-lg hover:bg-white"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                        Familie
                      </button>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full ${member.color}`} />
                        <span className="font-semibold text-base">{member.name}</span>
                      </div>
                    </div>

                    {/* Datoheader – full bredde, 7 kolonner */}
                    <div className="grid grid-cols-7 gap-2 mb-2">
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

                    {/* Én rad med store celler */}
                    <div className="grid grid-cols-7 gap-2">
                      {weekDates.map((date, i) => {
                        const dateStr = formatDate(date);
                        const isToday = dateStr === todayStr;
                        const cellEvents = getEventsForCell(member.id, dateStr);

                        const cellTasks = getTasksForCell(member.id, dateStr);

                        return (
                          <div
                            key={i}
                            onClick={() => setModalCell({ memberId: member.id, date: dateStr })}
                            className={`relative group/cell min-h-40 rounded-lg p-2 cursor-pointer transition-colors ${
                              isToday
                                ? "bg-gray-100 ring-1 ring-blue-500 hover:bg-gray-200"
                                : "bg-white hover:bg-gray-100"
                            }`}
                          >
                            <button
                              onClick={(e) => { e.stopPropagation(); setModalCell({ memberId: member.id, date: dateStr }); }}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white/80 hover:bg-blue-500 text-gray-300 hover:text-white flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-all z-10 text-xs font-bold shadow-sm"
                              title="Legg til aktivitet"
                            >
                              +
                            </button>
                            {cellEvents.map((event) => (
                              <EventChip
                                key={event.id}
                                event={event}
                                dateStr={dateStr}
                                member={member}
                                members={members}
                                chipColor={toChipColor(member.color)}
                                onOpen={(ev) => setActiveEvent({ event: ev, date: dateStr })}
                                solo
                              />
                            ))}
                            {cellTasks.map((task) => (
                              <TaskChip key={task.id} task={task} onToggle={handleToggleTask} />
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
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
          members={members}
          onDeleteSingle={handleDeleteSingle}
          onDeleteAll={handleDeleteAll}
          onClose={() => setActiveEvent(null)}
          onUpdated={() => router.refresh()}
        />
      )}
    </main>
  );
}
