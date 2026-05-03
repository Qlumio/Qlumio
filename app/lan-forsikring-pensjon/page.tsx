import { supabase } from "@/lib/supabase";
import LFPView from "@/components/LFPView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lån, forsikringer og pensjon – Qlumio",
};

export default async function LFPPage() {
  const [{ data: insurances }, { data: loans }, { data: pensions }] = await Promise.all([
    supabase.from("insurances").select("*").order("created_at"),
    supabase.from("loans").select("*").order("created_at"),
    supabase.from("pensions").select("*").order("created_at"),
  ]);

  return (
    <LFPView
      insurances={insurances ?? []}
      loans={loans ?? []}
      pensions={pensions ?? []}
    />
  );
}
