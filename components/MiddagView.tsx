"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Meal, MealPlan } from "@/lib/types";
import { getMondayOfWeek, getWeekDates, formatDate, getWeekNumber } from "@/lib/dates";
import HomeButton from "@/components/HomeButton";

const DAY_NAMES = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];

const CATEGORIES = [
  { value: "grønt",     label: "Grønt",      emoji: "🥦" },
  { value: "kjøtt",     label: "Kjøtt/fisk",  emoji: "🥩" },
  { value: "meieri",    label: "Meieri",      emoji: "🧀" },
  { value: "tørrvarer", label: "Tørrvarer",   emoji: "🌾" },
  { value: "drikke",    label: "Drikke",      emoji: "🥛" },
  { value: "annet",     label: "Annet",       emoji: "🛒" },
];

type IngredientDraft = { id: string; name: string; quantity: string; category: string };
type MealDraft = { title: string; description: string; ingredients: IngredientDraft[] };

type Props = {
  familyId: string;
  initialMeals: Meal[];
  initialMealPlans: MealPlan[];
};

export default function MiddagView({ familyId, initialMeals, initialMealPlans }: Props) {
  const todayStr = formatDate(new Date());

  const [monday, setMonday] = useState(() => getMondayOfWeek(new Date()));
  const [meals, setMeals] = useState<Meal[]>(initialMeals);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>(initialMealPlans);
  const [planningDate, setPlanningDate] = useState<string | null>(null);
  const [showCreateMeal, setShowCreateMeal] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [mealDraft, setMealDraft] = useState<MealDraft>({ title: "", description: "", ingredients: [] });
  const [saving, setSaving] = useState(false);

  const weekDates = getWeekDates(monday);
  const weekNum = getWeekNumber(monday);

  const prevWeek = () => { const d = new Date(monday); d.setDate(d.getDate() - 7); setMonday(d); };
  const nextWeek = () => { const d = new Date(monday); d.setDate(d.getDate() + 7); setMonday(d); };

  const getPlanForDate = (ds: string) => mealPlans.find(p => p.date === ds);

  const reloadMeals = async () => {
    const { data } = await supabase.from("meals").select("*, meal_ingredients(*)").eq("family_id", familyId).order("title");
    setMeals(data ?? []);
  };

  const reloadPlans = async () => {
    const { data } = await supabase.from("meal_plans").select("*, meals(title)").eq("family_id", familyId).order("date");
    setMealPlans(data ?? []);
  };

  // Planlegg middag på en dato
  const handlePlanMeal = async (date: string, meal: Meal) => {
    setSaving(true);
    const existing = getPlanForDate(date);
    if (existing) {
      await supabase.from("shopping_items").delete().eq("meal_plan_id", existing.id);
      await supabase.from("meal_plans").delete().eq("id", existing.id);
    }
    const { data: newPlan } = await supabase.from("meal_plans")
      .insert({ family_id: familyId, date, meal_id: meal.id })
      .select().single();
    if (newPlan && meal.meal_ingredients?.length) {
      await supabase.from("shopping_items").insert(
        meal.meal_ingredients.map(ing => ({
          name: ing.name, quantity: ing.quantity, category: ing.category,
          meal_plan_id: newPlan.id, source: "meal", family_id: familyId, checked: false,
        }))
      );
    }
    await reloadPlans();
    setPlanningDate(null);
    setSaving(false);
  };

  // Fjern planlagt middag
  const handleRemovePlan = async (planId: string) => {
    setSaving(true);
    await supabase.from("shopping_items").delete().eq("meal_plan_id", planId);
    await supabase.from("meal_plans").delete().eq("id", planId);
    setMealPlans(prev => prev.filter(p => p.id !== planId));
    setPlanningDate(null);
    setSaving(false);
  };

  // Åpne opprett/rediger modal
  const openCreate = () => {
    setEditingMeal(null);
    setMealDraft({ title: "", description: "", ingredients: [] });
    setShowCreateMeal(true);
  };

  const openEdit = (meal: Meal) => {
    setEditingMeal(meal);
    setMealDraft({
      title: meal.title,
      description: meal.description ?? "",
      ingredients: (meal.meal_ingredients ?? []).map(i => ({
        id: i.id, name: i.name, quantity: i.quantity ?? "", category: i.category ?? "annet",
      })),
    });
    setShowCreateMeal(true);
    setPlanningDate(null);
  };

  const addIngredient = () =>
    setMealDraft(p => ({ ...p, ingredients: [...p.ingredients, { id: Date.now().toString(), name: "", quantity: "", category: "annet" }] }));

  const updateIngredient = (id: string, field: string, value: string) =>
    setMealDraft(p => ({ ...p, ingredients: p.ingredients.map(i => i.id === id ? { ...i, [field]: value } : i) }));

  const removeIngredient = (id: string) =>
    setMealDraft(p => ({ ...p, ingredients: p.ingredients.filter(i => i.id !== id) }));

  const handleSaveMeal = async () => {
    if (!mealDraft.title.trim()) return;
    setSaving(true);
    let mealId: string;
    if (editingMeal) {
      await supabase.from("meals").update({ title: mealDraft.title, description: mealDraft.description || null }).eq("id", editingMeal.id);
      await supabase.from("meal_ingredients").delete().eq("meal_id", editingMeal.id);
      mealId = editingMeal.id;
    } else {
      const { data: nm } = await supabase.from("meals")
        .insert({ family_id: familyId, title: mealDraft.title, description: mealDraft.description || null })
        .select().single();
      mealId = nm!.id;
    }
    const valid = mealDraft.ingredients.filter(i => i.name.trim());
    if (valid.length > 0) {
      await supabase.from("meal_ingredients").insert(
        valid.map(i => ({ meal_id: mealId, name: i.name, quantity: i.quantity || null, category: i.category }))
      );
    }
    await reloadMeals();
    setShowCreateMeal(false);
    setEditingMeal(null);
    setSaving(false);
  };

  const handleDeleteMeal = async (mealId: string) => {
    if (!confirm("Slette denne middagen fra banken?")) return;
    await supabase.from("meals").delete().eq("id", mealId);
    setMeals(prev => prev.filter(m => m.id !== mealId));
    await reloadPlans();
  };

  return (
    <main className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-3">
        <div className="flex items-center gap-3 mb-4">
          <HomeButton />
          <h1 className="text-xl font-bold text-gray-900">Middagsplan</h1>
          <button onClick={openCreate}
            className="ml-auto px-3 py-1.5 rounded-lg text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #8B5CF6, #22D3EE)" }}>
            + Ny middag
          </button>
        </div>
        <div className="flex items-center justify-between">
          <button onClick={prevWeek} className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 text-xl">‹</button>
          <button onClick={() => setMonday(getMondayOfWeek(new Date()))} className="text-sm font-medium text-gray-600">
            Uke {weekNum}
          </button>
          <button onClick={nextWeek} className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 text-xl">›</button>
        </div>
      </div>

      {/* Ukesstrip */}
      <div className="overflow-x-auto">
        <div className="flex gap-2 px-4 py-3 min-w-max">
          {weekDates.map((date, i) => {
            const ds = formatDate(date);
            const isToday = ds === todayStr;
            const plan = getPlanForDate(ds);
            const title = plan?.meals?.title ?? plan?.custom_title;
            return (
              <button key={ds} onClick={() => setPlanningDate(ds)}
                className={`flex flex-col items-center w-[72px] rounded-2xl p-2 border-2 transition-colors active:scale-95 ${
                  isToday ? "border-blue-400 bg-blue-50" : title ? "border-purple-200 bg-purple-50" : "border-gray-100 bg-white"
                }`}>
                <div className={`text-xs font-medium mb-1 ${isToday ? "text-blue-500" : "text-gray-400"}`}>
                  {DAY_NAMES[i]} {date.getDate()}.
                </div>
                {title ? (
                  <div className="text-[11px] text-center font-semibold text-purple-700 leading-tight line-clamp-2">{title}</div>
                ) : (
                  <div className="text-gray-300 text-xl">+</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Middagsbank */}
      <div className="px-4 py-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Middagsbank</h2>
        {meals.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-2">🍽️</div>
            <p className="text-sm">Ingen middager ennå.</p>
            <button onClick={openCreate} className="mt-2 text-purple-500 text-sm font-medium">+ Legg til din første middag</button>
          </div>
        ) : (
          <div className="space-y-2">
            {meals.map(meal => (
              <div key={meal.id} className="bg-white rounded-2xl px-4 py-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900">{meal.title}</div>
                    {meal.description && <div className="text-sm text-gray-400 mt-0.5">{meal.description}</div>}
                    {(meal.meal_ingredients?.length ?? 0) > 0 && (
                      <div className="text-xs text-gray-300 mt-1 truncate">
                        {meal.meal_ingredients!.map(i => i.name).join(", ")}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(meal)} className="text-xs text-gray-400 hover:text-purple-500 px-2 py-1 rounded-lg hover:bg-purple-50">Rediger</button>
                    <button onClick={() => handleDeleteMeal(meal.id)} className="text-xs text-gray-400 hover:text-red-400 px-2 py-1 rounded-lg hover:bg-red-50">Slett</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Planlegg dag */}
      {planningDate && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end" onClick={() => setPlanningDate(null)}>
          <div className="w-full bg-white rounded-t-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                {new Date(planningDate + "T00:00:00").toLocaleDateString("nb-NO", { weekday: "long", day: "numeric", month: "long" })}
              </h3>
              <button onClick={() => setPlanningDate(null)} className="text-gray-300 text-2xl leading-none">×</button>
            </div>

            {getPlanForDate(planningDate) && (
              <div className="px-4 py-3 bg-purple-50 border-b border-purple-100 flex items-center justify-between">
                <span className="text-sm text-purple-700 font-medium">
                  Planlagt: {getPlanForDate(planningDate)?.meals?.title}
                </span>
                <button onClick={() => handleRemovePlan(getPlanForDate(planningDate)!.id)}
                  className="text-xs text-red-400 font-medium px-2 py-1">
                  Fjern
                </button>
              </div>
            )}

            <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2">
              {meals.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Ingen middager i banken ennå.</p>
              ) : meals.map(meal => (
                <button key={meal.id} onClick={() => handlePlanMeal(planningDate, meal)} disabled={saving}
                  className="w-full text-left bg-gray-50 hover:bg-purple-50 active:bg-purple-100 rounded-xl px-4 py-3 transition-colors">
                  <div className="font-medium text-gray-900">{meal.title}</div>
                  {(meal.meal_ingredients?.length ?? 0) > 0 && (
                    <div className="text-xs text-gray-400 mt-0.5">{meal.meal_ingredients!.length} ingredienser</div>
                  )}
                </button>
              ))}
            </div>

            <div className="px-4 py-4 border-t border-gray-100">
              <button onClick={() => { setPlanningDate(null); openCreate(); }}
                className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-400">
                + Lag ny middag
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Opprett/rediger middag */}
      {showCreateMeal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end" onClick={() => setShowCreateMeal(false)}>
          <div className="w-full bg-white rounded-t-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">{editingMeal ? "Rediger middag" : "Ny middag"}</h3>
              <button onClick={() => setShowCreateMeal(false)} className="text-gray-300 text-2xl leading-none">×</button>
            </div>

            <div className="overflow-y-auto flex-1 px-4 py-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Navn på middag *</label>
                <input type="text" value={mealDraft.title}
                  onChange={e => setMealDraft(p => ({ ...p, title: e.target.value }))}
                  placeholder="F.eks. Taco, Laks med ris, Pasta..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Beskrivelse (valgfri)</label>
                <input type="text" value={mealDraft.description}
                  onChange={e => setMealDraft(p => ({ ...p, description: e.target.value }))}
                  placeholder="F.eks. Fredagstaco med alle toppings"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-500">Ingredienser</label>
                  <button onClick={addIngredient} className="text-xs text-purple-500 font-medium">+ Legg til</button>
                </div>
                {mealDraft.ingredients.length === 0 && (
                  <p className="text-sm text-gray-300">Ingen ingredienser – legg til for automatisk handleliste.</p>
                )}
                <div className="space-y-2">
                  {mealDraft.ingredients.map(ing => (
                    <div key={ing.id} className="flex gap-2 items-center">
                      <input type="text" value={ing.name}
                        onChange={e => updateIngredient(ing.id, "name", e.target.value)}
                        placeholder="Ingrediens"
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-purple-300" />
                      <input type="text" value={ing.quantity}
                        onChange={e => updateIngredient(ing.id, "quantity", e.target.value)}
                        placeholder="Mengde"
                        className="w-20 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-purple-300" />
                      <select value={ing.category}
                        onChange={e => updateIngredient(ing.id, "category", e.target.value)}
                        className="w-24 px-2 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none">
                        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.emoji}</option>)}
                      </select>
                      <button onClick={() => removeIngredient(ing.id)} className="text-gray-300 hover:text-red-400 text-xl px-1">×</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-4 py-4 border-t border-gray-100">
              <button onClick={handleSaveMeal} disabled={saving || !mealDraft.title.trim()}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #8B5CF6, #22D3EE)" }}>
                {saving ? "Lagrer..." : editingMeal ? "Lagre endringer" : "Opprett middag"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
