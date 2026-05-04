import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import HomeView from "@/components/HomeView";
import { formatDate } from "@/lib/dates";
import type { Event, EventException, Task } from "@/lib/types";

export const metadata: Metadata = {
  title: "Qlumio",
  description: "Family operating system",
};

export default async function Home() {
  const today = new Date();
  const todayStr = formatDate(today);

  // Hent 14 dager frem for dashboard
  const twoWeeksOut = new Date(today);
  twoWeeksOut.setDate(today.getDate() + 14);
  const twoWeeksOutStr = formatDate(twoWeeksOut);

  // Hent 7 dager bak for å fange flerdagsevents som starter før i dag
  const sevenDaysBack = new Date(today);
  sevenDaysBack.setDate(today.getDate() - 7);
  const sevenDaysBackStr = formatDate(sevenDaysBack);

  const [
    { data: members },
    { data: weekEventsRaw },
    { data: recurringEventsRaw },
    { data: exceptions },
    { data: tasks },
  ] = await Promise.all([
    supabase.from("family_members").select("*").order("created_at"),
    supabase
      .from("events")
      .select("*, event_participants(family_member_id)")
      .eq("recurring", false)
      .gte("date", sevenDaysBackStr)
      .lte("date", twoWeeksOutStr),
    supabase
      .from("events")
      .select("*, event_participants(family_member_id)")
      .eq("recurring", true),
    supabase.from("event_exceptions").select("*"),
    supabase
      .from("tasks")
      .select("*")
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const normalizeEvent = (e: any): Event => ({
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

  const allNonRecurring = (weekEventsRaw ?? []).map(normalizeEvent).filter((e) => {
    const endDate = e.end_date ?? e.date;
    return endDate >= todayStr;
  });

  const events: Event[] = [
    ...allNonRecurring,
    ...(recurringEventsRaw ?? []).map(normalizeEvent),
  ];

  return (
    <HomeView
      members={members ?? []}
      events={events}
      exceptions={(exceptions ?? []) as EventException[]}
      tasks={(tasks ?? []) as Task[]}
      todayStr={todayStr}
    />
  );
}
