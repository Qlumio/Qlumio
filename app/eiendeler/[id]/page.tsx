import { createServerClient } from "@/lib/supabase/server";
import AssetDetail from "@/components/AssetDetail";
import { notFound } from "next/navigation";
import type { Asset, AssetTask, FamilyMember } from "@/lib/types";
import type { Loan } from "@/components/LanView";

export default async function AssetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createServerClient();
  const { id } = await params;

  const { data: asset } = await supabase
    .from("assets")
    .select("*")
    .eq("id", id)
    .single();

  if (!asset) notFound();

  const [{ data: tasks }, { data: members }, { data: loans }, { data: unlinkedLoans }] = await Promise.all([
    supabase.from("asset_tasks").select("*").eq("asset_id", id).order("due_date"),
    supabase.from("family_members").select("*").order("created_at"),
    supabase.from("loans").select("*").eq("asset_id", id).order("created_at"),
    supabase.from("loans").select("*").is("asset_id", null).order("created_at"),
  ]);

  return (
    <AssetDetail
      asset={asset as Asset}
      tasks={(tasks ?? []) as AssetTask[]}
      members={(members ?? []) as FamilyMember[]}
      loans={(loans ?? []) as Loan[]}
      unlinkedLoans={(unlinkedLoans ?? []) as Loan[]}
    />
  );
}
