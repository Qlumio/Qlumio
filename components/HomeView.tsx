"use client";

import Link from "next/link";
import { useState } from "react";
import { useUser } from "@/lib/userContext";
import ProfileSelector from "@/components/ProfileSelector";
import type { FamilyMember, Event, EventException, Task } from "@/lib/types";

// ─── Modul-konfigurasjon ───────────────────────────────────────────────────

const ALL_MODULES = [
  { href: "/aktiviteter", title: "Aktiviteter", icon: "📅", roles: ["admin", "member"] },
  { href: "/oppgaver", title: "Oppgaver", icon: "✅", roles: ["admin", "member"] },
  { href: "/innkjop", title: "Innkjøp", icon: "🛒", roles: ["admin", "member"] },
  { href: "/eiendeler", title: "Eiendeler", icon: "🔧", roles: ["admin"] },
  { href: "/okonomi", title: "Økonomi", icon: "💰", roles: ["admin"] },
  { href: "/planlagte-kostnader", title: "Planlagte kostnader", icon: "📋", roles: ["admin"] },
  { href: "/lan-forsikring-pensjon", title: "Lån & forsikring", icon: "🛡️", roles: ["admin"] },
  { href: "/innstillinger", title: "Innstillinger", icon: "⚙️", roles: ["admin"] },
];

// ─── Hjelpefunksjoner ──────────────────────────────────────────────────────

