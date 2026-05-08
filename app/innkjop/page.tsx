export const dynamic = "force-dynamic";
import { createServerClient } from "@/lib/supabase/server";
import InnkjopView from "@/components/InnkjopView";
import type { Metadata } from "next";
import type { ShoppingItem } from "@/lib/types";

export const metadata: Metadata = {
  title: "Innkjøp – Qlumio",
};

export default async function InnkjopPage() {
  const supabase = await createServerClient();

  // Beregn datogrense: i dag + 12 måneder frem
  const now = new Date();
  const twelveMonthsOut = new Date(now.getFullYear(), now.getMonth() + 12, 1)
    .toISOString()
    .slice(0, 10);

  const [{ data: shoppingItems }, { data: purchases }, { data: maintenanceTasks }, { data: assets }] =
    await Promise.all([
      supabase.from("shopping_items").select("*").order("created_at"),
      supabase
        .from("planned_expenses")
        .select("*")
        .eq("category", "innkjop")
        .order("date"),
      supabase
        .from("asset_tasks")
        .select("id, title, due_date, assets(name)")
        .lte("due_date", twelveMonthsOut)
        .order("due_date"),
      supabase.from("assets").select("id, name").order("name"),
    ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const normalizedMaintenance = (maintenanceTasks ?? []).map((t: any) => ({
    id: t.id,
    title: t.title,
    due_date: t.due_date,
    asset_name: (t.assets as { name: string } | null)?.name ?? "Ukjent eiendel",
  }));

  return (
    <InnkjopView
      initialShoppingItems={(shoppingItems ?? []) as ShoppingItem[]}
      initialPurchases={purchases ?? []}
      initialMaintenanceTasks={normalizedMaintenance}
      initialAssets={(assets ?? []) as { id: string; name: string }[]}
    />
  );
}
