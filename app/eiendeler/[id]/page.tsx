import { supabase } from "@/lib/supabase";
import AssetDetail from "@/components/AssetDetail";
import { notFound } from "next/navigation";
import type { Asset, AssetTask, FamilyMember } from "@/lib/types";

export default async function AssetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: asset } = await supabase
    .from("assets")
    .select("*")
    .eq("id", id)
    .single();

  if (!asset) notFound();

  const { data: tasks } = await supabase
    .from("asset_tasks")
    .select("*")
    .eq("asset_id", id)
    .order("due_date");

  const { data: members } = await supabase
    .from("family_members")
    .select("*")
    .order("created_at");

  return (
    <AssetDetail
      asset={asset as Asset}
      tasks={(tasks ?? []) as AssetTask[]}
      members={(members ?? []) as FamilyMember[]}
    />
  );
}
