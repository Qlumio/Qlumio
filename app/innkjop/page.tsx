export const dynamic = "force-dynamic";
import { supabase } from "@/lib/supabase";
import InnkjopView from "@/components/InnkjopView";
import type { Metadata } from "next";
import type { ShoppingItem } from "@/lib/types";

export const metadata: Metadata = {
  title: "Innkjøp – Qlumio",
};

export default async function InnkjopPage() {
  const [{ data: shoppingItems }, { data: purchases }] = await Promise.all([
    supabase.from("shopping_items").select("*").order("created_at"),
    supabase
      .from("planned_expenses")
      .select("*")
      .eq("category", "innkjop")
      .order("date"),
  ]);

  return (
    <InnkjopView
      initialShoppingItems={(shoppingItems ?? []) as ShoppingItem[]}
      initialPurchases={purchases ?? []}
    />
  );
}