const DAY_NAMES_SHORT = ["Søn", "Man", "Tir", "Ons", "Tor", "Fre", "Lør"];
const DAY_NAMES_FULL = ["Søndag", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag"];
const MONTH_NAMES = ["jan", "feb", "mar", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov", "des"];

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getGreeting(name: string): string {
  const h = new Date().getHours();
  if (h < 10) return `God morgen, ${name}! ☀️`;
  if (h < 12) return `God formiddag, ${name}!`;
  if (h < 17) return `God ettermiddag, ${name}! 👋`;
  if (h < 21) return `God kveld, ${name}! 🌙`;
  return `God natt, ${name}! 🌙`;
}

function getEventsForDate(
  events: Event[],
  exceptions: EventException[],
  dateStr: string,
  memberId: string | null // null = alle
): Event[] {
  const cellDate = new Date(dateStr + "T00:00:00");
  return events.filter((e) => {
    // Filtrer på deltaker eller ansvarlig
    if (memberId) {
      const isParticipant = e.participant_ids.includes(memberId);
      const isResponsible = e.responsible_member_id === memberId;
      if (!isParticipant && !isResponsible) return false;
    }
    if (!e.recurring) {
      const start = new Date(e.date + "T00:00:00");
      const end = e.end_date ? new Date(e.end_date + "T00:00:00") : start;
      return cellDate >= start && cellDate <= end;
    }
    const eventDay = new Date(e.date + "T00:00:00").getDay();
    if (cellDate.getDay() !== eventDay) return false;
    return !exceptions.some((ex) => ex.event_id === e.id && ex.date === dateStr);
  });
}

function getDatesRange(fromStr: string, days: number): string[] {
  const result: string[] = [];
  const d = new Date(fromStr + "T00:00:00");
  for (let i = 0; i < days; i++) {
    result.push(formatDate(d));
    d.setDate(d.getDate() + 1);
  }
  return result;
}

// ─── Props ─────────────────────────────────────────────────────────────────

type Props = {
  members: FamilyMember[];
  events: Event[];
  exceptions: EventException[];
  tasks: Task[];
  todayStr: string;
};

// ─── Komponent ─────────────────────────────────────────────────────────────

export default function HomeView({ members, events, exceptions, tasks, todayStr }: Props) {
  const { currentUser, setCurrentUser, isLoaded } = useUser();
  const [completingId, setCompletingId] = useState<string | null>(null);

  if (!isLoaded) return null;
  if (!currentUser) return <ProfileSelector members={members} />;

  const freshUser = members.find((m) => m.id === currentUser.id) ?? currentUser;
  const isAdmin = freshUser.permission_level === "admin";
  const hasAnyAdmin = members.some((m) => m.permission_level === "admin");
  const showSettings = isAdmin || !hasAnyAdmin;

  const visibleModules = ALL_MODULES.filter((mod) => {
    if (mod.href === "/innstillinger") return showSettings;
    return mod.roles.includes(freshUser.permission_level);
  });

  // Events denne uken (man–søn) og neste uke
  const todayDate = new Date(todayStr + "T00:00:00");
  const dayOfWeek = todayDate.getDay(); // 0=søn
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const thisMonday = new Date(todayDate);
  thisMonday.setDate(todayDate.getDate() - daysFromMonday);
  const thisMondayStr = formatDate(thisMonday);

  const nextMonday = new Date(thisMonday);
  nextMonday.setDate(thisMonday.getDate() + 7);
  const nextMondayStr = formatDate(nextMonday);

  const thisWeekDates = getDatesRange(thisMondayStr, 7);
  const nextWeekDates = getDatesRange(nextMondayStr, 7);

  const filterMemberId = isAdmin ? null : freshUser.id;

  // Bygg dagsoversikt
  type DayEvents = { dateStr: string; events: Event[] };

  const thisWeekDays: DayEvents[] = thisWeekDates.map((d) => ({
    dateStr: d,
    events: getEventsForDate(events, exceptions, d, filterMemberId),
  }));

  const nextWeekDays: DayEvents[] = nextWeekDates.map((d) => ({
    dateStr: d,
    events: getEventsForDate(events, exceptions, d, filterMemberId),
  }));

  const hasNextWeekEvents = nextWeekDays.some((d) => d.events.length > 0);

  // Oppgaver for denne brukeren
  const myTasks = tasks.filter((t) => {
    if (isAdmin) return true;
    return t.assigned_to === freshUser.id || t.assigned_to === null;
  });
  const pendingTasks = myTasks.filter((t) => !t.completed);
  const overdueTasks = pendingTasks.filter(
    (t) => t.due_date && t.due_date < todayStr
  );
  const upcomingTasks = pendingTasks.filter(
    (t) => !t.due_date || t.due_date >= todayStr
  );

  const toggleTask = async (taskId: string, completed: boolean) => {
    setCompletingId(taskId);
    const { supabase: sb } = await import("@/lib/supabase");
    await sb.from("tasks").update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    }).eq("id", taskId);
    setCompletingId(null);
    window.location.reload();
  };

  const formatDueDate = (due: string | null): string | null => {
    if (!due) return null;
    const d = new Date(due + "T00:00:00");
    if (due === todayStr) return "i dag";
    const tomorrow = new Date(todayDate);
    tomorrow.setDate(todayDate.getDate() + 1);
    if (due === formatDate(tomorrow)) return "i morgen";
    if (due < todayStr) {
      const diff = Math.round((todayDate.getTime() - d.getTime()) / 86400000);
      return `${diff} dag${diff === 1 ? "" : "er"} siden`;
    }
    return `${d.getDate()}. ${MONTH_NAMES[d.getMonth()]}`;
  };

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-lg mx-auto px-4 pb-10">

        {/* ── Header ── */}
        <div className="flex items-center justify-between pt-8 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{getGreeting(freshUser.name)}</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {new Date(todayStr + "T00:00:00").toLocaleDateString("nb-NO", {
                weekday: "long", day: "numeric", month: "long",
              })}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentUser(null)}
              className="flex items-center gap-2 text-sm px-2.5 py-1.5 rounded-lg hover:bg-white transition-colors group"
              title="Bytt bruker"
            >
              <div className={`w-7 h-7 rounded-full ${freshUser.color} flex items-center justify-center text-white text-xs font-bold`}>
                {freshUser.name[0].toUpperCase()}
              </div>
            </button>
          </div>
        </div>

        {/* ── Denne uken ── */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Denne uken</h2>
            <Link href="/aktiviteter" className="text-xs text-blue-500 hover:text-blue-600">Se kalender →</Link>
          </div>
          <div className="bg-white rounded-xl overflow-hidden divide-y divide-gray-100">
            {thisWeekDays.every((d) => d.events.length === 0) ? (
              <p className="text-sm text-gray-400 px-4 py-4 text-center">Ingen aktiviteter denne uken</p>
            ) : (
              thisWeekDays.map(({ dateStr, events: dayEvents }) => {
                const d = new Date(dateStr + "T00:00:00");
                const isToday = dateStr === todayStr;
                const isPast = dateStr < todayStr;
                if (dayEvents.length === 0 && !isToday) return null;
                return (
                  <div key={dateStr} className={`flex gap-3 px-4 py-2.5 ${isPast && !isToday ? "opacity-40" : ""}`}>
                    <div className={`flex-shrink-0 w-10 text-center pt-0.5`}>
                      <div className={`text-xs font-medium ${isToday ? "text-blue-500" : "text-gray-400"}`}>
                        {DAY_NAMES_SHORT[d.getDay()]}
                      </div>
                      <div className={`text-lg font-bold leading-tight ${isToday ? "text-blue-500" : "text-gray-700"}`}>
                        {d.getDate()}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 py-0.5">
                      {dayEvents.length === 0 ? (
                        <p className="text-sm text-gray-300 pt-1">Fri dag</p>
                      ) : (
                        dayEvents.map((ev) => {
                          const childParts = ev.participant_ids
                            .map((id) => members.find((m) => m.id === id))
                            .filter((m) => m?.role === "child");
                          const resp = ev.responsible_member_id
                            ? members.find((m) => m.id === ev.responsible_member_id)
                            : null;
                          return (
                            <div key={ev.id} className="flex items-start gap-2 py-0.5">
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium text-gray-800">{ev.title}</span>
                                {ev.start_time && (
                                  <span className="text-xs text-gray-400 ml-1.5">{ev.start_time.slice(0, 5)}</span>
                                )}
                                {(childParts.length > 0 || resp) && (
                                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                    {childParts.map((child) => child && (
                                      <div key={child.id} className="flex items-center gap-1">
                                        <div className={`w-2 h-2 rounded-full ${child.color}`} />
                                        <span className="text-xs text-gray-400">{child.name}</span>
                                      </div>
                                    ))}
                                    {resp && !ev.participant_ids.includes(freshUser.id) && (
                                      <span className="text-xs text-amber-600">ansvarlig</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* ── Neste uke (kun hvis det er events) ── */}
        {hasNextWeekEvents && (
          <section className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Neste uke</h2>
            </div>
            <div className="bg-white rounded-xl overflow-hidden divide-y divide-gray-100">
              {nextWeekDays.filter((d) => d.events.length > 0).map(({ dateStr, events: dayEvents }) => {
                const d = new Date(dateStr + "T00:00:00");
                return (
                  <div key={dateStr} className="flex gap-3 px-4 py-2.5">
                    <div className="flex-shrink-0 w-10 text-center pt-0.5">
                      <div className="text-xs font-medium text-gray-400">{DAY_NAMES_SHORT[d.getDay()]}</div>
                      <div className="text-lg font-bold leading-tight text-gray-600">{d.getDate()}</div>
                    </div>
                    <div className="flex-1 min-w-0 py-0.5">
                      {dayEvents.map((ev) => (
                        <div key={ev.id} className="py-0.5">
                          <span className="text-sm text-gray-600">{ev.title}</span>
                          {ev.start_time && (
                            <span className="text-xs text-gray-400 ml-1.5">{ev.start_time.slice(0, 5)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Oppgaver ── */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Oppgaver</h2>
            <Link href="/oppgaver" className="text-xs text-blue-500 hover:text-blue-600">Se alle →</Link>
          </div>
          <div className="bg-white rounded-xl overflow-hidden">
            {pendingTasks.length === 0 ? (
              <div className="px-4 py-4 text-center">
                <p className="text-sm text-gray-400">Ingen åpne oppgaver 🎉</p>
                <Link href="/oppgaver" className="text-xs text-blue-500 mt-1 inline-block">+ Legg til oppgave</Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {overdueTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    members={members}
                    dueLabel={formatDueDate(task.due_date)}
                    isOverdue
                    completing={completingId === task.id}
                    onToggle={() => toggleTask(task.id, true)}
                  />
                ))}
                {upcomingTasks.slice(0, 5).map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    members={members}
                    dueLabel={formatDueDate(task.due_date)}
                    isOverdue={false}
                    completing={completingId === task.id}
                    onToggle={() => toggleTask(task.id, true)}
                  />
                ))}
                {upcomingTasks.length > 5 && (
                  <div className="px-4 py-2.5">
                    <Link href="/oppgaver" className="text-xs text-gray-400 hover:text-blue-500">
                      + {upcomingTasks.length - 5} til i Oppgaver
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ── Modul-snarveier ── */}
        <section>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Moduler</h2>
          <div className="grid grid-cols-4 gap-2">
            {visibleModules.filter((m) => m.href !== "/innstillinger").map((mod) => (
              <Link
                key={mod.href}
                href={mod.href}
                className="flex flex-col items-center gap-1.5 p-3 bg-white hover:bg-gray-100 rounded-xl transition-colors text-center"
              >
                <span className="text-2xl">{mod.icon}</span>
                <span className="text-[10px] text-gray-600 leading-tight">{mod.title}</span>
              </Link>
            ))}
          </div>
          {showSettings && (
            <Link
              href="/innstillinger"
              className="flex items-center gap-2 mt-2 px-4 py-2.5 bg-white hover:bg-gray-100 rounded-xl transition-colors text-sm text-gray-500"
            >
              <span>⚙️</span> Innstillinger
            </Link>
          )}
        </section>

      </div>
    </main>
  );
}

// ─── TaskRow ───────────────────────────────────────────────────────────────

function TaskRow({
  task,
  members,
  dueLabel,
  isOverdue,
  completing,
  onToggle,
}: {
  task: Task;
  members: FamilyMember[];
  dueLabel: string | null;
  isOverdue: boolean;
  completing: boolean;
  onToggle: () => void;
}) {
  const assignee = task.assigned_to ? members.find((m) => m.id === task.assigned_to) : null;
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <button
        onClick={onToggle}
        disabled={completing}
        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
          completing ? "border-green-400 bg-green-100" : "border-gray-300 hover:border-green-400"
        }`}
      >
        {completing && <span className="text-green-500 text-xs">✓</span>}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 truncate">{task.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {dueLabel && (
            <span className={`text-xs ${isOverdue ? "text-red-500 font-medium" : "text-gray-400"}`}>
              {isOverdue ? "⚠️ " : ""}{dueLabel}
            </span>
          )}
          {assignee && (
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${assignee.color}`} />
              <span className="text-xs text-gray-400">{assignee.name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
