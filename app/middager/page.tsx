export const dynamic = "force-dynamic";
import { createServerClient } from "@/lib/supabase/server";
import MiddagView from "@/components/MiddagView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Middagsplan – Qlumio",
};

export default async function MiddagerPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: member } = await supabase
    .from("family_members")
    .select("family_id")
    .eq("user_id", user!.id)
    .single();

  const familyId = member!.family_id;

  const [{ data: meals }, { data: mealPlans }] = await Promise.all([
    supabase
      .from("meals")
      .select("*, meal_ingredients(*)")
      .eq("family_id", familyId)
      .order("title"),
    supabase
      .from("meal_plans")
      .select("*, meals(title)")
      .eq("family_id", familyId)
      .order("date"),
  ]);

  return (
    <MiddagView
      familyId={familyId}
      initialMeals={meals ?? []}
      initialMealPlans={mealPlans ?? []}
    />
  );
}
