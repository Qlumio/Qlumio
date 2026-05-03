import { supabase } from "@/lib/supabase";
import WeekGrid from "@/components/WeekGrid";
import { getMondayOfWeek, getWeekDates, formatDate } from "@/lib/dates";
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
  // Hent valgt uke fra URL, eller bruk denne uken
  const { week } = await searchParams;
  const monday = week
    ? new Date(week + "T00:00:00")
    : getMondayOfWeek(new Date());

  const weekDates = getWeekDates(monday);
  const mondayStr = formatDate(monday);
  const sundayStr = formatDate(weekDates[6]);

  // Hent familiemedlemmer og events for valgt uke fra Supabase
  const { data: members } = await supabase
    .from("family_members")
    .select("*")
    .order("created_at");

  const { data: events } = await supabase
    .from("events")
    .select("*")
    .gte("date", mondayStr)
    .lte("date", sundayStr);

  return (
    <WeekGrid
      members={members ?? []}
      events={events ?? []}
      currentMonday={mondayStr}
    />
  );
}
