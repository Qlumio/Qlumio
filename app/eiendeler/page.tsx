import { supabase } from "@/lib/supabase";
import AssetList from "@/components/AssetList";
import type { Metadata } from "next";
import type { Asset } from "@/lib/types";

export const metadata: Metadata = {
  title: "Eiendeler – Qlumio",
};

export default async function EiendelerPage() {
  const { data: assets } = await supabase
    .from("assets")
    .select("*")
    .order("created_at");

  return <AssetList assets={(assets ?? []) as Asset[]} />;
}
