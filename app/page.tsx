import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import HomeView from "@/components/HomeView";

export const metadata: Metadata = {
  title: "Qlumio",
  description: "Family operating system",
};

export default async function Home() {
  const { data: members } = await supabase
    .from("family_members")
    .select("*")
    .order("created_at");

  return <HomeView members={members ?? []} />;
}
