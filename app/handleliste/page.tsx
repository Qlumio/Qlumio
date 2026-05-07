export const dynamic = "force-dynamic";
import { createServerClient } from "@/lib/supabase/server";
import ShoppingList from "@/components/ShoppingList";
import type { Metadata } from "next";
import type { ShoppingItem } from "@/lib/types";

export const metadata: Metadata = {
  title: "Handeliste – Qlumio",
};

export default async function HandelistePage() {
  const supabase = await createServerClient();
  const { data: items } = await supabase
    .from("shopping_items")
    .select("*")
    .order("created_at");

  return <ShoppingList initialItems={(items ?? []) as ShoppingItem[]} />;
}
