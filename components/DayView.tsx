"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { FamilyMember, Event, EventException, Task, Meal, MealPlan } from "@/lib/types";
import { formatDate, getWeekNumber } from "@/lib/dates";
import { EVENT_CATEGORIES } from "@/lib/types";
import { getPublicHolidayName, getSchoolHolidayName, isPublicHoliday } from "@/lib/holidays";
import EventModal from "@/components/EventModal";
import EventActionsModal from "@/components/EventActionsModal";

const DAY_NAMES = ["Søndag", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag"];
const MONTH_NAMES = [
  "januar", "februar", "mars", "april", "mai", "juni",
  "juli", "august", "september", "oktober", "november", "desember",
];

function toChipColor(memberColor: string): string {
  return memberColor
    .replace(/-700$/, "-200")
    .replace(/-600$/, "-100")
    .replace(/-500$/, "-100")
    .replace(/-400$/, "-100");
}

function formatTime(t: string | null): string | null {
  if (!t) return null;
  return t.slice(0, 5);
}

function getCategoryEmoji(category: string | null): string | null {
  if (!category) return null;
  return EVENT_CATEGORIES.find((c) => c.value === category)?.icon ?? null;
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return formatDate(d);
}

type ModalCell = { memberId: string; date: string } | null;
type ActiveEvent = { event: Event; date: string } | null;

type Props = {
  members: FamilyMember[];
  events: Event[];
  exceptions: EventException[];
  tasks: Task[];
  familyId: string;
  meals: Meal[];
  mealPlans: MealPlan[];
};

function EventCard({
  event, dateStr, member, members, chipColor, onOpen,
}: {
  event: Event; dateStr: string; member: FamilyMember;
  members: FamilyMember[]; chipColor: string; onOpen: (event: Event) => void;
}) {
  const isFirstDay = event.date === dateStr;
  const isLastDay = (event.end_date ?? event.date) === dateStr;
  const st = formatTime(event.start_time);
  const et = formatTime(event.end_time);
  const emoji = getCategoryEmoji(event.category ?? null);
  const responsible = event.responsible_member_id
    ? members.find((m) => m.id === event.responsible_member_id) : null;
  const isChildCol = member.role === "child";
  const isResponsibleCol = event.responsible_member_id === member.id;
  const childParticipants = isResponsibleCol
    ? members.filter((m) => m.role === "child" && event.participant_ids.includes(m.id)) : [];

  return (
    <div
      onClick={() => onOpen(event)}
      className={`${chipColor} rounded-xl px-4 py-3 text-gray-800 active:opacity-70 transition-opacity`}
    >
      {(st || et) && (
        <div className="text-sm text-gray-500 mb-1">
          {isFirstDay && st && <span>{st}</span>}
          {isFirstDay && st && isLastDay && et && <span> – {et}</span>}
          {isFirstDay && st && !isLastDay && <span> →</span>}
          {!isFirstDay && isLastDay && et && <span>→ {et}</span>}
        </div>
      )}
      <div className="flex items-center gap-2">
        {emoji && <span className="text-lg leading-none">{emoji}</span>}
        <span className="font-semibold text-base leading-snug">
          {event.title}
          {event.recurring && <span className="ml-1.5 opacity-50 text-xs">↻</span>}
          {event.end_date && !event.recurring && <span className="ml-1.5 opacity-50 text-xs">⟷</span>}
        </span>
      </div>
      {isChildCol && responsible && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <div className={`w-2.5 h-2.5 rounded-full ${responsible.color}`} />
          <span className="text-xs text-gray-500">{responsible.name}</span>
        </div>
      )}
      {isResponsibleCol && childParticipants.length > 0 && (
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {childParticipants.map((child) => (
            <div key={child.id} className="flex items-center gap-1">
              <div className={`w-2.5 h-2.5 rounded-full ${child.color}`} />
              <span className="text-xs text-gray-500">{child.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, onToggle }: { task: Task; onToggle: (task: Task) => void }) {
  return (
    <div
      onClick={() => onToggle(task)}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl active:opacity-70 transition-opacity ${
        task.completed ? "bg-green-50" : "bg-gray-50 border border-dashed border-gray-200"
      }`}
    >
      <div className={`w-5 h-5 flex-shrink-0 rounded-md border-2 flex items-center justify-center transition-colors ${
        task.completed ? "bg-green-500 border-green-500" : "border-gray-300"
      }`}>
        {task.completed && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className={`text-sm ${task.completed ? "line-through text-gray-400" : "text-gray-700"}`}>
        {task.title}
      </span>
    </div>
  );
}

export default function DayView({ members, events, exceptions, tasks, familyId, meals, mealPlans: initialMealPlans }: Props) {
  const router = useRouter();
  const todayStr = formatDate(new Date());

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [modalCell, setModalCell] = useState<ModalCell>(null);
  const [activeEvent, setActiveEvent] = useState<ActiveEvent>(null);
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);
  const [localMealPlans, setLocalMealPlans] = useState<MealPlan[]>(initialMealPlans);
  const [mealModal, setMealModal] = useState(false);
  const [savingMeal, setSavingMeal] = useState(false);

  const todayMealPlan = localMealPlans.find(p => p.date === selectedDate);
  const todayMealTitle = todayMealPlan?.meals?.title ?? todayMealPlan?.custom_title;

  const handlePlanMeal = async (meal: Meal) => {
    setSavingMeal(true);
    if (todayMealPlan) {
      await supabase.from("shopping_items").delete().eq("meal_plan_id", todayMealPlan.id);
      await supabase.from("meal_plans").delete().eq("id", todayMealPlan.id);
    }
    const { data: newPlan } = await supabase.from("meal_plans")
      .insert({ family_id: familyId, date: selectedDate, meal_id: meal.id })
      .select("*, meals(title)").single();
    if (newPlan && meal.meal_ingredients?.length) {
      await supabase.from("shopping_items").insert(
        meal.meal_ingredients.map(ing => ({
          name: ing.name, quantity: ing.quantity, category: ing.category,
          meal_plan_id: newPlan.id, source: "meal", family_id: familyId, checked: false,
        }))
      );
    }
    const { data: updated } = await supabase.from("meal_plans")
      .select("*, meals(title)").eq("family_id", familyId);
    setLocalMealPlans(updated ?? []);
    setMealModal(false);
    setSavingMeal(false);
  };

  const handleRemoveMeal = async () => {
    if (!todayMealPlan) return;
    setSavingMeal(true);
    await supabase.from("shopping_items").delete().eq("meal_plan_id", todayMealPlan.id);
    await supabase.from("meal_plans").delete().eq("id", todayMealPlan.id);
    setLocalMealPlans(prev => prev.filter(p => p.id !== todayMealPlan.id));
    setSavingMeal(false);
  };

  const selectedDateObj = new Date(selectedDate + "T00:00:00");
  const dayName = DAY_NAMES[selectedDateObj.getDay()];
  const dayNum = selectedDateObj.getDate();
  const monthName = MONTH_NAMES[selectedDateObj.getMonth()];
  const weekNum = getWeekNumber(selectedDateObj);
  const isToday = selectedDate === todayStr;
  const publicHoliday = getPublicHolidayName(selectedDate);
  const schoolHoliday = getSchoolHolidayName(selectedDate);
  const isRedDay = isPublicHoliday(selectedDate);

  const getEventsForMember = (memberId: string): Event[] => {
    const cellDate = new Date(selectedDate + "T00:00:00");
    return events.filter((e) => {
      const isParticipant = e.participant_ids.includes(memberId);
      const isResponsible = e.responsible_member_id === memberId;
      if (!isParticipant && !isResponsible) return false;
      if (!e.recurring) {
        const startDate = new Date(e.date + "T00:00:00");
        const endDate = e.end_date ? new Date(e.end_date + "T00:00:00") : startDate;
        return cellDate >= startDate && cellDate <= endDate;
      }
      const eventDayOfWeek = new Date(e.date + "T00:00:00").getDay();
      if (cellDate.getDay() !== eventDayOfWeek) return false;
      return !exceptions.some((ex) => ex.event_id === e.id && ex.date === selectedDate);
    });
  };

  const getTasksForMember = (memberId: string): Task[] =>
    localTasks.filter((t) => t.due_date === selectedDate && t.assigned_to === memberId);

  const handleToggleTask = async (task: Task) => {
    const updated = { ...task, completed: !task.completed };
    setLocalTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    await supabase
      .from("tasks")
      .update({ completed: updated.completed, completed_at: updated.completed ? new Date().toISOString() : null })
      .eq("id", task.id);
  };

  const handleSaveEvent = async (data: {
    title: string; end_date: string | null; start_time: string | null;
    end_time: string | null; recurring: boolean; participant_ids: string[];
    responsible_member_id: string | null; category: string | null;
  }) => {
    if (!modalCell) return;
    const { data: event, error: eventError } = await supabase
      .from("events")
      .insert({
        title: data.title, date: modalCell.date, end_date: data.end_date,
        start_time: data.start_time, end_time: data.end_time,
        recurring: data.recurring, responsible_member_id: data.responsible_member_id,
        category: data.category,
      })
      .select().single();
    if (eventError || !event) { alert("Feil ved lagring: " + eventError?.message); return; }
    await supabase.from("event_participants").insert(
      data.participant_ids.map((id) => ({ event_id: event.id, family_member_id: id }))
    );
    setModalCell(null);
    router.refresh();
  };

  const handleDeleteSingle = async () => {
    if (!activeEvent) return;
    await supabase.from("event_exceptions").insert({ event_id: activeEvent.event.id, date: activeEvent.date });
    setActiveEvent(null);
    router.refresh();
  };

  const handleDeleteAll = async () => {
    if (!activeEvent) return;
    await supabase.from("events").delete().eq("id", activeEvent.event.id);
    setActiveEvent(null);
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 pt-3 pb-3">
        {/* Toppnavigasjon */}
        <div className="flex items-center justify-between mb-3">
          <Link href="/"
            className="flex items-center gap-1.5 text-gray-400 active:text-gray-700 text-sm font-medium px-2 py-1.5 rounded-xl active:bg-gray-100 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 22V12h6v10" />
            </svg>
            Hjem
          </Link>
          <span className="text-sm font-semibold text-gray-900">Aktiviteter</span>
          <div className="w-16" />
        </div>
        <div className="flex items-center justify-between mb-1">
          <button
            onClick={() => setSelectedDate(addDays(selectedDate, -1))}
            className="w-11 h-11 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200 text-gray-600 text-2xl"
          >
            ‹
          </button>
          <button onClick={() => setSelectedDate(todayStr)} className="text-center">
            <div className={`text-lg font-bold ${isRedDay ? "text-red-500" : "text-gray-900"}`}>
              {dayName} {dayNum}. {monthName}
            </div>
            <div className={`text-xs mt-0.5 ${isToday ? "text-blue-500 font-medium" : isRedDay ? "text-red-400" : "text-gray-400"}`}>
              {isToday ? "I dag · " : ""}Uke {weekNum}
              {publicHoliday && <span className="ml-1">· {publicHoliday}</span>}
              {!publicHoliday && schoolHoliday && <span className="ml-1">· 🎒 {schoolHoliday}</span>}
            </div>
          </button>
          <button
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            className="w-11 h-11 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200 text-gray-600 text-2xl"
          >
            ›
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {members.length === 0 && (
          <div className="text-center py-16 text-gray-400">Ingen familiemedlemmer lagt til ennå.</div>
        )}
        {members.map((member) => {
          const memberEvents = getEventsForMember(member.id);
          const memberTasks = getTasksForMember(member.id);
          const chipColor = toChipColor(member.color);
          const hasContent = memberEvents.length > 0 || memberTasks.length > 0;
          return (
            <div key={member.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <button
                onClick={() => setModalCell({ memberId: member.id, date: selectedDate })}
                className="w-full flex items-center justify-between px-4 py-3 active:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-3.5 h-3.5 rounded-full ${member.color}`} />
                  <span className="font-semibold text-gray-900">{member.name}</span>
                  {hasContent && (
                    <span className="text-xs text-gray-400">
                      {memberEvents.length + memberTasks.length} aktivitet{memberEvents.length + memberTasks.length !== 1 ? "er" : ""}
                    </span>
                  )}
                </div>
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-xl font-light">
                  +
                </div>
              </button>
              {hasContent && (
                <div className="px-3 pb-3 space-y-2">
                  {memberEvents.map((event) => (
                    <EventCard
                      key={event.id} event={event} dateStr={selectedDate}
                      member={member} members={members} chipColor={chipColor}
                      onOpen={(ev) => setActiveEvent({ event: ev, date: selectedDate })}
                    />
                  ))}
                  {memberTasks.map((task) => (
                    <TaskRow key={task.id} task={task} onToggle={handleToggleTask} />
                  ))}
                </div>
              )}
              {!hasContent && (
                <div
                  onClick={() => setModalCell({ memberId: member.id, date: selectedDate })}
                  className="px-4 pb-4 text-sm text-gray-300 active:text-gray-400 transition-colors cursor-pointer"
                >
                  Ingenting planlagt – trykk for å legge til
                </div>
              )}
            </div>
          );
        })}
      </div>

        {/* Middag-seksjon */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => setMealModal(true)}
            className="w-full flex items-center justify-between px-4 py-3 active:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-base">🍽️</span>
              <span className="font-semibold text-gray-900">Middag</span>
              {todayMealTitle && (
                <span className="text-sm text-purple-600 font-medium">{todayMealTitle}</span>
              )}
            </div>
            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-lg font-light">
              {todayMealTitle ? "↺" : "+"}
            </div>
          </button>
          {!todayMealTitle && (
            <div
              onClick={() => setMealModal(true)}
              className="px-4 pb-4 text-sm text-gray-300 cursor-pointer"
            >
              Ingen middag planlagt – trykk for å velge
            </div>
          )}
          {todayMealTitle && (
            <div className="px-4 pb-3 flex items-center justify-between">
              <span className="text-xs text-gray-400">Ingredienser legges på handlelisten automatisk</span>
              <button onClick={handleRemoveMeal} className="text-xs text-red-400 font-medium ml-2">Fjern</button>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Velg middag for dagen */}
      {mealModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end" onClick={() => setMealModal(false)}>
          <div className="w-full bg-white rounded-t-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Velg middag</h3>
              <button onClick={() => setMealModal(false)} className="text-gray-300 text-2xl leading-none">×</button>
            </div>
            <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2">
              {meals.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">
                  Ingen middager i banken ennå.{" "}
                  <a href="/middager" className="text-purple-500 font-medium">Gå til Middagsplan</a>
                </p>
              ) : meals.map(meal => (
                <button
                  key={meal.id}
                  onClick={() => handlePlanMeal(meal)}
                  disabled={savingMeal}
                  className="w-full text-left bg-gray-50 hover:bg-purple-50 active:bg-purple-100 rounded-xl px-4 py-3 transition-colors"
                >
                  <div className="font-medium text-gray-900">{meal.title}</div>
                  {(meal.meal_ingredients?.length ?? 0) > 0 && (
                    <div className="text-xs text-gray-400 mt-0.5">{meal.meal_ingredients!.length} ingredienser</div>
                  )}
                </button>
              ))}
            </div>
            <div className="px-4 py-4 border-t border-gray-100">
              <a href="/middager"
                className="block w-full py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-400 text-center">
                + Administrer middagsbank
              </a>
            </div>
          </div>
        </div>
      )}

      {modalCell && (
        <EventModal
          date={modalCell.date} members={members}
          preSelectedMemberId={modalCell.memberId}
          onSave={handleSaveEvent} onClose={() => setModalCell(null)}
        />
      )}
      {activeEvent && (
        <EventActionsModal
          event={activeEvent.event} date={activeEvent.date} members={members}
          onDeleteSingle={handleDeleteSingle} onDeleteAll={handleDeleteAll}
          onClose={() => setActiveEvent(null)} onUpdated={() => router.refresh()}
        />
      )}
    </main>
  );
}
