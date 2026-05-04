export const dynamic = "force-dynamic";
import { supabase } from "@/lib/supabase";
import ShoppingList from "@/components/ShoppingList";
import type { Metadata } from "next";
import type { ShoppingItem } from "@/lib/types";

export const metadata: Metadata = {
  title: "Handeliste – Qlumio",
};

export default async function HandelistePage() {
  const { data: items } = await supabase
    .from("shopping_items")
    .select("*")
    .order("created_at");

  return <ShoppingList initialItems={(items ?? []) as ShoppingItem[]} />;
}
