export const dynamic = "force-dynamic";
import { createServerClient } from "@/lib/supabase/server";
import WeekGrid from "@/components/WeekGrid";
import { getMondayOfWeek, getWeekDates, formatDate } from "@/lib/dates";
import type { Event, EventException, Task, Meal, MealPlan } from "@/lib/types";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aktiviteter – Qlumio",
};

export default async function AktiviteterPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const supabase = await createServerClient();
  const { week } = await searchParams;
  const monday = week
    ? new Date(week + "T00:00:00")
    : getMondayOfWeek(new Date());

  const weekDates = getWeekDates(monday);
  const mondayStr = formatDate(monday);
  const sundayStr = formatDate(weekDates[6]);

  // Hent litt ekstra bakover for å fange opp flerdagsaktiviteter som starter før uken
  const extendedFrom = new Date(monday);
  extendedFrom.setDate(monday.getDate() - 14);
  const extendedFromStr = formatDate(extendedFrom);

  const { data: { user } } = await supabase.auth.getUser();
  const { data: memberInfo } = await supabase
    .from("family_members")
    .select("family_id")
    .eq("user_id", user!.id)
    .single();
  const familyId = memberInfo!.family_id;

  const { data: members } = await supabase
    .from("family_members")
    .select("*")
    .order("created_at");

  // Hent ikke-gjentagende events: starter innen siste 14 dager og slutter senest søndag
  // (dekker flerdagsaktiviteter som startet dagen/dagene før uken)
  const { data: weekEventsRaw } = await supabase
    .from("events")
    .select("*, event_participants(family_member_id)")
    .eq("recurring", false)
    .gte("date", extendedFromStr)
    .lte("date", sundayStr);

  const { data: recurringEventsRaw } = await supabase
    .from("events")
    .select("*, event_participants(family_member_id)")
    .eq("recurring", true);

  const { data: exceptions } = await supabase
    .from("event_exceptions")
    .select("*");

  const [{ data: meals }, { data: mealPlans }] = await Promise.all([
    supabase.from("meals").select("*, meal_ingredients(*)").eq("family_id", familyId).order("title"),
    supabase.from("meal_plans").select("*, meals(title)").eq("family_id", familyId).order("date"),
  ]);

  const { data: tasksRaw } = await supabase
    .from("tasks")
    .select("*")
    .gte("due_date", extendedFromStr)
    .lte("due_date", sundayStr)
    .order("created_at");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const normalize = (e: any): Event => ({
    id: e.id,
    title: e.title,
    date: e.date,
    end_date: e.end_date ?? null,
    start_time: e.start_time,
    end_time: e.end_time,
    recurring: e.recurring,
    responsible_member_id: e.responsible_member_id ?? null,
    category: e.category ?? null,
    created_at: e.created_at,
    participant_ids: (e.event_participants ?? []).map(
      (p: { family_member_id: string }) => p.family_member_id
    ),
  });

  // Filtrer ut events som faktisk overlapper med denne uken
  const allNonRecurring = (weekEventsRaw ?? []).map(normalize).filter((e) => {
    const endDate = e.end_date ?? e.date;
    return endDate >= mondayStr; // sluttdato er i eller etter denne uken
  });

  const events: Event[] = [
    ...allNonRecurring,
    ...(recurringEventsRaw ?? []).map(normalize),
  ];

  return (
    <WeekGrid
      members={members ?? []}
      events={events}
      exceptions={(exceptions ?? []) as EventException[]}
      tasks={(tasksRaw ?? []) as Task[]}
      currentMonday={mondayStr}
      familyId={familyId}
      meals={(meals ?? []) as Meal[]}
      mealPlans={(mealPlans ?? []) as MealPlan[]}
    />
  );
}
