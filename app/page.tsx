import { supabase } from "@/lib/supabase";
import WeekGrid from "@/components/WeekGrid";
import { getMondayOfWeek, getWeekDates, formatDate } from "@/lib/dates";
import type { Event, EventException } from "@/lib/types";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Qlumio",
  description: "Family operating system",
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const monday = week
    ? new Date(week + "T00:00:00")
    : getMondayOfWeek(new Date());

  const weekDates = getWeekDates(monday);
  const mondayStr = formatDate(monday);
  const sundayStr = formatDate(weekDates[6]);

  // Familiemedlemmer
  const { data: members } = await supabase
    .from("family_members")
    .select("*")
    .order("created_at");

  // Enkeltevents for denne uken
  const { data: weekEventsRaw } = await supabase
    .from("events")
    .select("*, event_participants(family_member_id)")
    .eq("recurring", false)
    .gte("date", mondayStr)
    .lte("date", sundayStr);

  // Alle gjentagende events
  const { data: recurringEventsRaw } = await supabase
    .from("events")
    .select("*, event_participants(family_member_id)")
    .eq("recurring", true);

  // Unntak for gjentagende events (f.eks. "slett bare denne uken")
  const { data: exceptions } = await supabase
    .from("event_exceptions")
    .select("*");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const normalize = (e: any): Event => ({
    id: e.id,
    title: e.title,
    date: e.date,
    start_time: e.start_time,
    end_time: e.end_time,
    recurring: e.recurring,
    created_at: e.created_at,
    participant_ids: (e.event_participants ?? []).map(
      (p: { family_member_id: string }) => p.family_member_id
    ),
  });

  const events: Event[] = [
    ...(weekEventsRaw ?? []).map(normalize),
    ...(recurringEventsRaw ?? []).map(normalize),
  ];

  return (
    <WeekGrid
      members={members ?? []}
      events={events}
      exceptions={(exceptions ?? []) as EventException[]}
      currentMonday={mondayStr}
    />
  );
}
